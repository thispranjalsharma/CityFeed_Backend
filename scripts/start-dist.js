/* Register module aliases for compiled code */
try {
  const moduleAlias = require('module-alias');
  const path = require('path');
  const distRoot = path.resolve(__dirname, '..', 'dist');
  moduleAlias.addAlias('src', distRoot);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[start-dist] module-alias not available:', e && e.message);
}

// Start the compiled server
require('../dist/server.js');



