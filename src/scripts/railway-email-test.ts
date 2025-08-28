import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

// Load environment variables
dotenv.config();

async function testRailwayEmailConfiguration() {
  logger.info('=== Railway Email Configuration Test ===');
  
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
  
  // Test email transporter creation
  try {
    const testConfig = {
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      pool: false,
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    };
    
    const transporter = nodemailer.createTransport(testConfig);
    logger.info('✅ Email transporter created successfully');
    
    // Test transporter verification
    try {
      await transporter.verify();
      logger.info('✅ Email transporter verification successful');
    } catch (error) {
      logger.error('❌ Email transporter verification failed:', error.message);
    }
    
    // Test sending a simple email
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    logger.info(`Attempting to send test email to ${testEmail}...`);
    
    const result = await transporter.sendMail({
      from: config.email.from,
      to: testEmail,
      subject: 'Railway Email Test',
      text: 'This is a test email from Railway deployment.',
      html: '<h1>Railway Email Test</h1><p>This is a test email from Railway deployment.</p>'
    });
    
    logger.info('✅ Test email sent successfully:', { messageId: result.messageId });
    
  } catch (error) {
    logger.error('❌ Email transporter test failed:', error);
  }
}

// Run the test
testRailwayEmailConfiguration()
  .then(() => {
    logger.info('=== Railway Email Test Completed ===');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('=== Railway Email Test Failed ===', error);
    process.exit(1);
  });
