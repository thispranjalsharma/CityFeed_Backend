import { Router, Request, Response, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import upload from '../middleware/upload.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register/user:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - dob
 *               - gender
 *               - phone
 *               - membershipType
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               phone:
 *                 type: string
 *               membershipType:
 *                 type: string
 *                 enum: [cityfeed_club, cityfeed_edge, cityfeed_prime]
 *                 default: cityfeed_club
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */
router.post(
  '/register/user',
  validateRequest([
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').isString().withMessage('Name is required'),
    body('dob').isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('phone').isString().withMessage('Phone number is required'),
    body('membershipType').isIn(['cityfeed_club', 'cityfeed_edge', 'cityfeed_prime']).withMessage('Membership type must be cityfeed_club, cityfeed_edge, or cityfeed_prime')
  ]),
  (req: any, res: Response) => authController.registerUser(req, res)
);

/**
 * @swagger
 * /api/auth/register/merchant:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new merchant
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - phone
 *               - businessName
 *               - businessType
 *               - businessDescription
 *               - address
 *               - location
 *               - images
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Merchant's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Merchant's password
 *               name:
 *                 type: string
 *                 description: Merchant's full name
 *               phone:
 *                 type: string
 *                 description: Merchant's phone number
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *               businessType:
 *                 type: string
 *                 enum: [cafe, restaurant]
 *                 description: Type of business
 *               businessDescription:
 *                 type: string
 *                 description: Description of the business
 *               address:
 *                 type: string
 *                 description: Business address
 *               location:
 *                 type: string
 *                 description: Business location coordinates in GeoJSON format
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Business images (max 5 images, 5MB each)
 *     responses:
 *       201:
 *         description: Merchant registered successfully
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
 *                     merchant:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         businessName:
 *                           type: string
 *                         businessType:
 *                           type: string
 *                         businessDescription:
 *                           type: string
 *                         address:
 *                           type: string
 *                         location:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                         role:
 *                           type: string
 *                         isApproved:
 *                           type: boolean
 *                         isEmailVerified:
 *                           type: boolean
 *                     token:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: Merchant registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */
router.post(
  '/register/merchant',
  upload.array('images', 5),
  validateRequest([
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('businessName').notEmpty().withMessage('Business name is required'),
    body('businessType').isIn(['cafe', 'restaurant']).withMessage('Business type must be cafe or restaurant'),
    body('businessDescription').notEmpty().withMessage('Business description is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('location').notEmpty().withMessage('Location is required')
  ]),
  (req: Request, res: Response) => authController.registerMerchant(req, res)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user or merchant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, merchant, admin]
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  validateRequest([
    body('email').isEmail(),
    body('password').isString(),
    body('role').isIn(['user', 'merchant', 'admin'])
  ]),
  (req: any, res: Response) => authController.login(req, res)
);

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email address
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, merchant]
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email/:token', (req: any, res: Response) => authController.verifyEmail(req, res));

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
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
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
router.post(
  '/forgot-password',
  validateRequest([
    body('email').isEmail()
  ]),
  (req: any, res: Response) => authController.forgotPassword(req, res)
);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/reset-password/:token',
  validateRequest([
    body('password').isLength({ min: 6 })
  ]),
  (req: any, res: Response) => authController.resetPassword(req, res)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid current password
 */
router.post(
  '/change-password',
  authenticate,
  validateRequest([
    body('currentPassword').isString(),
    body('newPassword').isLength({ min: 6 })
  ]),
  (req: any, res: Response) => authController.changePassword(req, res)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user or merchant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
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
 *                   example: Logged out successfully
 *       401:
 *         description: No token provided
 *       500:
 *         description: Server error
 */
router.post('/logout', authenticate, (req: any, res: Response) => authController.logout(req, res));

export default router; 