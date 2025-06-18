import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's name
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: User's date of birth
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: User's gender
 *               address:
 *                 type: string
 *                 description: User's address
 *               membershipType:
 *                 type: string
 *                 enum: [cityfeed_select, cityfeed_edge, cityfeed_prime]
 *                 description: User's membership type
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/profile',
  authenticate,
  validateRequest([
    body('name').optional().isString(),
    body('dob').optional().isISO8601(),
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('address').optional().isString(),
    body('membershipType').optional().isIn(['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'])
  ]),
  userController.updateProfile
);

/**
 * @swagger
 * /api/users/membership/upgrade:
 *   post:
 *     tags: [Users]
 *     summary: Upgrade user membership
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetMembershipType
 *               - paymentMethod
 *             properties:
 *               targetMembershipType:
 *                 type: string
 *                 enum: [cityfeed_select, cityfeed_edge, cityfeed_prime]
 *                 description: Target membership type to upgrade to
 *               paymentMethod:
 *                 type: string
 *                 enum: [wallet, razorpay]
 *                 description: Payment method to use for upgrade
 *     responses:
 *       200:
 *         description: Membership upgrade initiated successfully
 *       400:
 *         description: Invalid membership type or payment method
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/membership/upgrade',
  authenticate,
  validateRequest([
    body('targetMembershipType')
      .isIn(['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'])
      .withMessage('Invalid membership type'),
    body('paymentMethod')
      .isIn(['wallet', 'razorpay'])
      .withMessage('Invalid payment method')
  ]),
  userController.upgradeMembership
);

/**
 * @swagger
 * /api/users/membership/upgrade/verify:
 *   post:
 *     tags: [Users]
 *     summary: Verify membership upgrade payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Razorpay order ID
 *     responses:
 *       200:
 *         description: Membership upgrade completed successfully
 *       400:
 *         description: Payment verification failed
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/membership/upgrade/verify',
  authenticate,
  validateRequest([
    body('orderId').isString().notEmpty().withMessage('Order ID is required')
  ]),
  userController.verifyMembershipUpgrade
);

export default router;
