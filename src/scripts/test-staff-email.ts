import { SendGridService } from '../services/sendgrid.service';
import { generateToken } from '../utils/jwt.util';

async function testStaffEmailVerification() {
  
  try {
    const sendGridService = SendGridService.getInstance();
    
    // Test email configuration
    
    // Generate a test token
    const testToken = generateToken({
      _id: 'test-staff-id',
      email: 'test@example.com',
      role: 'employee',
      type: 'employee'
    }, '24h');
    
    
    // Test sending verification email
    
    await sendGridService.sendVerificationEmail('test@example.com', testToken, 'employee');
    
    
  } catch (error) {
    
  }
}

// Run the test
testStaffEmailVerification().then(() => {
  process.exit(0);
}).catch((error) => {
  process.exit(1);
}); 