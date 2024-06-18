const traverse = require('@babel/traverse').default;
const types = require('@babel/types');
const path = require('path');

function importWrapper(targetAst, to, from) {
  let ast = targetAst;
  let relativePath = path.relative(from, to);

  const importName = 'IterateWrapper';
  const importSpecifier = types.importSpecifier(
    types.identifier(importName),
    types.identifier(importName)
  );

  const importDeclaration = types.importDeclaration(
    [importSpecifier],
    types.stringLiteral(relativePath)
  );

  // Check if IterateWrapper is already imported
  let isImported = false;
  traverse(ast, {
    ImportDeclaration(path) {
      const specifiers = path.node.specifiers;
      if (specifiers.some(specifier => specifier.local.name === importName)) {
        isImported = true;
      }
    },
  });

  // If IterateWrapper is not imported, add the import declaration
  if (!isImported) {
    // Traverse the AST to find the end of the import statements
    let lastImportIndex = -1;

    traverse(ast, {
      ImportDeclaration(path) {
        lastImportIndex = path.key;
      },
    });

    // Insert the new node after the last import statement
    ast.program.body.splice(lastImportIndex + 1, 0, importDeclaration);
  }
}

module.exports = importWrapper;
