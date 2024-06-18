function isReactComponent(path) {

  let isComponent = false;
  const name = path.node.name;

  if (name?.type === 'JSXIdentifier') {
    // console.log('♻ inside ')
    const tagName = name.name;
    if (tagName[0] === tagName[0].toUpperCase()) {
      console.log('Component: ', tagName);
      isComponent = true;
    } else {
      console.error('No name found!');
    }
  } else {
    console.error("Can't traverse tree!");
  }
  return isComponent;
}

module.exports = isReactComponent;
