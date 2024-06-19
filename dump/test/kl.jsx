import React from 'react';
import Child from '../childDir/Child.js';
import Testchild from './Testchild.js';
import IterateWrapper from "..\\..\\src\\IterateUtil";
const IterateIterateTestchild = IterateWrapper(IterateTestchild, {
  dataiterate: "eyJldmVudHMiOltbeyJuYW1lIjoicHJvZHVjdF9jbGlja2VkIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV1dLCJmaWxlUGF0aCI6ImR1bXBcXHRlc3RcXGtsLmpzeCJ9"
});
const IterateIterateChild = IterateWrapper(IterateChild, {
  dataiterate: "eyJldmVudHMiOltbeyJuYW1lIjoibG9sIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV1dLCJmaWxlUGF0aCI6ImR1bXBcXHRlc3RcXGtsLmpzeCJ9"
});
const IterateTestchild = IterateWrapper(Testchild, {
  dataiterate: "eyJldmVudHMiOltbeyJuYW1lIjoicHJvZHVjdF9jbGlja2VkIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV1dLCJmaWxlUGF0aCI6ImR1bXBcXHRlc3RcXGtsLmpzeCJ9"
});
const IterateChild = IterateWrapper(Child, {
  dataiterate: "eyJldmVudHMiOltbeyJuYW1lIjoibG9sIiwiYXR0cmlidXRlcyI6eyJwcm9kdWN0IjoiTWVtYmVyRXhwcmVzc2lvbiIsInByaWNlIjoiTWVtYmVyRXhwcmVzc2lvbiIsImNhdGVnb3J5IjoiTWVtYmVyRXhwcmVzc2lvbiJ9fV1dLCJmaWxlUGF0aCI6ImR1bXBcXHRlc3RcXGtsLmpzeCJ9"
});
let flag = true;
const Lol = product => {
  return <div>
      {flag && <IterateIterateChild onClick={() => {
      mixpanel.track('lol', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} />}
      <IterateIterateTestchild onClick={() => {
      mixpanel.track('product_clicked', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} />
    </div>;
};
export default Lol;