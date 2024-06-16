const path = require('path');

module.exports = function findSrc(filePath, target) {
  const currDir = path.dirname(filePath);
  const targetDir = path.join(currDir, target);
  return targetDir;
};
