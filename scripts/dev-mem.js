/* eslint-disable @typescript-eslint/no-var-requires */
const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');

async function start() {
  try {
    const mongod = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'cityfeed' }
    });
    const uri = mongod.getUri();

    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    process.env.PORT = process.env.PORT || '3001';
    process.env.MONGODB_URI = uri;
    process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
    process.env.FRONTEND_URL_ADMIN = process.env.FRONTEND_URL_ADMIN || 'http://localhost:5173';
    process.env.FRONTEND_URL_USER = process.env.FRONTEND_URL_USER || 'http://localhost:5173';

    // Optional services (left empty by default)
    process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
    process.env.SMTP_PORT = process.env.SMTP_PORT || '1025';
    process.env.SMTP_SECURE = process.env.SMTP_SECURE || 'false';
    process.env.SMTP_FROM = process.env.SMTP_FROM || 'dev@example.com';

    // Start compiled server
    // eslint-disable-next-line no-console
    console.log(`[dev-mem] Using in-memory MongoDB at: ${uri}`);
    // Require compiled server entry
    require(path.resolve(__dirname, '..', 'dist', 'server.js'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[dev-mem] Failed to start memory server or app:', err);
    process.exit(1);
  }
}

start();



