import { createContext } from 'react';
import React from 'react';
export const IterateContext = createContext(null);
export const IterateProvider = (children) => {
  const iterateId = 'lol1',
    iterateAttribute = 'lol2';
  return (
    <IterateContext.Provider
      value={{
        iterateId: iterateId,
        iterateAttribute: iterateAttribute,
      }}
    >
      {children}
    </IterateContext.Provider>
  );
};
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
        injected_events="W3sibmFtZSI6InByb2R1Y3RfY2xpY2tlZCIsImF0dHJpYnV0ZXMiOnsicHJvZHVjdCI6Ik1lbWJlckV4cHJlc3Npb24iLCJwcmljZSI6Ik1lbWJlckV4cHJlc3Npb24iLCJjYXRlZ29yeSI6Ik1lbWJlckV4cHJlc3Npb24ifX1d"
      />
    </div>
  );
};
export default lol;
