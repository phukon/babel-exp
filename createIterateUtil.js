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

function createIterateUtilFile(baseDir, projectType) {
  // console.log('🧶',projectType)
  const srcDir = findSrcDirectory(baseDir);
  if (!srcDir) {
    console.log('No "src" directory found.');
    return;
  }

  const fileExtension = projectType === '.tsx' ? 'tsx' : 'jsx';
  const filePath = path.join(srcDir, `IterateUtil.${fileExtension}`);
  const jsContent = `
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

  const tsContent = `
  import React, { ComponentType, Component } from 'react';
import ReactDOM from 'react-dom';

interface CustomAttributes {
  [key: string]: string;
}

function IterateWrapper<T>(WrappedComponent: ComponentType<T>, customAttributes: CustomAttributes) {
  return class extends Component<T> {
    componentDidMount() {
      this.addAttributes();
    }

    componentDidUpdate() {
      this.addAttributes();
    }

    addAttributes() {
      const domNode = ReactDOM.findDOMNode(this) as HTMLElement | null;
      console.log('🎟', domNode);

      if (domNode) {
        this.addAttributesToDeepestIntrinsicElement(domNode);
      }
    }

    addAttributesToDeepestIntrinsicElement(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName) {
        Object.keys(customAttributes).forEach((attr) => {
          (node as HTMLElement).setAttribute(attr, customAttributes[attr]);
        });
      } else if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.forEach((childNode) => {
          this.addAttributesToDeepestIntrinsicElement(childNode);
        });
      }
    }

    render() {
      return <WrappedComponent {...this.props as T} />;
    }
  };
}

export default IterateWrapper;

  `;

  const fileContent = projectType === '.tsx' ? tsContent : jsContent;

  fs.writeFileSync(filePath, fileContent.trim());
  console.log(`Created: ${filePath}`);
}

// Example usage:
// createIterateUtilFile('./', 'ts'); // for TypeScript
// createIterateUtilFile('./', 'js'); // for JavaScript

module.exports = {
  findSrcDirectory,
  createIterateUtilFile,
};
