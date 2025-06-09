import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { adminAuth, authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { check } from 'express-validator';

const router = Router();
const adminController = new AdminController();

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/users', authenticate, adminAuth, adminController.getUsers);

/**
 * @swagger
 * /api/admin/merchants:
 *   get:
 *     summary: Get all merchants
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of merchants
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/merchants', authenticate, adminAuth, adminController.getMerchants);

/**
 * @swagger
 * /api/admin/merchants/{merchantId}/approve:
 *   post:
 *     summary: Approve a merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Merchant approved successfully
 *       401:
 *         description: Unauthorized - Invalid token
 *       404:
 *         description: Merchant not found
 */
router.post('/merchants/:merchantId/approve', authenticate, adminAuth, adminController.approveMerchant);

/**
 * @swagger
 * /api/admin/users/{userId}/deactivate:
 *   post:
 *     summary: Deactivate a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       401:
 *         description: Unauthorized - Invalid token
 *       404:
 *         description: User not found
 */
router.post('/users/:userId/deactivate', authenticate, adminAuth, adminController.deactivateUser);

/**
 * @swagger
 * /api/admin/merchants/{merchantId}/deactivate:
 *   post:
 *     summary: Deactivate a merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Merchant deactivated successfully
 *       401:
 *         description: Unauthorized - Invalid token
 *       404:
 *         description: Merchant not found
 */
router.post('/merchants/:merchantId/deactivate', authenticate, adminAuth, adminController.deactivateMerchant);

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     tags: [Admin]
 *     summary: Admin login
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
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login',
  validateRequest([
    check('email').isEmail().withMessage('Please provide a valid email'),
    check('password').notEmpty().withMessage('Password is required')
  ]),
  adminController.login
);

export default router; 