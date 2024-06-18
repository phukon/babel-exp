import React from 'react';
import ReactDOM from 'react-dom';
import { IterateWrapper } from "test\\CutomElement.jsx";
import { IterateWrapper } from "..\\..\\test\\CutomElement.jsx";
const withCustomAttributes = (WrappedComponent, customAttributes) => {
  return class extends React.Component {
    componentDidMount() {
      this.addAttributes();
    }
    componentDidUpdate() {
      this.addAttributes();
    }
    addAttributes() {
      // Get the top-level DOM node of the wrapped component
      const domNode = ReactDOM.findDOMNode(this);
      if (domNode) {
        // Recursively find the deepest intrinsic element
        this.addAttributesToDeepestIntrinsicElement(domNode);
      }
    }
    addAttributesToDeepestIntrinsicElement(node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName) {
        // If it's an intrinsic element, add the custom attributes
        Object.keys(customAttributes).forEach(attr => {
          node.setAttribute(attr, customAttributes[attr]);
        });
      } else if (node.childNodes && node.childNodes.length > 0) {
        // Recursively process child nodes
        node.childNodes.forEach(childNode => {
          this.addAttributesToDeepestIntrinsicElement(childNode);
        });
      }
    }
    render() {
      // Render the wrapped component
      return <WrappedComponent {...this.props} />;
    }
  };
};
export default EnhancedComponent;