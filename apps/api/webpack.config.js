// Custom NestJS webpack config.
// The workspace packages (@ellixr/*) export TypeScript source, so they must be
// BUNDLED into dist/main.js. Everything else in node_modules (bcrypt, @prisma/client,
// nest internals, node builtins) stays external and is required at runtime.
const path = require('path');

module.exports = (options) => ({
  ...options,
  externals: [
    function ({ request }, callback) {
      // Bundle our own workspace packages and any relative/absolute import.
      if (
        request.startsWith('@ellixr/') ||
        request.startsWith('.') ||
        path.isAbsolute(request)
      ) {
        return callback();
      }
      // Keep all other bare module specifiers (node_modules + builtins) external.
      return callback(null, 'commonjs ' + request);
    },
  ],
});
