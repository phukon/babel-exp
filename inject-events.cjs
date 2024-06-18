const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./isReactComponent.js');
// const findImportSource = require('./findImportSource.js');
// const findSrc = require('./findSrc.js');
// const findHtmlElement = require('./findHtmlElement.js');
// const addDataAttribute = require('./addDataAttribute.js');
const {
  createIterateUtilFile,
  findSrcDirectory,
} = require('./createIterateUtil.js');
const addWrapper = require('./addWrapper.js');
const importWrapper = require('./importWrapper.js');

const sourceCodeDir = './dump';
const outputCodeDir = './dump';
let srcDir;

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
  let isMixpanelTrackerInFile = false;
  let wrapperArray = [];
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });
  importWrapper(ast, `${srcDir}${path.sep}IterateUtil.jsx`, filePath);

  const components = [];

  const visitor = {
    CallExpression(path) {
      if (
        path.node?.callee?.object?.name === 'mixpanel' &&
        path.node?.callee?.property?.name === 'track'
      ) {
        isMixpanelTrackerInFile = true;
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
          const isComponent = isReactComponent(jsxOpeningElement);

          components.push({
            jsxOpeningElement,
            eventName,
            eventAttributes,
            isComponent,
          });
        }
      }
    },
  };

  traverse(ast, visitor);

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

      // Remove old 'data-iterateid' and 'data-iterateinjectedevents' attributes
      const existingIterateIdAttr = attributes.find(
        (attr) => attr.name.name === 'data-iterateid'
      );
      if (existingIterateIdAttr) {
        attributes.splice(attributes.indexOf(existingIterateIdAttr), 1);
      }
      const existingIterateInjectedEventsAttr = attributes.find(
        (attr) => attr.name.name === 'data-iterateinjectedevents'
      );
      if (existingIterateInjectedEventsAttr) {
        attributes.splice(
          attributes.indexOf(existingIterateInjectedEventsAttr),
          1
        );
      }

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

        // const targetComponentSource = findImportSource(ast, componentName);
        // const targetDir = findSrc(filePath, targetComponentSource);
        // const targetFileDir = findHtmlElement(targetDir);
        // const targetFileCode = fs.readFileSync(targetFileDir, 'utf-8');
        // const targetFileAst = parser.parse(targetFileCode, {
        //   sourceType: 'unambiguous',
        //   plugins: ['jsx', 'typescript'],
        // });
        // let modifiedAst = addDataAttribute(
        //   targetFileAst,
        //   btoa(JSON.stringify(iterateEvents)),
        //   'some-id'
        // );
        // const { code: modifiedTargetFileCode } = generate(
        //   modifiedAst,
        //   {},
        //   code
        // );
        // fs.writeFileSync(targetFileDir, modifiedTargetFileCode);
      } else {
        attributes.push(dataIterateEvents);
      }
    }
  );
  wrapperArray.forEach(({ originalName, wrapperName, dataiterate }) => {
    console.log(dataiterate);
    addWrapper(
      ast,
      originalName,
      wrapperName,
      btoa(JSON.stringify(dataiterate))
    );
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

// Are component wrapper resides here
srcDir = findSrcDirectory(sourceCodeDir); // finds the 'src' dir in a project
console.log('🎁',srcDir)
createIterateUtilFile(sourceCodeDir);
traverseDirectory(sourceCodeDir);
