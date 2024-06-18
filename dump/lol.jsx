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
      <PolyProd
        onClick={() => {
          mixpanel.track('product_clicked', {
            product: product.name,
            price: product.price,
            category: product.category,
          });
        }}
      />
      <div
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
