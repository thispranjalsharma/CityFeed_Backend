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
    *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address (must be unique)
   *                 example: "user@example.com"
   *               phone:
   *                 type: string
   *                 description: User's phone number (10 digits, must be unique)
   *                 example: "1234567890"
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
router.put('/profile', 
  authenticate, 
  userAuth, 
  validateRequest([
    body('email').optional().isEmail().withMessage('Please provide a valid email address'),
    body('phone').optional().isLength({ min: 10, max: 10 }).withMessage('Phone must be exactly 10 digits').isNumeric().withMessage('Phone must be numeric'),
    body('name').optional().isString().withMessage('Name must be a string'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('membershipType').optional().isIn(['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime']).withMessage('Invalid membership type'),
    body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date')
  ]), 
  (req, res) => userController.updateProfile(req as any, res)
);



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
 *     summary: Get user details by phone number or email address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: User's phone number or email address
 *         example: "1234567890"
 *     responses:
 *       200:
 *         description: User details
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
 *                   description: User details
 *       400:
 *         description: Phone number or email is required
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
 * /api/users/reward-history:
 *   get:
 *     tags: [Users]
 *     summary: Get reward points history for the authenticated user
 *     description: Retrieve paginated reward points transaction history with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [earned, redeemed, refund, adjustment]
 *         description: Filter by transaction type
 *       - in: query
 *         name: sourceType
 *         schema:
 *           type: string
 *           enum: [dine-in, event, referral, membership, adjustment, refund]
 *         description: Filter by source type
 *     responses:
 *       200:
 *         description: Reward points history retrieved successfully
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
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                           transactionType:
 *                             type: string
 *                             enum: [earned, redeemed, refund, adjustment]
 *                             example: "earned"
 *                           amount:
 *                             type: number
 *                             example: 50
 *                           sourceType:
 *                             type: string
 *                             enum: [dine-in, event, referral, membership, adjustment, refund]
 *                             example: "dine-in"
 *                           sourceId:
 *                             type: string
 *                             example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *                           description:
 *                             type: string
 *                             example: "Earned 50 reward points from dine-in at Restaurant ABC"
 *                           balanceAfter:
 *                             type: number
 *                             example: 150
 *                           balanceBefore:
 *                             type: number
 *                             example: 100
 *                           outletId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                           eventId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                     totalCount:
 *                       type: number
 *                       example: 25
 *                     totalPages:
 *                       type: number
 *                       example: 3
 *                     currentPage:
 *                       type: number
 *                       example: 1
 *                 message:
 *                   type: string
 *                   example: "Reward history retrieved successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/reward-history', authenticate, userAuth, (req, res) => userController.getMyRewardHistory(req as any, res));

/**
 * @swagger
 * /api/users/reward-summary:
 *   get:
 *     tags: [Users]
 *     summary: Get reward points summary for the authenticated user
 *     description: Retrieve aggregated reward points statistics including total earned, redeemed, and current balance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reward points summary retrieved successfully
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
 *                     totalEarned:
 *                       type: number
 *                       description: Total reward points earned by the user
 *                       example: 500
 *                     totalRedeemed:
 *                       type: number
 *                       description: Total reward points redeemed by the user
 *                       example: 200
 *                     currentBalance:
 *                       type: number
 *                       description: Current reward points balance (earned - redeemed)
 *                       example: 300
 *                     transactionCount:
 *                       type: number
 *                       description: Total number of reward point transactions
 *                       example: 15
 *                 message:
 *                   type: string
 *                   example: "Reward summary retrieved successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/reward-summary', authenticate, userAuth, (req, res) => userController.getMyRewardSummary(req as any, res));

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
