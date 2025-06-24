import dotenv from 'dotenv';
import { EmailService } from '../services/email.service';
import { config } from '../config/config';

// Load environment variables
dotenv.config();

async function testEmailConfiguration() {
  console.log('Testing email configuration...');
  
  // Log configuration (without sensitive data)
  console.log('Email Configuration:');
  console.log('- Host:', config.email.host);
  console.log('- Port:', config.email.port);
  console.log('- Secure:', config.email.secure);
  console.log('- User:', config.email.user);
  console.log('- From:', config.email.from);
  console.log('- Frontend URL:', config.frontendUrl);
  
  try {
    const emailService = new EmailService();
    console.log('✅ Email service initialized successfully');
    
    // Test sending a verification email
    const testEmail = 'test@example.com';
    const testToken = 'test-token-123';
    const testRole = 'user';
    
    console.log(`Testing email sending to ${testEmail}...`);
    await emailService.sendVerificationEmail(testEmail, testToken, testRole);
    console.log('✅ Test email sent successfully');
    
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    console.error('Please check your SMTP configuration in the .env file');
  }
}

// Run the test
testEmailConfiguration().catch(console.error); 