import { config } from '../config/config';

const requiredEmailVars = [
  'SMTP_HOST',
  'SMTP_PORT', 
  'SMTP_USER',
  'SMTP_PASS'
];

requiredEmailVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('PASS') ? '***SET***' : value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\nEmail configuration from config:');
console.log('Host:', config.email.host);
console.log('Port:', config.email.port);
console.log('Secure:', config.email.secure);
console.log('User:', config.email.user);
console.log('From:', config.email.from);

console.log('\nFrontend URLs:');
console.log('Employee URL:', config.frontendUrls.employee);
console.log('Default URL:', config.frontendUrl); 