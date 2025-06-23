import { Router } from 'express';
import { 
  registerOutletAdmin, 
  loginOutletAdmin, 
  verifyOutletAdminEmail, 
  resendVerificationEmail 
} from '../controllers/outletAdmin.controller';

const router = Router();

/**
 * @swagger
 * /api/outlet-admin/register:
 *   post:
 *     tags: [OutletAdmin]
 *     summary: Register a new outlet admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Outlet admin registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/register', registerOutletAdmin);

/**
 * @swagger
 * /api/outlet-admin/login:
 *   post:
 *     tags: [OutletAdmin]
 *     summary: Login as outlet admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', loginOutletAdmin);

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