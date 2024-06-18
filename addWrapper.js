// const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
// const generate = require('@babel/generator').default;
const types = require('@babel/types');

function addWrapper(targetAst, originalName, wrapperName, dataiterate) {
  // Parse the code into an AST
  // const ast = parser.parse(code, {
  //   sourceType: 'module',
  //   plugins: ['jsx'],
  // });
  let ast = targetAst;
  const wrapperDeclaration = types.variableDeclaration('const', [
    types.variableDeclarator(
      types.identifier(wrapperName),
      types.callExpression(types.identifier('IterateWrapper'), [
        types.identifier(originalName),
        types.objectExpression([
          types.objectProperty(
            types.identifier('dataiterate'),
            types.stringLiteral(dataiterate)
          ),
        ]),
      ])
    ),
  ]);

  // Traverse the AST to find the end of the import statements
  let lastImportIndex = -1;

  traverse(ast, {
    ImportDeclaration(path) {
      lastImportIndex = path.key;
    },
  });

  // Insert the new node after the last import statement
  ast.program.body.splice(lastImportIndex + 1, 0, wrapperDeclaration);
}

module.exports = addWrapper;
