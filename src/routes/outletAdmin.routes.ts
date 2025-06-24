import { Router } from 'express';
import { 
  verifyOutletAdminEmail, 
  resendVerificationEmail 
} from '../controllers/outletAdmin.controller';

const router = Router();

/**
 * @swagger
 * /api/outlet-admin/verify-email/{token}:
 *   get:
 *     tags: [OutletAdmin]
 *     summary: Verify outlet admin email
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get('/verify-email/:token', verifyOutletAdminEmail);

/**
 * @swagger
 * /api/outlet-admin/resend-verification:
 *   post:
 *     tags: [OutletAdmin]
 *     summary: Resend verification email to outlet admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/resend-verification', resendVerificationEmail);

export default router; 