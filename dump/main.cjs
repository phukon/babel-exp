const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;

// Original code
const code = `const x = 1 + 2;`;

// Parse the code into an AST
const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"]
});

// Traverse the AST and modify it
traverse(ast, {
    enter(path) {
        if (path.node.type === 'Identifier' && path.node.name === 'x') {
            path.node.name = 'y';
        }
    }
});

// Generate the new code from the modified AST
const output = generator(ast, {}, code);
console.log(output.code);  // Output: const y = 1 + 2;
