const findImportSource = require('./find-import-source');
const findSrc = require('./findSrc');
const rootElementInReturn = require('./html-element.js');
const isReactComponent = require('./jsx-html');
const fs = require('fs');
const parser = require('@babel/parser');

module.exports = function findHtmlElement(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });

  let rootElementName = rootElementInReturn(ast);

  while (isReactComponent(rootElementName)) {
    const targetComponentSource = findImportSource(ast, rootElementName);
    const targetDir = findSrc(filePath, targetComponentSource);
    if (!targetDir) {
      throw new Error(
        `Cannot find the source for component: ${rootElementName}`
      );
    }

    const targetCode = fs.readFileSync(targetDir, 'utf-8');
    const targetAst = parser.parse(targetCode, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });

    rootElementName = rootElementInReturn(targetAst);
  }

  return filePath;
};
