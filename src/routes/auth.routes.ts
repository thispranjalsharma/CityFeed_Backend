import { Router, Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { registerSuperAdmin, loginSuperAdmin, verifySuperAdminEmail, approveSuperAdmin } from '../controllers/superAdmin.controller';
import { loginOutletAdmin } from '../controllers/outletAdmin.controller';
import { loginEmployee } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * components:
 *   schemas:
 *     SuperAdmin:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "Super Admin Name"
 *         email:
 *           type: string
 *           example: "superadmin@example.com"
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *         isEmailVerified:
 *           type: boolean
 *           example: false
 *         isApproved:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T12:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T12:00:00Z"
 */

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
 *     description: |
 *       Register a new user with membership payment.
 *       The user must select a membership type and complete the payment.
 *       Membership will be valid for one year from the registration date.
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
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User's password
 *               name:
 *                 type: string
 *                 description: User's full name
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: User's date of birth
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: User's gender
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               membershipType:
 *                 type: string
 *                 enum: [cityfeed_select, cityfeed_edge, cityfeed_prime]
 *                 description: Type of membership (requires payment)
 *                 example: "cityfeed_select"
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         email:
 *                           type: string
 *                           example: "user@example.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         membershipType:
 *                           type: string
 *                           example: "cityfeed_select"
 *                         membershipExpiryDate:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-03-20T10:00:00Z"
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
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
    body('membershipType').isIn(['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime']).withMessage('Membership type must be cityfeed_select, cityfeed_edge, or cityfeed_prime')
  ]),
  (req: any, res: Response) => authController.registerUser(req as any, res)
);


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login for any role (user, admin, super_admin, outlet_admin)
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
 *                 example: outletadmin@example.com
 *               password:
 *                 type: string
 *                 example: yourPassword
 *               role:
 *                 type: string
 *                 enum: [user, admin, super_admin, outlet_admin]
 *                 example: outlet_admin
 *           examples:
 *             OutletAdminLogin:
 *               summary: Outlet Admin Login Example
 *               value:
 *                 email: outletadmin@example.com
 *                 password: yourPassword
 *                 role: outlet_admin
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     outletAdmin:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "outletadmin@example.com"
 *                         phone:
 *                           type: string
 *                           example: "+1234567890"
 *                         role:
 *                           type: string
 *                           example: "outlet_admin"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: true
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     outletId:
 *                       type: string
 *                       nullable: true
 *                       example: "507f1f77bcf86cd799439022"
 *       400:
 *         description: Invalid credentials or role
 */
router.post('/login', (req: any, res: Response) => authController.login(req as any, res));

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
 *                 enum: [user, superadmin]
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email/:token', (req: any, res: Response) => authController.verifyEmail(req as any, res));

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
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
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
  (req: any, res: Response) => authController.forgotPassword(req as any, res)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout all
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
router.post('/logout', authenticate, (req: any, res: Response) => authController.logout(req as any, res));

router.post('/register/super-admin', (req, res) => registerSuperAdmin(req, res));
router.post('/login/super-admin', (req, res) => loginSuperAdmin(req, res));
router.get('/verify-email/super-admin', verifySuperAdminEmail);

/**
 * @swagger
 * /api/auth/approve-super-admin/{id}:
 *   patch:
 *     tags: [SuperAdmin]
 *     summary: Approve a super admin (by Cityfeed admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the super admin to approve
 *     responses:
 *       200:
 *         description: Super admin approved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     superAdmin:
 *                       $ref: '#/components/schemas/SuperAdmin'
 *       400:
 *         description: Invalid request or super admin not found
 */
router.patch('/approve-super-admin/:id', approveSuperAdmin);

// Outlet admin login
router.post('/login-outlet-admin', loginOutletAdmin);

router.post('/register-employee', authenticate, (req, res) => authController.registerEmployee(req as any, res));
router.post('/login-employee', loginEmployee);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (user or superadmin)
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
 *               - role
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [user, super_admin, employee, outlet_admin]
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input or unsupported role
 *       401:
 *         description: Invalid current password or not authenticated
 */
router.post(
  '/change-password',
  authenticate,
  validateRequest([
    body('currentPassword').isString(),
    body('newPassword').isLength({ min: 6 }),
    body('role').isIn(['user', 'super_admin', 'employee', 'outlet_admin'])
  ]),
  (req: any, res: Response) => authController.changePassword(req as any, res)
);

// Support both URL and body token
router.post('/reset-password/:token', (req, res) => authController.resetPassword(req as any, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req as any, res));

router.post('/resend-verification', (req: any, res: Response) => authController.resendVerification(req as any, res));

export default router; 