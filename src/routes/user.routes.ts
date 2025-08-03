import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { userAuth } from '../middleware/auth.middleware';

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
router.get('/profile', authenticate, userAuth, (req, res) => userController.getProfile(req as any, res));

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
router.put('/profile', authenticate, userAuth, (req, res) => userController.updateProfile(req as any, res));

/**
 * @swagger
 * /api/users/profile:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile deleted successfully"
 *       401:
 *         description: Unauthorized - No token provided
 *       404:
 *         description: User not found
 */
router.delete('/profile', authenticate, userAuth, (req, res) => userController.deleteProfile(req as any, res));

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
  (req, res) => userController.upgradeMembership(req as any, res)
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
  (req, res) => userController.verifyMembershipUpgrade(req as any, res)
);

/**
 * @swagger
 * /api/users/send-referral:
 *   post:
 *     tags: [Users]
 *     summary: Send referral email to a friend
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendEmail
 *             properties:
 *               friendEmail:
 *                 type: string
 *                 format: email
 *                 description: Friend's email address
 *     responses:
 *       200:
 *         description: Referral email sent successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/send-referral', authenticate, userAuth, (req, res) => userController.sendReferralEmail(req as any, res));

/**
 * @swagger
 * /api/users/by-phone:
 *   get:
 *     summary: Get user details by phone number
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: User's phone number
 *     responses:
 *       200:
 *         description: User details
 *       400:
 *         description: Phone number is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/by-phone', authenticate, (req, res, next) => {
  const allowedRoles = ['admin', 'super_admin', 'outlet_admin', 'employee', 'user'];
  const user = (req as any).user;
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}, (req, res) => userController.getUserByPhone(req as any, res));

/**
 * @swagger
 * /api/users/wallet-balance:
 *   get:
 *     summary: Get user's wallet balance
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 balance:
 *                   type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/wallet-balance', authenticate, userAuth, (req, res) => userController.getMyWalletBalance(req as any, res));

/**
 * @swagger
 * /api/users/reward-points:
 *   get:
 *     summary: Get user's reward points
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reward points
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rewardPoints:
 *                   type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/reward-points', authenticate, userAuth, (req, res) => userController.getMyRewardPoints(req as any, res));

/**
 * @swagger
 * /api/users/check-email:
 *   post:
 *     tags: [Users]
 *     summary: Check if email is available for registration
 *     description: Check if an email address is already registered in the system
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
 *                 format: email
 *                 description: Email address to check
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Email availability checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Email is available"
 *                 message:
 *                   type: string
 *                   example: "Email availability checked successfully"
 *       400:
 *         description: Email is required
 */
router.post('/check-email', 
  validateRequest([
    body('email').isEmail().withMessage('Please provide a valid email')
  ]),
  (req, res) => userController.checkEmailAvailability(req, res)
);

/**
 * @swagger
 * /api/users/check-phone:
 *   post:
 *     tags: [Users]
 *     summary: Check if phone number is available for registration
 *     description: Check if a phone number is already registered in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number to check (10 digits)
 *                 example: "1234567890"
 *     responses:
 *       200:
 *         description: Phone number availability checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     phone:
 *                       type: string
 *                       example: "1234567890"
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Phone number is available"
 *                 message:
 *                   type: string
 *                   example: "Phone number availability checked successfully"
 *       400:
 *         description: Phone number is required
 */
router.post('/check-phone', 
  validateRequest([
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone must be exactly 10 digits')
      .isNumeric().withMessage('Phone must be numeric')
  ]),
  (req, res) => userController.checkPhoneAvailability(req, res)
);

export default router;
