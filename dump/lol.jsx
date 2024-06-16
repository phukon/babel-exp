import React from 'react';
import Product from './Product.jsx';

const Lol = () => {
  return (
    <Product
      onClick={() => {
        mixpanel.track('product_clicked', {
          product: product.name,
          price: product.price,
          category: product.category,
        });
      }}
    />
  );
};
export default Lol;
