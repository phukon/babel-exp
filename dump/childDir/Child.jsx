import React from 'react';
import Grandchild from './grandchild/Grandchild.jsx';
import { IterateWrapper } from "childDir\\Child.jsx";
import { IterateWrapper } from "..\\..\\childDir\\Child.jsx";
const Child = () => {
  return <Grandchild />;
};
export default Child;