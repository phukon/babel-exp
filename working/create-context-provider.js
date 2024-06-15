const types = require('@babel/types');

module.exports = {
  contextVisitor: {
    Program(path) {
      // Find the last import declaration
      // the body is an array, it traverses from below
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

        // Insert the import declaration at the beginning of the file
        path.node.body.unshift(importDeclaration);

        // Create the new line
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

        // Insert the new line after the last import declaration
        path.node.body.splice(
          path.node.body.indexOf(lastImport) + 1,
          0,
          newLine
        );

        // Create the IterateProvider component
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
                      types.stringLiteral('lol1')
                    ),
                    types.variableDeclarator(
                      types.identifier('iterateAttribute'),
                      types.stringLiteral('lol2')
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

        // Insert the IterateProvider component after the IterateContext declaration
        path.node.body.splice(
          path.node.body.indexOf(newLine) + 1,
          0,
          iterateProvider
        );
      }
    },
  },
};
