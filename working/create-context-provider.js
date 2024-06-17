const types = require('@babel/types');

function createContextVisitor(iterateInjectedEvents, iterateId) {
  return {
    Program(path) {
      const lastImport = path.node.body.reduceRight((foundNode, node) => {
        return foundNode || (types.isImportDeclaration(node) ? node : null);
      }, null);

      if (lastImport) {
        const importDeclaration = types.importDeclaration(
          [
            types.importSpecifier(
              types.identifier('createContext'),
              types.identifier('createContext')
            ),
          ],
          types.stringLiteral('react')
        );

        path.node.body.unshift(importDeclaration);

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

        path.node.body.splice(
          path.node.body.indexOf(lastImport) + 1,
          0,
          newLine
        );

        const iterateProvider = types.exportNamedDeclaration(
          types.variableDeclaration('const', [
            types.variableDeclarator(
              types.identifier('IterateProvider'),
              types.arrowFunctionExpression(
                [types.identifier('children')],
                types.blockStatement([
                  types.variableDeclaration('const', [
                    types.variableDeclarator(
                      types.identifier('iterateInjectedEvents'),
                      types.stringLiteral(iterateInjectedEvents)
                    ),
                    types.variableDeclarator(
                      types.identifier('iterateId'),
                      types.stringLiteral(iterateId)
                    ),
                  ]),
                  types.returnStatement(
                    types.jsxElement(
                      types.jsxOpeningElement(
                        types.jsxIdentifier('IterateContext.Provider'),
                        [
                          types.jsxAttribute(
                            types.jsxIdentifier('value'),
                            types.jsxExpressionContainer(
                              types.objectExpression([
                                types.objectProperty(
                                  types.identifier('iterateId'),
                                  types.identifier('iterateId')
                                ),
                                types.objectProperty(
                                  types.identifier('iterateInjectedEvents'),
                                  types.identifier('iterateInjectedEvents')
                                ),
                              ])
                            )
                          ),
                        ],
                        false
                      ),
                      types.jsxClosingElement(
                        types.jsxIdentifier('IterateContext.Provider')
                      ),
                      [
                        types.jsxExpressionContainer(
                          types.identifier('children')
                        ),
                      ],
                      false
                    )
                  ),
                ])
              )
            ),
          ])
        );

        path.node.body.splice(
          path.node.body.indexOf(newLine) + 1,
          0,
          iterateProvider
        );
      }
    },
  };
}

module.exports = createContextVisitor;
