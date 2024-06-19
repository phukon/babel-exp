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