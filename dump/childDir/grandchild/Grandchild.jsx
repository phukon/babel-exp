import React from 'react';
import GreatGrandChild from '../../Gl/Fl/GreatGrandChild.jsx';
import { IterateWrapper } from "childDir\\grandchild\\Grandchild.jsx";
import { IterateWrapper } from "..\\..\\childDir\\grandchild\\Grandchild.jsx";
const Grandchild = () => {
  return <GreatGrandChild />;
};
export default Grandchild;