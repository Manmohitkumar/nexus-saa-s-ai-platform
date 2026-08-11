// Vercel serverless handler. Runs the compiled Nest app (dist/serverless.js)
// from the backend build. All routes are proxied to the same handler by
// vercel.json rewrites.
const { default: handler } = require('../dist/src/serverless.js');

module.exports = handler;
