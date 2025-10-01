import { SendGridService } from '../services/sendgrid.service';
import { logger } from '../utils/logger.util';

async function testEmailConfiguration() {
  const sendGridService = SendGridService.getInstance();
  
  try {
    logger.info('Testing email configuration...');
    
    // Test basic email sending
    await sendGridService.sendVerificationEmail(
      'test@example.com',
      'test-token-123',
      'user'
    );
    
    logger.info('Email configuration test completed successfully');
  } catch (error) {
    logger.error('Email configuration test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEmailConfiguration()
    .then(() => {
      logger.info('Email test completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Email test failed:', error);
      process.exit(1);
    });
}

export { testEmailConfiguration };
