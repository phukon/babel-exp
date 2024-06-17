import React from 'react';
import Grandchild from './grandchild/Grandchild.jsx';
const Child = () => {
  return <Grandchild>
      <p>lol</p>
    </Grandchild>;
};
export default Child;