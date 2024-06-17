const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./isReactComponent.js');
const createContextVisitor = require('./working/create-context-provider.js');
const { providerWrapperVisitor } = require('./provider-wrapper.js');
const findImportSource = require('./findImportSource.js');
// const rootElementInReturn = require('./html-element.js');
const findSrc = require('./findSrc.js');
const findHtmlElement = require('./findHtmlElement.js');
const createImportContextVisitor = require('./createImportContextVisitor.js');
const addDataAttribute = require('./addDataAttribute.js');
// const addUseContextLine = require('./createUseContext.js');
const createUseContext = require('./createUseContext.js');

const sourceCodeDir = './dump';
const outputCodeDir = './dump';

// Ensure the output directory exists
if (!fs.existsSync(outputCodeDir)) {
  fs.mkdirSync(outputCodeDir, { recursive: true });
}

function getComponentName(path) {
  const name = path.node.name;
  if (name?.type === 'JSXIdentifier') {
    const tagName = name.name;
    return tagName;
  }
}

// Traverse the source code directory
function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (file === 'node_modules') {
      return;
    }
    if (fs.statSync(filePath).isDirectory()) {
      traverseDirectory(filePath);
    } else if (
      path.extname(filePath) === '.jsx' ||
      path.extname(filePath) === '.tsx'
    ) {
      processFile(filePath);
    }
  });
}

// Process a single file
function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });

  // const rootElement = rootElementInReturn(ast);
  /**
   * I'm maintaining state here because I didn't want the ast to be traversed after it has been manipulated.
   * I didn't know about the path.stop() method when I wrote this
   * I'll refactor it in the next iteration.
   * ~ riki
   */
  let iterateEvents;
  let eventName;
  let eventAttributes;
  let reactComponent = false;
  let targetComponentSource;
  let targetDir;

  const visitor = {
    CallExpression(path) {
      if (
        path.node?.callee?.object?.name === 'mixpanel' &&
        path.node?.callee?.property?.name === 'track'
      ) {
        eventName = path.node.arguments[0].value;
        eventAttributes = path.node.arguments[1];
        if (eventAttributes?.type === 'ObjectExpression') {
          eventAttributes = eventAttributes.properties.reduce((acc, prop) => {
            acc[prop.key.name] =
              prop.value.value || prop.value.name || prop.value.type;
            return acc;
          }, {});
        } else {
          eventAttributes = {};
        }

        let jsxOpeningElement = path?.parentPath;
        while (
          jsxOpeningElement &&
          jsxOpeningElement?.node?.type !== 'JSXOpeningElement'
        ) {
          jsxOpeningElement = jsxOpeningElement?.parentPath;
        }

        if (jsxOpeningElement && jsxOpeningElement.node) {
          const attributes = jsxOpeningElement.node.attributes;
          iterateEvents = attributes.filter(
            (attr) => attr.name.name === 'injected_events'
          );

          let componentName = getComponentName(jsxOpeningElement);

          targetComponentSource = findImportSource(ast, componentName);

          // let currJsxElement = jsxOpeningElement.parentPath;

          if (isReactComponent(jsxOpeningElement)) {
            reactComponent = true;

            // traverse(ast, contextVisitor); move outside
            // traverse(ast, providerWrapperVisitor); move outside
            // let combinedVisitor = {
            //   ...contextVisitor,
            //   ...providerWrapperVisitor,
            // };

            // traverse(ast, combinedVisitor);
            // rootElementInReturn(ast);
            // const targetComponentSource = findImportSource(ast, 'Product')

            /**
             * TODO:
             * - import clashes
             * - react fragment bypass
             * - logic for locating the React component in the whole codebase
             * - import the created context
             * - use the created context
             * - set attribute using the values from the context
             * - remove .jx in context import
             */
          } else {
            if (iterateEvents.length > 0) {
              iterateEvents = JSON.parse(atob(iterateEvents[0].value.value));
            }
            iterateEvents.push({
              name: eventName,
              attributes: eventAttributes,
            });
            const dataIterateEvents = types.jsxAttribute(
              types.jsxIdentifier('injected_events'),
              types.stringLiteral(btoa(JSON.stringify(iterateEvents)))
            );
            attributes.map((attr, index) => {
              if (attr.name.name === 'injected_events') {
                attributes.splice(index, 1);
                console.log('Removed iterate-event-names');
              }
            });
            attributes.push(dataIterateEvents);
          }
        }
      }
    },
  };

  traverse(ast, visitor); // im setting flags here

  if (reactComponent) {
    // console.log('its a react component!🍎');
    if (iterateEvents.length > 0) {
      iterateEvents = JSON.parse(atob(iterateEvents[0].value.value));
    }
    iterateEvents.push({
      name: eventName,
      attributes: eventAttributes,
    });

    // let contextVisitor = createContextVisitor(
    //   btoa(JSON.stringify(iterateEvents)),
    //   'lol'
    // );

    // traverse(ast, contextVisitor);
    // traverse(ast, providerWrapperVisitor);

    targetDir = findSrc(filePath, targetComponentSource);
    // console.log('📦', filePath);

    // let importContextVisitor = createImportContextVisitor(
    //   path.resolve(filePath)
    // );

    /**
     * find the target compo  <------------------
     *           |                               |
     *           |                               |
     *           |                               |
     * check if root is html --- NO -------------
     *      |
     *      |
     *     Yes
     *      |
     *      |
     *      V
     * Do changes
     *
     * TODO:
     * - find relative path
     */

    const targetFileDir = findHtmlElement(targetDir);
    // console.log('🎯', targetFileDir);
    const targetFileCode = fs.readFileSync(targetFileDir, 'utf-8');
    const targetFileAst = parser.parse(targetFileCode, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });

    // traverse(targetFileAst, importContextVisitor);
    let modifiedAst = addDataAttribute(
      targetFileAst,
      btoa(JSON.stringify(iterateEvents)),
      'some-id'
    );
    // modifiedAst = createUseContext(modifiedAst, targetDir);
    // I can remove the use of contexts -->
    // const modifiedAst = addDataAttribute(
    //   targetFileAst,
    //   'iterateId1234',
    //   btoa(JSON.stringify(iterateEvents))
    // );
    const { code: modifiedTargetFileCode } = generate(modifiedAst, {}, code);
    fs.writeFileSync(targetFileDir, modifiedTargetFileCode);
  }

  const { code: modifiedCode } = generate(ast, {}, code);

  const outputFilePath = path.join(
    outputCodeDir,
    path.relative(sourceCodeDir, filePath)
  );

  const outputDirPath = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, modifiedCode);
  console.log(`Processed: ${filePath}`);
}

traverseDirectory(sourceCodeDir);
