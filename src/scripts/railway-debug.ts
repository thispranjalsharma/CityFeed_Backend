import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
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
  
  // 2. Email Configuration Check
  logger.info('\nEmail Configuration:');
  const emailVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE'];
  emailVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      if (varName.includes('PASS')) {
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
  
  // 6. Email Transporter Test with Different Configurations
  logger.info('\nEmail Transporter Tests:');
  
  const testConfigs = [
    {
      name: 'Primary Config (Railway Optimized)',
      config: {
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
        }
      }
    },
    {
      name: 'Gmail Service Config',
      config: {
        service: 'gmail',
        auth: {
          user: config.email.user,
          pass: config.email.pass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        pool: false
      }
    },
    {
      name: 'Minimal Config',
      config: {
        host: config.email.host,
        port: config.email.port,
        secure: false,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        }
      }
    }
  ];
  
  for (const testConfig of testConfigs) {
    try {
      logger.info(`Testing ${testConfig.name}...`);
      const transporter = nodemailer.createTransport(testConfig.config);
      
      // Test verification
      await transporter.verify();
      logger.info(`✅ ${testConfig.name} - Verification successful`);
      
      // Test sending (optional)
      if (process.env.TEST_EMAIL) {
        const result = await transporter.sendMail({
          from: config.email.from,
          to: process.env.TEST_EMAIL,
          subject: `Railway Debug Test - ${testConfig.name}`,
          text: `This is a test from ${testConfig.name}`
        });
        logger.info(`✅ ${testConfig.name} - Email sent successfully:`, result.messageId);
      }
      
    } catch (error) {
      logger.error(`❌ ${testConfig.name} failed:`, error.message);
    }
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
