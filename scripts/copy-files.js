const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Create uploads directory in dist
if (!fs.existsSync('dist/uploads')) {
  fs.mkdirSync('dist/uploads', { recursive: true });
}

// Copy .env file if it exists
if (fs.existsSync('.env')) {
  fs.copyFileSync('.env', 'dist/.env');
}

// Copy prisma directory if it exists
if (fs.existsSync('prisma')) {
  if (!fs.existsSync('dist/prisma')) {
    fs.mkdirSync('dist/prisma', { recursive: true });
  }
  fs.readdirSync('prisma').forEach(file => {
    fs.copyFileSync(
      path.join('prisma', file),
      path.join('dist/prisma', file)
    );
  });
}

// Copy uploads directory if it exists
if (fs.existsSync('uploads')) {
  if (!fs.existsSync('dist/uploads')) {
    fs.mkdirSync('dist/uploads', { recursive: true });
  }
  fs.readdirSync('uploads').forEach(file => {
    fs.copyFileSync(
      path.join('uploads', file),
      path.join('dist/uploads', file)
    );
  });
}

// Copy package.json to dist
fs.copyFileSync('package.json', 'dist/package.json');

console.log('Files copied successfully!'); 