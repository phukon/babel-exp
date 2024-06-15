const traverse = require('@babel/traverse').default;
const parser = require('@babel/parser');

const code = `
  const element = <div className="container">Hello World</div>;
  const component = <MyComponent prop="value" />;
`;

const ast = parser.parse(code, {
  sourceType: "module",
  plugins: ["jsx"]
});


traverse(ast, {
  JSXElement(path) {
    const openingElement = path.node.openingElement;
    const name = openingElement.name;

    if (name.type === 'JSXIdentifier') {
      const tagName = name.name;
      
      if (tagName[0] === tagName[0].toUpperCase()) {
        console.log('React Component:', tagName);
      } else {
        console.log('HTML Element:', tagName);
      }
    }
  }
});
