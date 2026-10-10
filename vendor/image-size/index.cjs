const { readFileSync } = require('node:fs');
const patched = require('image-size-patched');

// Metro 0.83 still passes file paths to the former synchronous image-size API.
function imageSize(input) {
  return patched.imageSize(typeof input === 'string' ? readFileSync(input) : input);
}

module.exports = Object.assign(imageSize, patched, { default: imageSize, imageSize });
