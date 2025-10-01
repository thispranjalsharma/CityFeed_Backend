import { SendGridService } from '../services/sendgrid.service';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

async function railwayEmailDiagnostic() {
  logger.info('=== Railway Email Diagnostic Tool ===');
  
  // Check environment variables
  logger.info('Checking environment variables...');
  const requiredVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', missingVars);
    return;
  }
  
  logger.info('✅ All required environment variables are set');
  logger.info('SendGrid configuration:', {
    apiKey: process.env.SENDGRID_API_KEY ? '***' + process.env.SENDGRID_API_KEY.slice(-4) : 'not set',
    fromEmail: process.env.SENDGRID_FROM_EMAIL
  });

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
  
  logger.info('=== Railway Email Diagnostic Completed ===');
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