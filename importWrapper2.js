const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const { findSrcDirectory } = require('./createIterateUtil');
const directoryPath = '../flux';

function findFilesInDir(dir, fileExtensions, fileList = []) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return fileList;
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (error) {
      console.error(`Error getting stats for file ${filePath}:`, error);
      return;
    }

    if (stat.isDirectory()) {
      if (path.basename(filePath) !== 'node_modules') {
        findFilesInDir(filePath, fileExtensions, fileList);
      }
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

  try {
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
  } catch (error) {
    console.error('Error traversing AST for Mixpanel tracker:', error);
    throw error;
  }

  return hasTracker;
}

function importUtil(targetAst, to, from) {
  let ast = targetAst;
  let relativePath = path.relative(from, to).replace(/\\/g, '/');

  const parts = relativePath.split('/');
  if (parts.length > 1) {
    parts.splice(-2, 1); // Removing one level from the constructed relative path. A very scrappy fix.
  }
  relativePath = parts.join('/');

  const importName = 'IterateWrapper';

  const importDefaultSpecifier = types.importDefaultSpecifier(
    types.identifier(importName)
  );

  const importDeclaration = types.importDeclaration(
    [importDefaultSpecifier],
    types.stringLiteral(relativePath)
  );

  let isImported = false;
  try {
    traverse(ast, {
      ImportDeclaration(path) {
        const specifiers = path.node.specifiers;
        if (
          specifiers.some((specifier) => specifier.local.name === importName)
        ) {
          isImported = true;
        }
      },
    });
  } catch (error) {
    console.error('Error checking for existing imports:', error);
    throw error;
  }

  if (!isImported) {
    let lastImportIndex = -1;
    try {
      traverse(ast, {
        ImportDeclaration(path) {
          lastImportIndex = path.key;
        },
      });
    } catch (error) {
      console.error('Error finding last import declaration:', error);
      throw error;
    }

    ast.program.body.splice(lastImportIndex + 1, 0, importDeclaration);
  }
}

const fileExtensions = ['.jsx', '.tsx'];
let files;
try {
  files = findFilesInDir(directoryPath, fileExtensions);
} catch (error) {
  console.error('Error finding files in directory:', error);
  files = [];
}

let srcDir;
try {
  srcDir = findSrcDirectory(directoryPath);
} catch (error) {
  console.error('Error finding source directory:', error);
  srcDir = '';
}

files.forEach((filePath) => {
  try {
    let code = fs.readFileSync(filePath, 'utf-8');
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });

    if (hasMixpanelTracker(ast)) {
      importUtil(ast, `${srcDir}/IterateUtil`, filePath);
      const { code: updatedCode } = generate(ast);
      fs.writeFileSync(filePath, updatedCode, 'utf-8');
      console.log(`Imported IterateWrapper in: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
});
