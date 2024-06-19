const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./isReactComponent');
const addWrapper = require('./addWrapper');

let mp = new Map();

function ensureOutputDirectory(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function getComponentName(path) {
  const name = path.node.name;
  if (name?.type === 'JSXIdentifier') {
    const tagName = name.name;
    return tagName;
  }
}

function processFile(
  filePath,
  visitor,
  outputCodeDir,
  traversalStage,
  components
) {
  let isMixpanelTrackerInFile = false;
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });

  traverse(ast, visitor);

  if (traversalStage === 3) {
    let wrapperArray = [];
    components.forEach(
      ({ jsxOpeningElement, eventName, eventAttributes, isComponent }) => {
        const attributes = jsxOpeningElement.node.attributes;
        let iterateEvents = [];
        const existingEventAttr = attributes.find(
          (attr) => attr.name.name === 'injected_events'
        );

        if (existingEventAttr) {
          iterateEvents = JSON.parse(atob(existingEventAttr.value.value));
          attributes.splice(attributes.indexOf(existingEventAttr), 1);
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
          traverse(ast, {
            JSXIdentifier(path) {
              if (path.node.name === componentName) {
                path.node.name = `Iterate${componentName}`;
              }
            },
          });

          let dataiterate = {
            events: [iterateEvents],
            filePath: filePath,
          };

          let wrapper = {
            originalName: componentName,
            wrapperName: `Iterate${componentName}`,
            dataiterate,
          };

          wrapperArray.push(wrapper); // this is not a pure function... will refactor later
        } else {
          attributes.push(dataIterateEvents);
        }
      }
    );
    wrapperArray.forEach(({ originalName, wrapperName, dataiterate }) => {
      addWrapper(
        ast,
        originalName,
        wrapperName,
        btoa(JSON.stringify(dataiterate))
      );
    });
  }

  const { code: modifiedCode } = generate(ast, {}, code);
  const outputFilePath = path.join(
    outputCodeDir,
    path.relative(outputCodeDir, filePath)
  );
  const outputDirPath = path.dirname(outputFilePath);

  ensureOutputDirectory(outputDirPath);
  fs.writeFileSync(outputFilePath, modifiedCode);
  console.log(`Processed: ${filePath}`);
}

function traverseDirectory(dir, fileProcessor, outputCodeDir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (file === 'node_modules') {
      return;
    }
    if (fs.statSync(filePath).isDirectory()) {
      traverseDirectory(filePath, fileProcessor, outputCodeDir);
    } else if (['.jsx', '.tsx'].includes(path.extname(filePath))) {
      fileProcessor(filePath, outputCodeDir);
    }
  });
}

function firstProcessFile(filePath, outputCodeDir) {
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
          // console.log(`Event tracked: `, eventName);
          // console.log('Attributes:', eventAttributes);

          let jsxElement = path;
          while (jsxElement && jsxElement.node.type !== 'ReturnStatement') {
            if (jsxElement.node.type === 'ArrowFunctionExpression') {
              jsxElement = jsxElement.parentPath;
              if (jsxElement.node.type === 'JSXExpressionContainer') {
              } else {
                // console.log(
                //   'Name of el above arrowFn: ',
                //   jsxElement?.node?.id?.name
                // );
                mp[jsxElement?.node?.id?.name] = {
                  eventName: eventName,
                  eventAttributes,
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
  processFile(filePath, visitor, outputCodeDir, 1);
}

function secondProcessFile(filePath, outputCodeDir) {
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
                  // console.log(
                  //   'Var Name:',
                  //   el.declarations[0]?.id.name,
                  //   ' Value:',
                  //   evName
                  // );
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
                      // console.log('prop key name: ', prop.key.name);
                      acc[prop.key.name] =
                        prop.value.value || prop.value.name || prop.value.type;
                      // console.log('prop value: ', acc[prop.key.name]);
                      return acc;
                    }, {});
                  }
                  // console.log(
                  //   'Attribute name: ',
                  //   el?.declarations[0]?.id?.name,
                  //   ' Attributes: ',
                  //   JSON.stringify(evAttr)
                  // );
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
              // console.log('prop key name: ', prop.key.name);
              acc[prop.key.name] =
                prop.value.value || prop.value.name || prop.value.type;
              // console.log('prop value: ', acc[prop.key.name]);
              return acc;
            }, {});
          }
          // console.log('Inline Attributes: ', JSON.stringify(evAttr));
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
  processFile(filePath, visitor, outputCodeDir, 2);
}

function thirdProcessFile(filePath, outputCodeDir) {
  let components = [];
  const visitor = {
    Identifier(path) {
      if (mp[path.node.loc.identifierName]) {
        let jsxEl = path;
        while (jsxEl && jsxEl.node.type !== 'JSXOpeningElement') {
          jsxEl = jsxEl.parentPath;
          if (jsxEl && jsxEl.node.type === 'JSXOpeningElement') {
            // console.log(
            //   path.node.loc.identifierName,
            //   ' in ',
            //   jsxEl?.node?.name?.name
            // );
            // console.log('Executed ', jsxEl.node.type);
            if (jsxEl && jsxEl.node.type === 'JSXOpeningElement') {
              const isComponent = isReactComponent(jsxEl);
              const attributes = jsxEl.node.attributes;
              let iterateEvents = attributes.filter(
                (attr) => attr.name.name === 'injected_events'
              );

              components.push({
                jsxOpeningElement: jsxEl,
                eventName: mp[path.node.loc.identifierName].eventName,
                eventAttributes:
                  mp[path.node.loc.identifierName].eventAttributes,
                isComponent,
              });

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
  processFile(filePath, visitor, outputCodeDir, 3, components);
}

function executeTraversal(sourceCodeDir, outputCodeDir) {
  ensureOutputDirectory(outputCodeDir);

  console.log('Executing First Traversal...');
  traverseDirectory(sourceCodeDir, firstProcessFile, outputCodeDir);
  console.log('First Traversal done');
  // console.log(mp);

  console.log('Executing Second Traversal...');
  traverseDirectory(sourceCodeDir, secondProcessFile, outputCodeDir);
  console.log('Second Traversal done');

  console.log('Executing Third Traversal...');
  traverseDirectory(sourceCodeDir, thirdProcessFile, outputCodeDir);
  console.log('Third Traversal done');
}

module.exports = {
  executeTraversal,
};

let p = executeTraversal('./dump2', './dump2');
console.log(p);
