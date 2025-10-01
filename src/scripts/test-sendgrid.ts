import { SendGridService } from '../services/sendgrid.service';
import { logger } from '../utils/logger.util';

async function testSendGrid() {
  logger.info('=== SendGrid Email Test ===');
  
  // Check if SendGrid API key is available
  if (!process.env.SENDGRID_API_KEY) {
    logger.error('SENDGRID_API_KEY environment variable not found');
    logger.info('Please set SENDGRID_API_KEY in your environment variables');
    return;
  }
  
  logger.info('✅ SendGrid API key found');
  
  try {
    const sendGridService = SendGridService.getInstance();
    logger.info('✅ SendGrid service initialized successfully');
    
    // Test email
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    logger.info(`Testing email send to ${testEmail}...`);
    
    await sendGridService.sendMail({
      to: testEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cityfeed.com',
      subject: 'SendGrid Test Email',
      html: `
        <h1>SendGrid Test Email</h1>
        <p>This is a test email sent via SendGrid from CityFeed backend.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>If you receive this email, SendGrid is working correctly!</p>
      `
    });
    
    logger.info('✅ SendGrid test email sent successfully');
    
    // Test OTP email
    logger.info('Testing OTP email...');
    await sendGridService.sendOTPEmail(testEmail, '123456', 'event_cancellation');
    logger.info('✅ SendGrid OTP email sent successfully');
    
  } catch (error: any) {
    logger.error('❌ SendGrid test failed:', {
      error: error.message,
      code: error.code,
      response: error.response?.body
    });
  }
  
  logger.info('=== SendGrid Test Complete ===');
}

// Run the test
testSendGrid()
  .then(() => {
    logger.info('SendGrid test completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('SendGrid test failed:', error);
    process.exit(1);
  });
