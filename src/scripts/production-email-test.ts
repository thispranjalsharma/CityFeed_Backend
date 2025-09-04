import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

// Load environment variables
dotenv.config();

async function testProductionEmailConfiguration() {
  logger.info('=== Production Email Configuration Test ===');
  
  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return;
  }
  
  logger.info('✅ All required environment variables are set');
  
  // Log configuration (without sensitive data)
  logger.info('Email Configuration:');
  logger.info('- Host:', config.email.host);
  logger.info('- Port:', config.email.port);
  logger.info('- Secure:', config.email.secure);
  logger.info('- User:', config.email.user ? `${config.email.user.substring(0, 3)}***` : 'NOT SET');
  logger.info('- From:', config.email.from);
  
  // Test DNS resolution
  try {
    const dns = require('dns').promises;
    const addresses = await dns.resolve4(config.email.host);
    logger.info(`✅ DNS resolution successful for ${config.email.host}:`, addresses);
  } catch (error) {
    logger.error(`❌ DNS resolution failed for ${config.email.host}:`, error.message);
  }
  
  // Test network connectivity
  try {
    const net = require('net');
    const socket = new net.Socket();
    
    const connectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }, 10000);
      
      socket.connect(config.email.port, config.email.host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve('Connected');
      });
      
      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    await connectionPromise;
    logger.info(`✅ Network connectivity test successful to ${config.email.host}:${config.email.port}`);
  } catch (error) {
    logger.error(`❌ Network connectivity test failed to ${config.email.host}:${config.email.port}:`, error.message);
  }
  
  // Test email service
  try {
    const sendGridService = require('../services/sendgrid.service').SendGridService.getInstance();
    logger.info('✅ Email service initialized successfully');
    
    // Test sending a simple email
    const testEmail = 'test@example.com';
    logger.info(`Testing email sending to ${testEmail}...`);
    
    await sendGridService.sendVerificationEmail(testEmail, 'test-token-123', 'user');
    logger.info('✅ Test email sent successfully');
    
  } catch (error) {
    logger.error('❌ Email service test failed:', error.message);
    logger.error('Full error:', error);
  }
  
  logger.info('=== Production Email Test Completed ===');
}

// Run the test
testProductionEmailConfiguration()
  .then(() => {
    logger.info('Production email test completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Production email test failed:', error);
    process.exit(1);
  });

