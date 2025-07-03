import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Check required environment variables
const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'NODE_ENV',
  'FRONTEND_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}

// Create upload directory if it doesn't exist
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create dist/uploads directory if it doesn't exist (for production)
const distUploadDir = path.resolve(process.cwd(), 'dist', 'uploads');
if (!fs.existsSync(distUploadDir)) {
  fs.mkdirSync(distUploadDir, { recursive: true });
}

// Log the frontend URL for debugging
console.log('Environment:', process.env.NODE_ENV);
console.log('FRONTEND_URL from env:', process.env.FRONTEND_URL);

// Get frontend URL based on environment
const frontendUrl = process.env.FRONTEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-production-frontend-url.com' 
    : 'http://localhost:5173');

console.log('Using frontend URL:', frontendUrl);

// Add role-based frontend URLs
const frontendUrls = {
  super_admin: 'https://cityfeed-admin.vercel.app',
  outlet_admin: 'https://cityfeed-admin.vercel.app',
  employee: 'https://cityfeed-admin.vercel.app',
  user: 'https://cityfeed-club.vercel.app',
};

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cityfeed',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadDir: process.env.NODE_ENV === 'production' ? distUploadDir : uploadDir,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  frontendUrl,
  frontendUrls,
  isProduction: process.env.NODE_ENV === 'production',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_USER
  }
}; 