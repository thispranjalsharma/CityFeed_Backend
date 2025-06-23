import { Router } from 'express';
import { 
  registerOutletAdmin, 
  loginOutletAdmin, 
  verifyOutletAdminEmail, 
  resendVerificationEmail 
} from '../controllers/outletAdmin.controller';

const router = Router();

// Register new outlet admin
router.post('/register', registerOutletAdmin);

// Login outlet admin
router.post('/login', loginOutletAdmin);

// Verify email
router.get('/verify-email/:token', verifyOutletAdminEmail);

// Resend verification email
router.post('/resend-verification', resendVerificationEmail);

export default router; 