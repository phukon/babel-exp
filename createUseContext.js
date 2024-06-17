const types = require('@babel/types');
const traverse = require('@babel/traverse').default;

function createUseContext(targetAst, importDir) {
  let useContextLine;
  let defaultExportName = null;
  let ast = targetAst;

  traverse(ast, {
    Program(path) {
      // Find the last import declaration
      const lastImport = path.node.body.reduceRight((foundNode, node) => {
        return foundNode || (types.isImportDeclaration(node) ? node : null);
      }, null);

      if (lastImport) {
        // Add the required import declarations at the top
        const importDeclaration = types.importDeclaration(
          [
            types.importSpecifier(
              types.identifier('useContext'),
              types.identifier('useContext')
            ),
          ],
          types.stringLiteral('react')
        );

        path.node.body.unshift(importDeclaration);

        const importIterateContext = types.importDeclaration(
          [
            types.importSpecifier(
              types.identifier('IterateContext'),
              types.identifier('IterateContext')
            ),
          ],
          types.stringLiteral(importDir)
        );

        path.node.body.unshift(importIterateContext);

        useContextLine = types.variableDeclaration('const', [
          types.variableDeclarator(
            types.objectPattern([
              types.objectProperty(
                types.identifier('iterateId'),
                types.identifier('iterateId'),
                false,
                true
              ),
              types.objectProperty(
                types.identifier('iterateInjectedEvents'),
                types.identifier('iterateInjectedEvents'),
                false,
                true
              ),
            ]),
            types.callExpression(types.identifier('useContext'), [
              types.identifier('IterateContext'),
            ])
          ),
        ]);
      }
    },
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      if (declaration.type === 'Identifier') {
        // Export default points to an identifier
        defaultExportName = declaration.name;
      } else if (declaration.type === 'FunctionDeclaration') {
        // Directly process the default export if it's a function declaration
        defaultExportName = declaration.id.name;
      } else if (declaration.type === 'VariableDeclaration') {
        // Handle the case for variable declarations
        const declarator = declaration.declarations[0];
        if (declarator && declarator.id.type === 'Identifier') {
          defaultExportName = declarator.id.name;
        }
      }
    },
  });

  if (defaultExportName) {
    traverse(ast, {
      FunctionDeclaration(path) {
        if (path.node.id.name === defaultExportName) {
          // console.log('👂🏽 FunctionDeclaration:', path.node);
          path.node.body.body.unshift(useContextLine);
        }
      },
      VariableDeclarator(path) {
        if (path.node.id.name === defaultExportName) {
          const init = path.node.init;
          if (
            init.type === 'ArrowFunctionExpression' ||
            init.type === 'FunctionExpression'
          ) {
            // console.log('👂🏽 VariableDeclarator:', path.node);
            init.body.body.unshift(useContextLine);
          }
        }
      },
    });

    return ast;
  }
}

module.exports = createUseContext;
