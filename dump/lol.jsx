import IterateWrapper from "..\\src\\IterateUtil";
const IteratePolyProd = IterateWrapper(PolyProd, {
  dataiterate: "eyJldmVudHMiOltbeyJuYW1lIjoicHJvZHVjdF9jbGlja2VkIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV1dLCJmaWxlUGF0aCI6ImR1bXBcXGxvbC5qc3gifQ=="
});
const IterateProduct = IterateWrapper(Product, {
  dataiterate: "eyJldmVudHMiOltbeyJuYW1lIjoicHJvZHVjdF9jbGlja2VkIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV1dLCJmaWxlUGF0aCI6ImR1bXBcXGxvbC5qc3gifQ=="
});
const Lol = () => {
  return <div>
      <IterateProduct onClick={() => {
      mixpanel.track('product_clicked', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} />
      <IteratePolyProd onClick={() => {
      mixpanel.track('product_clicked', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} />
      <div onClick={() => {
      mixpanel.track('product_clicked', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} injected_events="W3sibmFtZSI6InByb2R1Y3RfY2xpY2tlZCIsImF0dHJpYnV0ZXMiOnsicHJvZHVjdCI6Ik1lbWJlckV4cHJlc3Npb24iLCJwcmljZSI6Ik1lbWJlckV4cHJlc3Npb24iLCJjYXRlZ29yeSI6Ik1lbWJlckV4cHJlc3Npb24ifX1d" />
    </div>;
};
export default Lol;