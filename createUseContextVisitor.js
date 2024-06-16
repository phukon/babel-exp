const types = require('@babel/types');

function createUseContextVisitor(importDir, targetDir) {
  return {
    Program(path) {
      // Find the last import declaration
      const lastImport = path.node.body.reduceRight((foundNode, node) => {
        return foundNode || (types.isImportDeclaration(node) ? node : null);
      }, null);

      if (lastImport) {
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

        const useContextLine = types.variableDeclaration('const', [
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

        path.node.body.splice(
          path.node.body.indexOf(lastImport) + 1,
          0,
          useContextLine
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
                      types.identifier('iterateId'),
                      types.stringLiteral('iterateId')
                    ),
                    types.variableDeclarator(
                      types.identifier('iterateAttribute'),
                      types.stringLiteral('iterateAttribute')
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
                                  types.identifier('iterateAttribute'),
                                  types.identifier('iterateAttribute')
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
          path.node.body.indexOf(useContextLine) + 1,
          0,
          iterateProvider
        );
      }
    },
  };
}

module.exports = createUseContextVisitor;
