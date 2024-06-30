const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./isReactComponent');
const addWrapper = require('./addWrapper');
const { randomUUID } = require('crypto');
const axios = require('axios');

let mp = new Map();

function ensureOutputDirectory(outputDir) {
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${outputDir}:`, error);
    }
  }
}

function getComponentName(path) {
  const name = path.node.name;
  if (name?.type === 'JSXIdentifier') {
    return name.name;
  }
}

async function processFile(
  filePath,
  visitor,
  outputCodeDir,
  traversalStage,
  components
) {
  let code;
  try {
    code = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return;
  }

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });
  } catch (error) {
    console.error(`Error parsing code in file ${filePath}:`, error);
    return;
  }

  try {
    traverse(ast, visitor);
  } catch (error) {
    console.error(`Error traversing AST in file ${filePath}:`, error);
    return;
  }

  if (traversalStage === 3) {
    let wrapperArray = [];
    components.forEach(
      async ({
        jsxOpeningElement,
        eventName,
        eventAttributes,
        isComponent,
      }) => {
        const attributes = jsxOpeningElement.node.attributes;
        let iterateEvents = [];
        const existingEventAttr = attributes.find(
          (attr) => attr.name.name === 'injected_events'
        );

        if (existingEventAttr) {
          try {
            iterateEvents = JSON.parse(atob(existingEventAttr.value.value));
            attributes.splice(attributes.indexOf(existingEventAttr), 1);
          } catch (error) {
            console.error(
              `Error decoding existing event attributes in file ${filePath}:`,
              error
            );
          }
        }

        iterateEvents.push({
          name: eventName,
          attributes: eventAttributes,
        });

        const dataIterateEvents = types.jsxAttribute(
          types.jsxIdentifier('injected_events'),
          types.stringLiteral(btoa(JSON.stringify(iterateEvents)))
        );

        if (isComponent) {
          const componentName = getComponentName(jsxOpeningElement);
          try {
            traverse(ast, {
              JSXIdentifier(path) {
                if (path.node.name === componentName) {
                  path.node.name = `Iterate${componentName}`;
                }
              },
            });
          } catch (error) {
            console.error(
              `Error renaming component ${componentName} in file ${filePath}:`,
              error
            );
          }

          const uuid = randomUUID();
          let dataiterate = {
            events: [iterateEvents],
            filePath: filePath,
            id: uuid,
          };

          let wrapper = {
            originalName: componentName,
            wrapperName: `Iterate${componentName}`,
            dataiterate,
          };

          wrapperArray.push(wrapper);
          try {
            const response = await axios.post(
              'http://localhost:4000/pushevents',
              {
                dataiterate,
                is_manual: false,
                deployment_id: 'f23r43fefg54',
                platforms: 'MIXPANEL',
              }
            );
            console.log(
              `Dataiterate object pushed successfully for ${filePath}:`,
              response.data
            );
          } catch (error) {
            console.error(
              `Error pushing dataiterate object for ${filePath}:`,
              error
            );
          }
        } else {
          attributes.push(dataIterateEvents);
        }
      }
    );
    wrapperArray.forEach(({ originalName, wrapperName, dataiterate }) => {
      try {
        addWrapper(
          ast,
          originalName,
          wrapperName,
          btoa(JSON.stringify(dataiterate))
        );
      } catch (error) {
        console.error(
          `Error adding wrapper for component ${originalName} in file ${filePath}:`,
          error
        );
      }
    });
  }

  let modifiedCode;
  try {
    modifiedCode = generate(ast, {}, code).code;
  } catch (error) {
    console.error(
      `Error generating modified code for file ${filePath}:`,
      error
    );
    return;
  }

  const outputFilePath = path.join(
    outputCodeDir,
    path.relative(outputCodeDir, filePath)
  );
  const outputDirPath = path.dirname(outputFilePath);

  ensureOutputDirectory(outputDirPath);

  try {
    fs.writeFileSync(outputFilePath, modifiedCode);
    console.log(`Processed: ${filePath}`);
  } catch (error) {
    console.error(`Error writing to file ${outputFilePath}:`, error);
  }
}

async function traverseDirectory(dir, fileProcessor, outputCodeDir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return;
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules') {
      continue;
    }
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (error) {
      console.error(`Error getting stats for file ${filePath}:`, error);
      continue;
    }

    if (stat.isDirectory()) {
      await traverseDirectory(filePath, fileProcessor, outputCodeDir);
    } else if (['.jsx', '.tsx'].includes(path.extname(filePath))) {
      await fileProcessor(filePath, outputCodeDir);
    }
  }
}

async function firstProcessFile(filePath, outputCodeDir) {
  const visitor = {
    CallExpression(path) {
      if (
        path.node?.callee?.object?.name === 'mixpanel' &&
        path.node?.callee?.property?.name === 'track'
      ) {
        if (
          path.node.arguments[0].type === 'Identifier' &&
          path.node.arguments[1].type === 'Identifier'
        ) {
          let funcOrArrow = path,
            nameParam = -1,
            attrParam = -1;
          while (
            funcOrArrow &&
            (funcOrArrow.node.type !== 'ArrowFunctionExpression' ||
              funcOrArrow.node.type !== 'FunctionDeclaration')
          ) {
            funcOrArrow = funcOrArrow.parentPath;
            if (
              funcOrArrow?.node?.type === 'ArrowFunctionExpression' ||
              funcOrArrow?.node?.type === 'FunctionDeclaration'
            ) {
              let params = funcOrArrow.node.params;
              params.forEach((el, index) => {
                if (el?.name === path.node.arguments[0].name) nameParam = index;
                else if (el?.name === path.node.arguments[1].name)
                  attrParam = index;
              });
              if (nameParam !== -1 && attrParam !== -1) {
                if (funcOrArrow.node.type === 'FunctionDeclaration')
                  mp[funcOrArrow.node.id.name] = {
                    indexInMap: true,
                    eventName: nameParam,
                    eventAttributes: attrParam,
                  };
                else if (funcOrArrow.node.type === 'ArrowFunctionExpression') {
                  funcOrArrow = funcOrArrow.parentPath;
                  if (funcOrArrow.node.type === 'VariableDeclarator') {
                    mp[funcOrArrow.node.id.name] = {
                      indexInMap: true,
                      eventName: nameParam,
                      eventAttributes: attrParam,
                    };
                  }
                }
              } else {
                console.log(
                  'nameParam and attrParam index not detected, bug here'
                );
              }
            }
          }
        } else {
          const eventName = path.node.arguments[0].value;
          let eventAttributes = path.node.arguments[1];
          if (eventAttributes?.type === 'ObjectExpression') {
            eventAttributes = eventAttributes.properties.reduce((acc, prop) => {
              acc[prop.key.name] =
                prop.value.value || prop.value.name || prop.value.type;
              return acc;
            }, {});
          } else {
            eventAttributes = {};
          }

          let jsxElement = path;
          while (jsxElement && jsxElement.node.type !== 'ReturnStatement') {
            if (jsxElement.node.type === 'ArrowFunctionExpression') {
              jsxElement = jsxElement.parentPath;
              if (jsxElement.node.type === 'JSXExpressionContainer') {
              } else {
                mp[jsxElement?.node?.id?.name] = {
                  eventName: eventName,
                  eventAttributes,
                };
                continue;
              }
            }
            jsxElement = jsxElement.parentPath;
          }
        }
      }
    },
  };
  await processFile(filePath, visitor, outputCodeDir, 1);
}

async function secondProcessFile(filePath, outputCodeDir) {
  const visitor = {
    CallExpression(path) {
      let evName = '',
        evAttr = {};
      if (
        path?.node?.callee?.type === 'Identifier' &&
        mp[path?.node?.callee?.name]
      ) {
        let nameInd = mp[path?.node?.callee?.name]['indexInMap']
          ? Number(mp[path?.node?.callee?.name]['eventName'])
          : null;
        let attrInd = mp[path?.node?.callee?.name]['indexInMap']
          ? Number(mp[path?.node?.callee?.name]['eventAttributes'])
          : null;

        if (path?.node?.arguments[nameInd]?.type === 'Identifier') {
          let VarDecl = path;
          while (VarDecl && VarDecl.node.type !== 'BlockStatement') {
            VarDecl = VarDecl.parentPath;
            if (VarDecl && VarDecl.node.type === 'BlockStatement') {
              VarDecl.node.body.forEach((el) => {
                if (
                  el.type === 'VariableDeclaration' &&
                  el?.declarations[0]?.id?.name ===
                    path.node.arguments[nameInd].name
                ) {
                  evName = el.declarations[0]?.init.value;
                }
              });
            }
          }
        } else if (path?.node?.arguments[nameInd]?.type === 'StringLiteral') {
          evName = path.node?.arguments[nameInd]?.value;
        }

        if (path?.node?.arguments[attrInd]?.type === 'Identifier') {
          let VarDecl = path;
          while (VarDecl && VarDecl.node.type !== 'BlockStatement') {
            VarDecl = VarDecl.parentPath;
            if (VarDecl && VarDecl.node.type === 'BlockStatement') {
              VarDecl.node.body.forEach((el) => {
                if (
                  el.type === 'VariableDeclaration' &&
                  el?.declarations[0]?.id?.name ===
                    path.node.arguments[attrInd].name
                ) {
                  evAttr = el?.declarations[0]?.init;
                  if (evAttr?.type === 'ObjectExpression') {
                    evAttr = evAttr.properties.reduce((acc, prop) => {
                      acc[prop.key.name] =
                        prop.value.value || prop.value.name || prop.value.type;
                      return acc;
                    }, {});
                  }
                }
              });
            }
          }
        } else if (
          path?.node?.arguments[attrInd]?.type === 'ObjectExpression'
        ) {
          evAttr = path?.node?.arguments[attrInd];
          if (evAttr?.type === 'ObjectExpression') {
            evAttr = evAttr.properties.reduce((acc, prop) => {
              acc[prop.key.name] =
                prop.value.value || prop.value.name || prop.value.type;
              return acc;
            }, {});
          }
        }

        let cf = path;
        while (
          cf &&
          (cf.node.type !== 'ArrowFunctionExpression' ||
            cf.node.type !== 'FunctionDeclaration')
        ) {
          cf = cf.parentPath;
          if (
            cf?.node?.type === 'ArrowFunctionExpression' ||
            cf?.node?.type === 'FunctionDeclaration'
          ) {
            if (cf.node.type === 'FunctionDeclaration')
              mp[cf.node.id.name] = {
                indexInMap: false,
                eventName: evName,
                eventAttributes: evAttr,
              };
            else if (cf.node.type === 'ArrowFunctionExpression') {
              cf = cf.parentPath;
              if (cf.node.type === 'VariableDeclarator') {
                mp[cf.node.id.name] = {
                  indexInMap: false,
                  eventName: evName,
                  eventAttributes: evAttr,
                };
              }
            }
          }
        }
      }
    },
  };
  await processFile(filePath, visitor, outputCodeDir, 2);
}

async function thirdProcessFile(filePath, outputCodeDir) {
  let components = [];
  let fileEvents = [];
  const visitor = {
    Identifier(path) {
      if (mp[path.node.loc.identifierName]) {
        let jsxEl = path;
        while (jsxEl && jsxEl.node.type !== 'JSXOpeningElement') {
          jsxEl = jsxEl.parentPath;
          if (jsxEl && jsxEl.node.type === 'JSXOpeningElement') {
            if (jsxEl.node.name.name.startsWith('Iterate')) {
              return;
            }

            if (jsxEl && jsxEl.node.type === 'JSXOpeningElement') {
              const isComponent = isReactComponent(jsxEl);
              const attributes = jsxEl.node.attributes;
              let iterateEvents = attributes.filter(
                (attr) => attr.name.name === 'injected_events'
              );

              const existingComponent = components.find(
                (component) =>
                  component.jsxOpeningElement.node.name.name ===
                    jsxEl.node.name.name &&
                  JSON.stringify(component.eventAttributes) ===
                    JSON.stringify(
                      mp[path.node.loc.identifierName].eventAttributes
                    )
              );

              if (!existingComponent) {
                components.push({
                  jsxOpeningElement: jsxEl,
                  eventName: mp[path.node.loc.identifierName].eventName,
                  eventAttributes:
                    mp[path.node.loc.identifierName].eventAttributes,
                  isComponent,
                });

                fileEvents.push({
                  name: mp[path.node.loc.identifierName].eventName,
                  attributes: mp[path.node.loc.identifierName].eventAttributes,
                });
              }

              if (isComponent) {
                return;
              } else {
                if (iterateEvents.length > 0) {
                  iterateEvents = JSON.parse(
                    atob(iterateEvents[0].value.value)
                  );
                } else {
                  iterateEvents = [];
                }
                iterateEvents.push({
                  name: mp[path.node.loc.identifierName].eventName,
                  attributes: mp[path.node.loc.identifierName].eventAttributes,
                });

                const dataIterateEvents = types.jsxAttribute(
                  types.jsxIdentifier('injected_events'),
                  types.stringLiteral(btoa(JSON.stringify(iterateEvents)))
                );

                attributes.forEach((attr, index) => {
                  if (attr.name.name === 'injected_events') {
                    attributes.splice(index, 1);
                  }
                });

                attributes.push(dataIterateEvents);
                jsxEl.node.attributes = attributes;
              }
            }
          }
        }
      }
    },
  };
  await processFile(filePath, visitor, outputCodeDir, 3, components);
  // if (fileEvents.length !== 0) {
  //   try {
  //     const modifiedEvents = fileEvents.map((event) => {
  //       if (Object.keys(event.attributes).length === 0) {
  //         return { ...event, attributes: null }; // todo platforms
  //       }
  //       return event;
  //     });

  //     const response = await axios.post('http://localhost:4000/pushevents', {
  //       events: modifiedEvents,
  //       filePath: filePath,
  //       is_manual: false,
  //     });
  //     console.log(`API request successful for file: ${filePath}`);
  //     console.log('Response:', response.data);
  //   } catch (error) {
  //     console.error(`Error making API request for file: ${filePath}`, error);
  //   }
  // } else {
  //   console.log(`Skipping API request for file : ${filePath}`);
  // }
}

async function executeTraversal(sourceCodeDir, outputCodeDir) {
  ensureOutputDirectory(outputCodeDir);

  console.log('Executing First Traversal...');
  await traverseDirectory(sourceCodeDir, firstProcessFile, outputCodeDir);
  console.log('First Traversal done');

  console.log('Executing Second Traversal...');
  await traverseDirectory(sourceCodeDir, secondProcessFile, outputCodeDir);
  console.log('Second Traversal done');

  console.log('Executing Third Traversal...');
  await traverseDirectory(sourceCodeDir, thirdProcessFile, outputCodeDir);
  console.log('Third Traversal done');
}

module.exports = {
  executeTraversal,
};

executeTraversal('../flux', '../flux');
