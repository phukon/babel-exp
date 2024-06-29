const traverse = require('@babel/traverse').default;
const types = require('@babel/types');

function addWrapper(targetAst, originalName, wrapperName, dataiterate) {
  let ast = targetAst;
  const wrapperDeclaration = types.variableDeclaration('const', [
    types.variableDeclarator(
      types.identifier(wrapperName),
      types.callExpression(types.identifier('IterateWrapper'), [
        types.identifier(originalName),
        types.objectExpression([
          types.objectProperty(
            types.stringLiteral('data-iterate'),
            types.stringLiteral(dataiterate)
          ),
        ]),
      ])
    ),
  ]);

  let lastImportIndex = -1;

  traverse(ast, {
    ImportDeclaration(path) {
      lastImportIndex = path.key;
    },
  });

  ast.program.body.splice(lastImportIndex + 1, 0, wrapperDeclaration);
}

module.exports = addWrapper;
