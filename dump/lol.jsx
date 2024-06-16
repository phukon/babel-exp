import React from 'react';
import Product from './Product';

const Lol = () => {
  return (
    <div>
      <Product
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
