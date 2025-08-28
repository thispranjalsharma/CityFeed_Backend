import { Router } from 'express';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger.util';

const router = Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Email test endpoint for Railway debugging
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email address is required' 
      });
    }

    logger.info(`Testing email functionality for ${email}`);
    
    const emailService = EmailService.getInstance();
    
    // Test sending a simple email
    await emailService.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Railway Email Test',
      text: 'This is a test email from Railway deployment.',
      html: '<h1>Railway Email Test</h1><p>This is a test email from Railway deployment.</p>'
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully' 
    });
    
  } catch (error) {
    logger.error('Email test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email test failed',
      error: error.message 
    });
  }
});

export default router;
