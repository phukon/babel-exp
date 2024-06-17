const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

module.exports = function (code) {
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
          null,
          [
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('IterateContext'),
                t.callExpression(t.identifier('createContext'), [t.nullLiteral()])
              ),
            ]),
          ]
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
          const jsxElement = path.findParent(p => p.isJSXElement());
          if (jsxElement) {
            const providerElement = t.jsxElement(
              t.jsxOpeningElement(t.jsxIdentifier('IterateContext.Provider'), [
                t.jsxAttribute(
                  t.jsxIdentifier('value'),
                  t.jsxExpressionContainer(t.identifier('lolref'))
                ),
              ]),
              t.jsxClosingElement(t.jsxIdentifier('IterateContext.Provider')),
              [jsxElement.node]
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
};
