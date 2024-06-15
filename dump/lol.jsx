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
  return <div>lol</div>;
};
export default lol;
