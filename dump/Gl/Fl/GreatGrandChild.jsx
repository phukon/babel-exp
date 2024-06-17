import { IterateContext } from "dump\\Product.jsx";
import { useContext } from "react";
import { IterateContext } from "C:\\Users\\rikip\\Desktop\\EXIM\\Work\\iterate-ai\\babel-exp\\dump\\lol.jsx";
import { useContext } from "react";
import React from 'react';
const GreatGrandChild = () => {
  const {
    iterateId,
    iterateInjectedEvents
  } = useContext(IterateContext);
  return <div data-iterateid={iterateId} data-iterateinjectedevents={iterateInjectedEvents}>
      GreatGrandChild
    </div>;
};
export default GreatGrandChild;