import React from 'react';
import Child from '../childDir/Child.js';
import Testchild from './Testchild.js';
let flag = true;

const Lol = (product) => {
  return (
    <div>
      {flag && (
        <Child
          onClick={() => {
            mixpanel.track('lol', {
              product: product.name,
              price: product.price,
              category: product.category,
            });
          }}
        />
      )}
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
