import { EmailService } from '../services/email.service';
import { generateToken } from '../utils/jwt.util';

async function testStaffEmailVerification() {
  console.log('=== TESTING STAFF EMAIL VERIFICATION ===');
  
  try {
    const emailService = new EmailService();
    
    // Test email configuration
    console.log('1. Testing email service initialization...');
    
    // Generate a test token
    const testToken = generateToken({
      _id: 'test-staff-id',
      email: 'test@example.com',
      role: 'employee',
      type: 'employee'
    }, '24h');
    
    console.log('2. Test token generated:', testToken.substring(0, 20) + '...');
    
    // Test sending verification email
    console.log('3. Testing email sending...');
    await emailService.sendVerificationEmail('test@example.com', testToken, 'employee');
    
    console.log('✅ Email verification test completed successfully!');
  } catch (error) {
    console.error('❌ Email verification test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
testStaffEmailVerification().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
}); 