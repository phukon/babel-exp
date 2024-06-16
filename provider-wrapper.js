const types = require('@babel/types');

module.exports = {
  providerWrapperVisitor: {
    CallExpression(path) {
      if (
        path.node?.callee?.object?.name === 'mixpanel' &&
        path.node?.callee?.property?.name === 'track'
      ) {
        let jsxOpeningElement = path?.parentPath;
        while (
          jsxOpeningElement &&
          jsxOpeningElement?.node?.type !== 'JSXOpeningElement'
        ) {
          jsxOpeningElement = jsxOpeningElement?.parentPath;
        }

        if (jsxOpeningElement && jsxOpeningElement.node) {
          const iterateProviderElementHead = types.jsxOpeningElement(
            types.jsxIdentifier('IterateProvider'),
            [],
            false
          );

          const iterateProviderElementTail = types.jsxClosingElement(
            types.jsxIdentifier('IterateProvider')
          );

          let currJsxElement = jsxOpeningElement.parentPath;
          if (currJsxElement.key === 'argument') {
            // console.log('🐵');
            const openingElement = types.jsxOpeningElement(
              types.jsxIdentifier('IterateProvider'),
              []
            );
            const closingElement = types.jsxClosingElement(
              types.jsxIdentifier('IterateProvider')
            );
            const wrapperElement = types.jsxElement(
              openingElement,
              closingElement,
              [currJsxElement.node],
              false
            );

            currJsxElement.replaceWith(wrapperElement);
            path.stop()
          } else {
            // console.log('🐱‍💻');
            let childrenArray = currJsxElement.parentPath.node.children;
            let index = childrenArray.indexOf(currJsxElement.node);
            childrenArray.splice(index, 0, iterateProviderElementHead);
            index += 1;
            childrenArray.splice(index + 1, 0, iterateProviderElementTail);
          }
        }
      }
    },
  },
};
