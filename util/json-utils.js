const fs = require('fs');

function createAndOrReadMapFile (path) {
  if (!fs.existsSync(path)) {
    console.log('Write fresh JSON map to', path);
    fs.writeFileSync(path, '{}');
  }
  console.log('Read JSON map from', path);
  return JSON.parse(fs.readFileSync(path));
}

function incrementOrInit (map, key) {
  if (key in map) return map[key] += 1;
  else map[key] = 1;
}

const writeJson = (path, obj) => (
  fs.writeFileSync(path, JSON.stringify(obj, null, '  '))
);

const appendJson = (path, obj) => (
  fs.appendFileSync(path, ',\n' + JSON.stringify(obj, null, '  '))
);

module.exports = {
  createAndOrReadMapFile,
  incrementOrInit,
  writeJson,
  appendJson
};
