import React from 'react';
import Child from '../childDir/Child.jsx';
import Testchild from './Testchild.jsx';
const Lol = (product) => {
  return (
    <div>
      <Child
        onClick={() => {
          mixpanel.track('lol', {
            product: product.name,
            price: product.price,
            category: product.category,
          });
        }}
      />
      <Testchild
        onClick={() => {
          mixpanel.track('product_clicked', {
            product: product.name,
            price: product.price,
            category: product.category,
          });
        }}
      />
    </div>
  );
};
export default Lol;
