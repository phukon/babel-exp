const traverse = require('@babel/traverse').default;

module.exports = function findImportSource(ast, componentName) {
  let importSource = null;

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.specifiers.some(specifier => specifier.local.name === componentName)) {
        importSource = path.node.source.value;
        path.stop();
      }
    }
  });

  if (importSource) {
    // console.log(`${componentName} component is imported from: ${importSource}`);
  } else {
    console.log('Component import not found');
  }
  return importSource
};