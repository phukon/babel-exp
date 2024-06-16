const traverse = require('@babel/traverse').default;

module.exports = function rootElementInReturn(ast) {
  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id.name === 'Lol') {
        const body = path.node.body;
        if (body.type === 'BlockStatement') {
          const returnStatement = body.body.find(
            (node) => node.type === 'ReturnStatement'
          );
          if (returnStatement) {
            const returnedElement = returnStatement.argument;
            if (returnedElement.type === 'JSXElement') {
              let name = returnedElement.openingElement.name.name;
              console.log(`Root element in the return statement is: ${name}`);
              return name;
            }
          }
        }
      }
    },
    VariableDeclarator(path) {
      if (path.node.id.name === 'Lol') {
        const body = path.node.init.body;
        if (body.type === 'BlockStatement') {
          const returnStatement = body.body.find(
            (node) => node.type === 'ReturnStatement'
          );
          if (returnStatement) {
            const returnedElement = returnStatement.argument;
            if (returnedElement.type === 'JSXElement') {
              let name = returnedElement.openingElement.name.name;
              console.log(`Root element in the return statement is: ${name}`);
              return name;
            }
          }
        }
      }
    },
  });
};
