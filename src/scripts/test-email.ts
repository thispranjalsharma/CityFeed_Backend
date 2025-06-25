import dotenv from 'dotenv';
import { EmailService } from '../services/email.service';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

// Load environment variables
dotenv.config();

async function testEmailConfiguration() {
  logger.info('Testing email configuration...');
  
  // Log configuration (without sensitive data)
  logger.info('Email Configuration:');
  logger.info('- Host:', config.email.host);
  logger.info('- Port:', config.email.port);
  logger.info('- Secure:', config.email.secure);
  logger.info('- User:', config.email.user);
  logger.info('- From:', config.email.from);
  logger.info('- Frontend URL:', config.frontendUrl);
  
  try {
    const emailService = new EmailService();
    logger.info('✅ Email service initialized successfully');
    
    // Test sending a verification email
    const testEmail = 'test@example.com';
    const testToken = 'test-token-123';
    const testRole = 'user';
    
    logger.info(`Testing email sending to ${testEmail}...`);
    await emailService.sendVerificationEmail(testEmail, testToken, testRole);
    logger.info('✅ Test email sent successfully');
    
  } catch (error) {
    logger.error('❌ Email configuration test failed:', error.message);
    logger.error('Please check your SMTP configuration in the .env file');
  }
}

// Run the test
testEmailConfiguration().catch(console.error); 