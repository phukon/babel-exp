const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const fs = require('fs');
const path = require('path');

const sourceCodeDir = './dump'; // Replace with your source code directory
const outputCodeDir = './dump';

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (file === 'node_modules') {
      // Ignore the node_modules directory
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

function tform(code) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  // Insert export statement for IterateContext
  const insertExportIterateContext = () => {
    traverse(ast, {
      Program(path) {
        // Find the first import declaration
        let firstImportIndex = -1;
        path.node.body.forEach((node, index) => {
          if (t.isImportDeclaration(node)) {
            firstImportIndex = index;
            return false; // Stop iteration
          }
        });

        // Insert export statement after the last import or at the beginning
        const declaration = t.exportNamedDeclaration(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('IterateContext'),
              t.callExpression(t.identifier('createContext'), [t.nullLiteral()])
            ),
          ]),
          []
        );

        if (firstImportIndex === -1) {
          // No imports found, insert at the beginning
          path.node.body.unshift(declaration);
        } else {
          // Insert after the last import declaration
          path.node.body.splice(firstImportIndex + 1, 0, declaration);
        }
      },
    });
  };

  // Wrap JSX elements containing mixpanel.track with IterateContext.Provider
  const wrapMixpanelTrackComponents = () => {
    traverse(ast, {
      CallExpression(path) {
        const callee = path.get('callee');
        if (
          callee.isMemberExpression() &&
          callee.get('object').isIdentifier({ name: 'mixpanel' }) &&
          callee.get('property').isIdentifier({ name: 'track' })
        ) {
          const jsxElement = path.findParent((p) => p.isJSXElement());
          if (jsxElement) {
            const clonedElement = t.cloneDeep(jsxElement.node);
            const providerElement = t.jsxElement(
              t.jsxOpeningElement(t.jsxIdentifier('IterateContext.Provider'), [
                t.jsxAttribute(
                  t.jsxIdentifier('value'),
                  t.jsxExpressionContainer(t.identifier('lolref'))
                ),
              ]),
              t.jsxClosingElement(t.jsxIdentifier('IterateContext.Provider')),
              [clonedElement]
            );

            jsxElement.replaceWith(providerElement);
          }
        }
      },
    });
  };

  // Execute the transformations
  insertExportIterateContext();
  wrapMixpanelTrackComponents();

  // Generate code from modified AST
  const { code: transformedCode } = generate(ast, {}, code);

  return transformedCode;
}

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const tformcode = tform(code);
  const outputFilePath = path.join(
    outputCodeDir,
    path.relative(sourceCodeDir, filePath)
  );

  // Ensure the output directory exists
  const outputDirPath = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, tformcode);
  console.log(`Processed: ${filePath}`);
}

// console.log(modifiedCode);
traverseDirectory(sourceCodeDir);
