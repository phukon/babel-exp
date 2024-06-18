import React from 'react';
import Child from './childDir/Child.jsx';
import { IterateWrapper } from "Product.jsx";
import { IterateWrapper } from "..\\..\\Product.jsx";
const Product = () => {
  return <Child />;
};
export default Product;