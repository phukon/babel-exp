import React from 'react';
import Child from '../childDir/Child.jsx';
import Testchild from './Testchild.jsx';
const Lol = product => {
  return <div>
      <Child onClick={() => {
      mixpanel.track('product_clicked', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} injected_events="W3sibmFtZSI6InByb2R1Y3RfY2xpY2tlZCIsImF0dHJpYnV0ZXMiOnsicHJvZHVjdCI6Ik1lbWJlckV4cHJlc3Npb24iLCJwcmljZSI6Ik1lbWJlckV4cHJlc3Npb24iLCJjYXRlZ29yeSI6Ik1lbWJlckV4cHJlc3Npb24ifX0seyJuYW1lIjoicHJvZHVjdF9jbGlja2VkIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV0=" />
      <Testchild onClick={() => {
      mixpanel.track('product_clicked', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} injected_events="W3sibmFtZSI6InByb2R1Y3RfY2xpY2tlZCIsImF0dHJpYnV0ZXMiOnsicHJvZHVjdCI6Ik1lbWJlckV4cHJlc3Npb24iLCJwcmljZSI6Ik1lbWJlckV4cHJlc3Npb24iLCJjYXRlZ29yeSI6Ik1lbWJlckV4cHJlc3Npb24ifX0seyJuYW1lIjoicHJvZHVjdF9jbGlja2VkIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV0=" />
    </div>;
};
export default Lol;