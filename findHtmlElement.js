const findImportSource = require('./find-import-source');
const findSrc = require('./findSrc');
const rootElementInReturn = require('./html-element.js');
const fs = require('fs');
const parser = require('@babel/parser');

module.exports = function findHtmlElement(filePath) {
  let currentFilePath = filePath;
  let code = fs.readFileSync(currentFilePath, 'utf-8');
  let ast = parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript'],
  });

  let rootElementName = rootElementInReturn(ast);
  console.log('🎇', rootElementName);
  let isReactComponent =
    rootElementName[0] === rootElementName[0].toUpperCase();

  while (isReactComponent) {
    console.log('🧨', rootElementName);
    const targetComponentSource = findImportSource(ast, rootElementName);
    const targetDir = findSrc(currentFilePath, targetComponentSource);
    if (!targetDir) {
      throw new Error(
        `Cannot find the source for component: ${rootElementName}`
      );
    }

    currentFilePath = targetDir;
    code = fs.readFileSync(currentFilePath, 'utf-8');
    ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });

    rootElementName = rootElementInReturn(ast);
    isReactComponent = rootElementName[0] === rootElementName[0].toUpperCase();
  }

  return currentFilePath;
};
