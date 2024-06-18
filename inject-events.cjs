const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./isReactComponent.js');
const findImportSource = require('./findImportSource.js');
const findSrc = require('./findSrc.js');
const findHtmlElement = require('./findHtmlElement.js');
const createImportContextVisitor = require('./createImportContextVisitor.js');
const addDataAttribute = require('./addDataAttribute.js');

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

  let components = [];

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
          const componentName = getComponentName(jsxOpeningElement);

          components.push({
            jsxOpeningElement,
            componentName,
            eventName,
            eventAttributes,
          });
        }
      }
    },
  };

  traverse(ast, visitor);

  components.forEach(({ jsxOpeningElement, componentName, eventName, eventAttributes }) => {
    let iterateEvents = [];
    const attributes = jsxOpeningElement.node.attributes;
    const existingEventAttr = attributes.find(attr => attr.name.name === 'injected_events');

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
    attributes.push(dataIterateEvents);

    if (isReactComponent(jsxOpeningElement)) {
      const targetComponentSource = findImportSource(ast, componentName);
      const targetDir = findSrc(filePath, targetComponentSource);
      const targetFileDir = findHtmlElement(targetDir);
      const targetFileCode = fs.readFileSync(targetFileDir, 'utf-8');
      const targetFileAst = parser.parse(targetFileCode, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
      });

      let modifiedAst = addDataAttribute(
        targetFileAst,
        btoa(JSON.stringify(iterateEvents)),
        'some-id'
      );
      const { code: modifiedTargetFileCode } = generate(modifiedAst, {}, code);
      fs.writeFileSync(targetFileDir, modifiedTargetFileCode);
    }
  });

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
