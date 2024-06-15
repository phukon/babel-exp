const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const fs = require('fs');
const path = require('path');

// working code

const sourceCodeDir = './dump';
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

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  });


  const visitor = {
    Program(path) {
      // Find the last import declaration
      const lastImport = path.node.body.reduceRight((foundNode, node) => {
        return foundNode || (types.isImportDeclaration(node) ? node : null);
      }, null);

      if (lastImport) {
        // Create the new line
        const newLine = types.exportNamedDeclaration(
          types.variableDeclaration('const', [
            types.variableDeclarator(
              types.identifier('IterateContext'),
              types.callExpression(types.identifier('createContext'), [
                types.nullLiteral(),
              ])
            ),
          ])
        );

        // Insert the new line after the last import declaration
        path.node.body.splice(
          path.node.body.indexOf(lastImport) + 1,
          0,
          newLine
        );
      }
    },
    // JSXElement(path) {
    //   const openingElement = path.node.openingElement;
    //   const onClickAttribute = openingElement.attributes.find(
    //     (attr) => attr.name.name === 'onClick'
    //   );

    //   if (
    //     onClickAttribute &&
    //     onClickAttribute?.value?.expression?.body &&
    //     onClickAttribute?.value?.expression?.body[0]?.expression?.callee &&
    //     onClickAttribute?.value?.expression?.body[0]?.expression?.callee?.object
    //       .name === 'mixpanel' &&
    //     onClickAttribute.value.expression.body[0].expression.callee.property
    //       .name === 'track'
    //   ) {
    //     const provider = types.jsxElement(
    //       types.jsxOpeningElement(
    //         types.jsxIdentifier('IterateContext.Provider'),
    //         [
    //           types.jsxAttribute(
    //             types.jsxIdentifier('value'),
    //             types.jsxExpressionContainer(types.identifier('lolref'))
    //           ),
    //         ],
    //         false
    //       ),
    //       types.jsxClosingElement(
    //         types.jsxIdentifier('IterateContext.Provider')
    //       ),
    //       [path.node],
    //       false
    //     );

    //     path.replaceWith(provider);
    //   }
    // },
  };

  // Traverse the AST with the visitor
  traverse(ast, visitor);
  const { code: modifiedCode } = generate(ast);
  console.log(modifiedCode);

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

// Generate the modified code

// console.log(modifiedCode);
traverseDirectory(sourceCodeDir);
