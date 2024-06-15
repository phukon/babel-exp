import React from 'react';
const lol = () => {
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
export default lol;
