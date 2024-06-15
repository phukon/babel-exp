const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./jsx-html.js');
const { contextVisitor } = require('./working/create-context-provider.js');

const sourceCodeDir = './dump';
const outputCodeDir = './dump';

// Ensure the output directory exists
if (!fs.existsSync(outputCodeDir)) {
  fs.mkdirSync(outputCodeDir, { recursive: true });
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

  const visitor = {
    CallExpression(path) {
      if (
        path.node?.callee?.object?.name === 'mixpanel' &&
        path.node?.callee?.property?.name === 'track'
      ) {
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

        let jsxOpeningElement = path?.parentPath;
        while (
          jsxOpeningElement &&
          jsxOpeningElement?.node?.type !== 'JSXOpeningElement'
        ) {
          jsxOpeningElement = jsxOpeningElement?.parentPath;
        }

        if (jsxOpeningElement && jsxOpeningElement.node) {
          const attributes = jsxOpeningElement.node.attributes;
          let iterateEvents = attributes.filter(
            (attr) => attr.name.name === 'injected_events'
          );
          // console.log('🚚');
          if (isReactComponent(jsxOpeningElement)) {
            // console.log('its a react component!🍎');

            traverse(ast, contextVisitor);
            /**
             * TODO:
             * - write and export context
             * - write provider
             * - wrap provider around the target element, or in this case this React JSX Element
             * - logic for locating the React component in the whole codebase
             *
             */
          }

          if (iterateEvents.length > 0) {
            iterateEvents = JSON.parse(atob(iterateEvents[0].value.value));
          }
          iterateEvents.push({ name: eventName, attributes: eventAttributes });
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

// Start traversing the source code directory
traverseDirectory(sourceCodeDir);
