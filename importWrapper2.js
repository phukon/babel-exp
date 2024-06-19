const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');

const directoryPath = './dump2';

function findFilesInDir(dir, fileExtensions, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findFilesInDir(filePath, fileExtensions, fileList);
    } else {
      if (fileExtensions.includes(path.extname(file))) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function hasMixpanelTracker(ast) {
  let hasTracker = false;

  traverse(ast, {
    MemberExpression(path) {
      if (
        path.node.object.name === 'mixpanel' &&
        path.node.property.name === 'track'
      ) {
        hasTracker = true;
      }
    },
  });

  return hasTracker;
}

function importWrapper(targetAst, to, from) {
  let ast = targetAst;
  let relativePath = path.relative(from, to).replace(/\\/g, '/');

  const importName = 'IterateWrapper';

  const importDefaultSpecifier = types.importDefaultSpecifier(
    types.identifier(importName)
  );

  const importDeclaration = types.importDeclaration(
    [importDefaultSpecifier],
    types.stringLiteral(relativePath)
  );

  let isImported = false;
  traverse(ast, {
    ImportDeclaration(path) {
      const specifiers = path.node.specifiers;
      if (specifiers.some((specifier) => specifier.local.name === importName)) {
        isImported = true;
      }
    },
  });

  if (!isImported) {
    let lastImportIndex = -1;

    traverse(ast, {
      ImportDeclaration(path) {
        lastImportIndex = path.key;
      },
    });

    ast.program.body.splice(lastImportIndex + 1, 0, importDeclaration);
  }
}

const fileExtensions = ['.jsx', '.tsx'];
const files = findFilesInDir(directoryPath, fileExtensions);

files.forEach((filePath) => {
  let code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  if (hasMixpanelTracker(ast)) {
    importWrapper(ast, './dump2/src/IterateWrapper', filePath);
    const { code: updatedCode } = generate(ast);
    fs.writeFileSync(filePath, updatedCode, 'utf-8');
    console.log(`Imported IterateWrapper in : ${filePath}`);
  }
});
