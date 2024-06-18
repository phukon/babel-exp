const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./isReactComponent');

const sourceCodeDir = '../dep-ser4'; // Replace with your source code directory
const outputCodeDir = '../dep-ser4'; // Replace with your desired output directory

let mp = new Map();
// Ensure the output directory exists
if (!fs.existsSync(outputCodeDir)) {
  fs.mkdirSync(outputCodeDir, { recursive: true });
}

function FirstProcessFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });
  const visitor = {
    CallExpression(path) {
      if (
        path.node?.callee?.object?.name === 'mixpanel' &&
        path.node?.callee?.property?.name === 'track'
      ) {
        // if argument values are identifiers then variables are being called
        // then values will be passed to the function
        if (
          path.node.arguments[0].type === 'Identifier' &&
          path.node.arguments[1].type === 'Identifier'
        ) {
          // if the name and properties are identifier, they will be passed as params
          // in the nodes above as params to the ArrowFunctionExpression or FunctionDeclaration
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
          // Log event details to the console
          console.log(`Event tracked: `, eventName);
          console.log('Attributes:', eventAttributes);
          // console.log("Node: ",JSON.stringify(path.node));

          // Find the enclosing function name if eventName and eventAttrs not identifiers
          let jsxElement = path;
          // console.log("Path: ",path)
          while (jsxElement && jsxElement.node.type !== 'ReturnStatement') {
            if (jsxElement.node.type === 'ArrowFunctionExpression') {
              jsxElement = jsxElement.parentPath;
              if (jsxElement.node.type === 'JSXExpressionContainer') {
                // case to manage inline calls
                // also to prevent errors
                // dont do any thing as will be handled by another script
              } else {
                console.log(
                  'Name of el above arrowFn: ',
                  jsxElement?.node?.id?.name
                );
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
  traverse(ast, visitor);

  const { code: modifiedCode } = generate(ast, {}, code);

  const outputFilePath = path.join(
    outputCodeDir,
    path.relative(sourceCodeDir, filePath)
  );

  // Ensure the output directory exists
  const outputDirPath = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, modifiedCode);
  console.log(`Processed: ${filePath}`);
}

function SecondProcessFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });

  // make another visitor element so that it checks if the function where mixpanel.track is called
  const funcsCallingVisitor = {
    CallExpression(path) {
      // if callee type is Identifier then only we know that the function containing mixpanel is being called
      let evName = '',
        evAttr = {};
      if (
        path?.node?.callee?.type === 'Identifier' &&
        mp[path?.node?.callee?.name]
      ) {
        // see argument type and input in map accordingly
        let nameInd = mp[path?.node?.callee?.name]['indexInMap']
          ? Number(mp[path?.node?.callee?.name]['eventName'])
          : null;
        let attrInd = mp[path?.node?.callee?.name]['indexInMap']
          ? Number(mp[path?.node?.callee?.name]['eventAttributes'])
          : null;

        // for the evName part
        if (path?.node?.arguments[nameInd]?.type === 'Identifier') {
          // code to handle if the the name argument being passed are variables themselves
          // see which variable is a match for name
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
                  console.log(
                    'Var Name:',
                    el.declarations[0]?.id.name,
                    ' Value:',
                    evName
                  );
                }
              });
            }
          }
        } else if (path?.node?.arguments[nameInd]?.type === 'StringLiteral') {
          // code to handle if the arguents being passed are values
          evName = path.node?.arguments[nameInd]?.value;
        }

        // now to handle the attr part
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
                      console.log('prop key name: ', prop.key.name);
                      acc[prop.key.name] =
                        prop.value.value || prop.value.name || prop.value.type;
                      console.log('prop value: ', acc[prop.key.name]);
                      return acc;
                    }, {});
                  }
                  console.log(
                    'Attribute name: ',
                    el?.declarations[0]?.id?.name,
                    ' Attributes: ',
                    JSON.stringify(evAttr)
                  );
                }
              });
            }
          }
        } else if (
          path?.node?.arguments[attrInd]?.type === 'ObjectExpression'
        ) {
          // handles case if ObjectExpression
          // corollary of StringLiteral in case of evName
          evAttr = path?.node?.arguments[attrInd];
          if (evAttr?.type === 'ObjectExpression') {
            evAttr = evAttr.properties.reduce((acc, prop) => {
              console.log('prop key name: ', prop.key.name);
              acc[prop.key.name] =
                prop.value.value || prop.value.name || prop.value.type;
              console.log('prop value: ', acc[prop.key.name]);
              return acc;
            }, {});
          }
          console.log('Inline Attributes: ', JSON.stringify(evAttr));
        }

        // now since both name and attr parts are handled, we need to find the name of the function calling the Identifier function
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

  traverse(ast, funcsCallingVisitor);

  const { code: modifiedCode } = generate(ast, {}, code);

  const outputFilePath = path.join(
    outputCodeDir,
    path.relative(sourceCodeDir, filePath)
  );

  // Ensure the output directory exists
  const outputDirPath = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, modifiedCode);
  console.log(`Processed: ${filePath}`);
}

function ThirdProcessFile(filePath) {
  let reactComponent = false;
  let iterateEvents;

  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });

  // make another visitor element so that it checks if the function where mixpanel.track is called
  const visitor2 = {
    Identifier(path) {
      if (mp[path.node.loc.identifierName]) {
        // console.log("Shashank here")
        let jsxEl = path;
        while (jsxEl && jsxEl.node.type !== 'JSXOpeningElement') {
          jsxEl = jsxEl.parentPath;
          if (jsxEl && jsxEl.node.type === 'JSXOpeningElement') {
            console.log(
              path.node.loc.identifierName,
              ' in ',
              jsxEl?.node?.name?.name
            );
            console.log('Executed ', jsxEl.node.type);
            if (jsxEl && jsxEl.node.type === 'JSXOpeningElement') {
              const attributes = jsxEl.node.attributes;
              iterateEvents = attributes.filter(
                (attr) => attr.name.name === 'injected_events'
              );

              if (isReactComponent(jsxOpeningElement)) {
                reactComponent = true;
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

  traverse(ast, visitor2);

  if (reactComponent) {
    return { iterateEvents };
  }

  const { code: modifiedCode } = generate(ast, {}, code);

  const outputFilePath = path.join(
    outputCodeDir,
    path.relative(sourceCodeDir, filePath)
  );

  // Ensure the output directory exists
  const outputDirPath = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, modifiedCode);
  console.log(`Processed: ${filePath}`);
}
// Traverse the source code directory
function FirstTraverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (file === 'node_modules') {
      // Ignore the node_modules directory
      return;
    }
    if (fs.statSync(filePath).isDirectory()) {
      FirstTraverseDirectory(filePath);
    } else if (
      path.extname(filePath) === '.jsx' ||
      path.extname(filePath) === '.tsx'
    ) {
      FirstProcessFile(filePath);
    }
  });
}

function SecondTraverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (file === 'node_modules') {
      // Ignore the node_modules directory
      return;
    }
    if (fs.statSync(filePath).isDirectory()) {
      SecondTraverseDirectory(filePath);
    } else if (
      path.extname(filePath) === '.jsx' ||
      path.extname(filePath) === '.tsx'
    ) {
      SecondProcessFile(filePath);
    }
  });
}

function ThirdTraverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (file === 'node_modules') {
      // Ignore the node_modules directory
      return;
    }
    if (fs.statSync(filePath).isDirectory()) {
      ThirdTraverseDirectory(filePath);
    } else if (
      path.extname(filePath) === '.jsx' ||
      path.extname(filePath) === '.tsx'
    ) {
      ThirdProcessFile(filePath);
    }
  });
}

// Process a single file (for First traversal)

// Start traversing the source code directory
console.log('Executing First Traversal...');
FirstTraverseDirectory(sourceCodeDir);
console.log('First Traversal done');
console.log(mp);
console.log('Executing Second Traversal...');
SecondTraverseDirectory(sourceCodeDir);
console.log('Second Traversal done');
console.log('Executing Third Traversal...');
ThirdTraverseDirectory(sourceCodeDir);
console.log('Third Traversal done');
