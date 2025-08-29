import dotenv from 'dotenv';
import { swaggerSpec } from '../config/swagger';

// Load environment variables
dotenv.config();

console.log('=== Swagger Configuration Test ===\n');

console.log('Environment Information:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- BASE_URL:', process.env.BASE_URL || 'not set');
console.log('- RAILWAY_URL:', process.env.RAILWAY_URL || 'not set');

console.log('\nSwagger Servers Configuration:');
const swaggerSpecAny = swaggerSpec as any;
if (swaggerSpecAny.servers) {
  swaggerSpecAny.servers.forEach((server: any, index: number) => {
    console.log(`${index + 1}. ${server.description}: ${server.url}`);
  });
} else {
  console.log('No servers configured in Swagger spec');
}

console.log('\nExpected Behavior:');
console.log('- Local development: Should show localhost:3001');
console.log('- Production: Should show both localhost:3001 and production URL');
console.log('- Production URL should be from BASE_URL or RAILWAY_URL environment variable');

console.log('\nTo test in production:');
console.log('1. Set NODE_ENV=production');
console.log('2. Set BASE_URL=https://your-railway-app.railway.app');
console.log('3. Restart the server');
console.log('4. Visit /api-docs to see both server options');
