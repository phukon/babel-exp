import { createContext } from "react";
import React from 'react';
import Product from './Product';
export const IterateContext = createContext(null);
export const IterateProvider = children => {
  const iterateId = "W3sibmFtZSI6InByb2R1Y3RfY2xpY2tlZCIsImF0dHJpYnV0ZXMiOnsicHJvZHVjdCI6Ik1lbWJlckV4cHJlc3Npb24iLCJwcmljZSI6Ik1lbWJlckV4cHJlc3Npb24iLCJjYXRlZ29yeSI6Ik1lbWJlckV4cHJlc3Npb24ifX1d",
    iterateAttribute = "lol";
  return <IterateContext.Provider value={{
    iterateId: iterateId,
    iterateAttribute: iterateAttribute
  }}>{children}</IterateContext.Provider>;
};
const Lol = () => {
  return <div>
      <IterateProvider><Product onClick={() => {
      mixpanel.track('product_clicked', {
        product: product.name,
        price: product.price,
        category: product.category
      });
    }} /></IterateProvider>
    </div>;
};
export default Lol;