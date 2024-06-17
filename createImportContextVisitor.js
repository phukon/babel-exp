const types = require('@babel/types');

function createImportContextVisitor(importDir, targetDir) {
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

        // const useContextLine = types.variableDeclaration('const', [
        //   types.variableDeclarator(
        //     types.objectPattern([
        //       types.objectProperty(
        //         types.identifier('iterateId'),
        //         types.identifier('iterateId'),
        //         false,
        //         true
        //       ),
        //       types.objectProperty(
        //         types.identifier('iterateInjectedEvents'),
        //         types.identifier('iterateInjectedEvents'),
        //         false,
        //         true
        //       ),
        //     ]),
        //     types.callExpression(types.identifier('useContext'), [
        //       types.identifier('IterateContext'),
        //     ])
        //   ),
        // ]);

        // path.node.body.splice(
        //   path.node.body.indexOf(lastImport) + 1,
        //   0,
        //   useContextLine
        // );
      }
    },
  };
}

module.exports = createImportContextVisitor;
