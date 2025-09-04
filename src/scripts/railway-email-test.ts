import dotenv from 'dotenv';
import { SendGridService } from '../services/sendgrid.service';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

// Load environment variables
dotenv.config();

async function testRailwayEmailConfiguration() {
  logger.info('=== Railway SendGrid Configuration Test ===');
  
  // Check environment variables
  const requiredVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return;
  }
  
  logger.info('✅ All required environment variables are set');
  
  // Log configuration (without sensitive data)
  logger.info('SendGrid Configuration:');
  logger.info('- API Key:', process.env.SENDGRID_API_KEY ? `***${process.env.SENDGRID_API_KEY.slice(-4)}` : 'NOT SET');
  logger.info('- From Email:', process.env.SENDGRID_FROM_EMAIL);
  
  // Test SendGrid service
  try {
    logger.info('Testing SendGrid service initialization...');
    const sendGridService = SendGridService.getInstance();
    logger.info('✅ SendGrid service initialized successfully');
    
    // Test sending a simple email
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    logger.info(`Testing email sending to ${testEmail}...`);
    
    await sendGridService.sendMail({
      to: testEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Railway SendGrid Test',
      html: `
        <h1>Railway SendGrid Test</h1>
        <p>This is a test email sent from Railway deployment using SendGrid.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>If you receive this email, SendGrid is working correctly on Railway!</p>
      `
    });
    
    logger.info('✅ SendGrid test email sent successfully');
    
    // Test OTP email
    logger.info('Testing OTP email functionality...');
    await sendGridService.sendOTPEmail(testEmail, '123456', 'event_cancellation');
    logger.info('✅ SendGrid OTP email sent successfully');
    
  } catch (error: any) {
    logger.error('❌ SendGrid test failed:', {
      error: error.message,
      code: error.code,
      response: error.response?.body
    });
  }
  
  logger.info('=== Railway SendGrid Test Completed ===');
}

// Run the test
testRailwayEmailConfiguration()
  .then(() => {
    logger.info('Railway email test completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Railway email test failed:', error);
    process.exit(1);
  });