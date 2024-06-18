const fs = require('fs');
const path = require('path');

function findSrcDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file === 'src') {
        return filePath;
      } else {
        const found = findSrcDirectory(filePath);
        if (found) {
          return found;
        }
      }
    }
  }
  return null;
}

function createIterateUtilFile(baseDir) {
  const srcDir = findSrcDirectory(baseDir);
  if (!srcDir) {
    console.log('No "src" directory found.');
    return;
  }

  const filePath = path.join(srcDir, 'IterateUtil.jsx');
  const fileContent = `
import React from 'react';
import ReactDOM from 'react-dom';

const IterateWrapper = (WrappedComponent, customAttributes) => {
  return class extends React.Component {
    componentDidMount() {
      this.addAttributes();
    }

    componentDidUpdate() {
      this.addAttributes();
    }

    addAttributes() {
      const domNode = ReactDOM.findDOMNode(this);
      console.log('🎟', domNode);

      if (domNode) {
        this.addAttributesToDeepestIntrinsicElement(domNode);
      }
    }

    addAttributesToDeepestIntrinsicElement(node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName) {
        Object.keys(customAttributes).forEach((attr) => {
          node.setAttribute(attr, customAttributes[attr]);
        });
      } else if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.forEach((childNode) => {
          this.addAttributesToDeepestIntrinsicElement(childNode);
        });
      }
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
};

export default IterateWrapper;
  `;

  fs.writeFileSync(filePath, fileContent.trim());
  console.log(`Created: ${filePath}`);
}

// createIterateUtilFile('./');
module.exports = {
  findSrcDirectory,
  createIterateUtilFile,
};