// React Navigation 6's query-string consumer requires a synchronous CJS function.
const patched = require('decode-uri-component-patched');
module.exports = patched.default || patched;
