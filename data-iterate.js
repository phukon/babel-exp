const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const { randomUUID } = require('crypto');

const sourceCodeDir = '../flux';
const outputCodeDir = '../flux';

class FileProcessor {
  constructor(sourceDir, outputDir) {
    this.sourceDir = sourceDir;
    this.outputDir = outputDir;
    this.ensureDirectoryExists(outputDir);
  }

  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      if (file === 'node_modules') {
        return;
      }
      if (fs.statSync(filePath).isDirectory()) {
        this.traverseDirectory(filePath);
      } else if (
        (path.extname(filePath) === '.jsx' ||
          path.extname(filePath) === '.tsx') &&
        !['IterateUtil.tsx', 'IterateUtil.jsx'].includes(file)
      ) {
        this.processFile(filePath);
      }
    });
  }

  processFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });

    const visitor = {
      JSXElement: (path) => this.addDataIterateAttribute(path, filePath),
    };

    traverse(ast, visitor);

    const { code: modifiedCode } = generate(ast, {}, code);
    this.writeOutputFile(filePath, modifiedCode);
  }

  addDataIterateAttribute(path, filePath) {
    const openingElement = path.node.openingElement;
    const elementName = openingElement.name.name;

    // Skip components whose names start with an uppercase letter
    if (elementName && /^[A-Z]/.test(elementName)) {
      return;
    }

    const attributes = openingElement.attributes;

    // Create the object with events as null, id as uuid, and filePath
    const dataIterateObject = {
      events: null,
      id: randomUUID(),
      filePath: filePath,
    };

    // Convert the object to a JSON string and then to a base64 encoded string
    const dataIterateBase64 = Buffer.from(
      JSON.stringify(dataIterateObject)
    ).toString('base64');

    // Create the data-iterate attribute with the base64 encoded string
    const dataIterateAttribute = types.jsxAttribute(
      types.jsxIdentifier('data-iterate'),
      types.stringLiteral(dataIterateBase64)
    );

    attributes.push(dataIterateAttribute);
  }

  writeOutputFile(filePath, modifiedCode) {
    const outputFilePath = path.join(
      this.outputDir,
      path.relative(this.sourceDir, filePath)
    );

    const outputDirPath = path.dirname(outputFilePath);
    this.ensureDirectoryExists(outputDirPath);

    fs.writeFileSync(outputFilePath, modifiedCode);
    console.log(`Processed: ${filePath}`);
  }
}

const fileProcessor = new FileProcessor(sourceCodeDir, outputCodeDir);
fileProcessor.traverseDirectory(sourceCodeDir);
