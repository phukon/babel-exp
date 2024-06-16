const traverse = require('@babel/traverse').default;
const types = require('@babel/types');

module.exports = function addDataAttribute(targetFileAst) {
  let ast = targetFileAst;
  traverse(ast, {
    ReturnStatement(path) {
      const returnedElement = path.node.argument;
      if (returnedElement.type === 'JSXElement') {
        const openingElement = returnedElement.openingElement;
        const dataAttribute = types.jsxAttribute(
          types.jsxIdentifier('data-iterateid'),
          types.stringLiteral('value') // replace 'value' with the value you want to set for 'data-lol'
        );
        const dataiterateInjectedEvents = types.jsxAttribute(
          types.jsxIdentifier('data-iterateinjectedevents'),
          types.stringLiteral('value') // replace 'value' with the value you want to set for 'data-lol'
        );
        openingElement.attributes.push(dataAttribute);
        openingElement.attributes.push(dataiterateInjectedEvents);
      }
    },
  });

  return ast;
};
