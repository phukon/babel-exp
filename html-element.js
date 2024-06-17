const traverse = require('@babel/traverse').default;
// const parser = require('@babel/parser');

function getRootElementNameFromBody(body) {
  if (body.type === 'BlockStatement') {
    const returnStatement = body.body.find(
      (node) => node.type === 'ReturnStatement'
    );
    if (returnStatement) {
      const returnedElement = returnStatement.argument;
      if (returnedElement.type === 'JSXElement') {
        return returnedElement.openingElement.name.name;
      }
    }
  } else if (body.type === 'JSXElement') {
    return body.openingElement.name.name;
  }
  return null;
}

module.exports = function rootElementInReturn(ast) {
  let rootElementName = null;
  let defaultExportName = null;

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      if (declaration.type === 'Identifier') {
        // Export default points to an identifier
        defaultExportName = declaration.name;
      } else {
        // Directly process the default export if it's an expression
        rootElementName = getRootElementNameFromBody(declaration.body);
      }
    },
  });

  if (defaultExportName) {
    traverse(ast, {
      FunctionDeclaration(path) {
        if (path.node.id.name === defaultExportName) {
          rootElementName = getRootElementNameFromBody(path.node.body);
        }
      },
      VariableDeclarator(path) {
        if (path.node.id.name === defaultExportName) {
          const init = path.node.init;
          if (
            init.type === 'ArrowFunctionExpression' ||
            init.type === 'FunctionExpression'
          ) {
            rootElementName = getRootElementNameFromBody(init.body);
          }
        }
      },
    });
  }

  if (rootElementName) {
    console.log(`Root element in the return statement is: ${rootElementName}`);
  }

  return rootElementName;
};
