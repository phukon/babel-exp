const types = require('@babel/types');

function createContextVisitor(iterateId, iterateAttribute) {
  return {
    Program(path) {
      // Find the last import declaration
      const lastImport = path.node.body.reduceRight((foundNode, node) => {
        return foundNode || (types.isImportDeclaration(node) ? node : null);
      }, null);

      if (lastImport) {
        // Create the import declaration
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
                      types.identifier('iterateId'),
                      types.stringLiteral(iterateId)
                    ),
                    types.variableDeclarator(
                      types.identifier('iterateAttribute'),
                      types.stringLiteral(iterateAttribute)
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
          path.node.body.indexOf(newLine) + 1,
          0,
          iterateProvider
        );
      }
    },
  };
}

module.exports = createContextVisitor;
