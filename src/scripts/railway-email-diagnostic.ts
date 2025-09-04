import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

async function railwayEmailDiagnostic() {
  logger.info('=== Railway Email Diagnostic Tool ===');
  
  // Check environment variables
  logger.info('Checking environment variables...');
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', missingVars);
    return;
  }
  
  logger.info('✅ All required environment variables are set');
  logger.info('Email configuration:', {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    user: config.email.user ? `${config.email.user.substring(0, 3)}***` : 'not set',
    from: config.email.from
  });

  // Test different SMTP configurations
  const configurations = [
    {
      name: 'Current Configuration',
      config: {
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        pool: false,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        keepAlive: false
      }
    },
    {
      name: 'SendGrid Configuration',
      config: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY || 'your-sendgrid-api-key'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        pool: false,
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'Gmail Alternative Port',
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        pool: false,
        tls: {
          rejectUnauthorized: false
        }
      }
    }
  ];

  for (const { name, config: smtpConfig } of configurations) {
    logger.info(`\n--- Testing ${name} ---`);
    
    try {
      const transporter = nodemailer.createTransporter(smtpConfig);
      
      // Test connection
      logger.info('Testing SMTP connection...');
      await transporter.verify();
      logger.info(`✅ ${name} - Connection successful`);
      
      // Test sending email
      const testEmail = process.env.TEST_EMAIL || 'test@example.com';
      logger.info(`Testing email send to ${testEmail}...`);
      
      const result = await transporter.sendMail({
        from: config.email.from,
        to: testEmail,
        subject: `Railway Email Test - ${name}`,
        text: `This is a test email from Railway using ${name} configuration.`,
        html: `
          <h1>Railway Email Test</h1>
          <p>This is a test email from Railway using <strong>${name}</strong> configuration.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `
      });
      
      logger.info(`✅ ${name} - Email sent successfully:`, { messageId: result.messageId });
      
    } catch (error: any) {
      logger.error(`❌ ${name} - Failed:`, {
        error: error.message,
        code: error.code,
        command: error.command
      });
    }
  }

  // Network connectivity test
  logger.info('\n--- Network Connectivity Test ---');
  try {
    const dns = require('dns');
    const { promisify } = require('util');
    const resolve4 = promisify(dns.resolve4);
    
    const hosts = ['smtp.gmail.com', 'smtp.sendgrid.net', 'smtp.mailgun.org'];
    
    for (const host of hosts) {
      try {
        const addresses = await resolve4(host);
        logger.info(`✅ DNS resolution for ${host}:`, addresses);
      } catch (error) {
        logger.error(`❌ DNS resolution failed for ${host}:`, error.message);
      }
    }
  } catch (error) {
    logger.error('DNS test failed:', error);
  }

  logger.info('\n=== Diagnostic Complete ===');
}

// Run the diagnostic
railwayEmailDiagnostic()
  .then(() => {
    logger.info('Railway email diagnostic completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Railway email diagnostic failed:', error);
    process.exit(1);
  });
