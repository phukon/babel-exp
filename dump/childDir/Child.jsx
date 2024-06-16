import { IterateContext } from 'C:\\Users\\rikip\\Desktop\\EXIM\\Work\\iterate-ai\\babel-exp\\dump\\lol.jsx';
import { useContext } from 'react';
import { useContext } from 'react';
import React from 'react';
const { iterateId, iterateInjectedEvents } = useContext(IterateContext);
export const IterateProvider = (children) => {
  const iterateId = 'iterateId',
    iterateAttribute = 'iterateAttribute';
  return (
    <IterateContext.Provider
      value={{
        iterateId: iterateId,
        iterateAttribute: iterateAttribute,
      }}
      data-iterateid="value"
      data-iterateinjectedevents="value"
    >
      {children}
    </IterateContext.Provider>
  );
};
const Child = () => {
  return (
    <div data-iterateid="value" data-iterateinjectedevents="value">
      <p>lol</p>
    </div>
  );
};
export default Child;
