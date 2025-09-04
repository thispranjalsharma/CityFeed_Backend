import dotenv from 'dotenv';
import { SendGridService } from '../services/sendgrid.service';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

// Load environment variables
dotenv.config();

async function railwayDebug() {
  logger.info('=== Railway Debug Information ===');
  
  // 1. Environment Information
  logger.info('Environment Information:');
  logger.info('- NODE_ENV:', process.env.NODE_ENV);
  logger.info('- Platform:', process.platform);
  logger.info('- Node Version:', process.version);
  logger.info('- Current Directory:', process.cwd());
  
  // 2. SendGrid Configuration Check
  logger.info('\nSendGrid Configuration:');
  const sendGridVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
  sendGridVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      if (varName.includes('API_KEY')) {
        logger.info(`- ${varName}: ***SET*** (${value.length} chars)`);
      } else {
        logger.info(`- ${varName}: ${value}`);
      }
    } else {
      logger.error(`- ${varName}: NOT SET`);
    }
  });
  
  // 3. Network Information
  logger.info('\nNetwork Information:');
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    logger.info('- Hostname:', os.hostname());
    logger.info('- Network Interfaces:', Object.keys(interfaces));
  } catch (error) {
    logger.error('- Could not get network info:', error.message);
  }
  
  // 4. DNS Resolution Test
  logger.info('\nDNS Resolution Test:');
  try {
    const dns = require('dns').promises;
    const addresses = await dns.resolve4(config.email.host);
    logger.info(`✅ DNS resolution for ${config.email.host}:`, addresses);
  } catch (error) {
    logger.error(`❌ DNS resolution failed for ${config.email.host}:`, error.message);
  }
  
  // 5. Port Availability Test
  logger.info('\nPort Availability Test:');
  const testPorts = [587, 465, 25];
  for (const port of testPorts) {
    try {
      const net = require('net');
      const socket = new net.Socket();
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error('Connection timeout'));
        }, 5000);
        
        socket.connect(port, config.email.host, () => {
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
      logger.info(`✅ Port ${port} is accessible`);
    } catch (error) {
      logger.error(`❌ Port ${port} failed:`, error.message);
    }
  }
  
  // 6. SendGrid Service Test
  logger.info('\nSendGrid Service Test:');
  
  try {
    const sendGridService = SendGridService.getInstance();
    logger.info('✅ SendGrid service initialized successfully');
    
    // Test sending a simple email
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    logger.info(`Testing email sending to ${testEmail}...`);
    
    await sendGridService.sendMail({
      to: testEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Railway Debug Test - SendGrid',
      html: `
        <h1>Railway Debug Test</h1>
        <p>This is a test email sent from Railway deployment using SendGrid.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });
    
    logger.info('✅ SendGrid test email sent successfully');
    
  } catch (error: any) {
    logger.error('❌ SendGrid test failed:', {
      error: error.message,
      code: error.code,
      response: error.response?.body
    });
  }
  
  // 7. Memory and Performance Info
  logger.info('\nSystem Information:');
  try {
    const memUsage = process.memoryUsage();
    logger.info('- Memory Usage:');
    logger.info('  - RSS:', Math.round(memUsage.rss / 1024 / 1024), 'MB');
    logger.info('  - Heap Used:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');
    logger.info('  - Heap Total:', Math.round(memUsage.heapTotal / 1024 / 1024), 'MB');
  } catch (error) {
    logger.error('- Could not get memory info:', error.message);
  }
  
  logger.info('\n=== Railway Debug Completed ===');
}

// Run the debug
railwayDebug()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Railway debug failed:', error);
    process.exit(1);
  });
