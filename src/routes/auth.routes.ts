import { Router, Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import * as expressValidator from 'express-validator';
const { body } = expressValidator;
import { registerSuperAdmin, loginSuperAdmin, verifySuperAdminEmail, approveSuperAdmin } from '../controllers/superAdmin.controller';
import { loginOutletAdmin } from '../controllers/outletAdmin.controller';
import { loginEmployee } from '../controllers/auth.controller';
import { 
  enhancedLoginRateLimiter,
  enhancedPasswordResetRateLimiter,
  enhancedEmailVerificationRateLimiter,
} from '../middleware/enhancedRateLimit.middleware';
import { isValidPhone, isStrongPassword } from '../middleware/validation.middleware';
import { config } from '../config/config';

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
    (body('password') as any)
      .custom(isStrongPassword)
      .withMessage('Password must be at least 8 characters, include 1 special character, 1 lowercase letter, and 1 digit'),
    body('name').isString().withMessage('Name is required'),
    body('dob').isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    (body('phone') as any)
      .custom(isValidPhone)
      .withMessage('Phone number must be valid 10 digits'),
    body('membershipType').isIn(['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime']).withMessage('Membership type must be cityfeed_select, cityfeed_edge, or cityfeed_prime'),
    body('referralCode').optional().isString().withMessage('Referral code must be a string')
  ]),
  (req: any, res: Response) => authController.registerUser(req as any, res)
);


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login for any role (user, admin, super_admin, outlet_admin, employee)
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
 *                 enum: [user, admin, super_admin, outlet_admin, employee, event_organizer, event_manager, event_staff]
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
 *                     employee:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         outlet:
 *                           type: string
 *                         responsibilities:
 *                           type: array
 *                           items:
 *                             type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         isEmailVerified:
 *                           type: boolean
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     outletId:
 *                       type: string
 *                       nullable: true
 *                       example: "507f1f77bcf86cd799439022"
 *                     isFirstLogin:
 *                       type: boolean
 *                       description: Only present for outlet_admin and employee. Indicates if this is the user's first login and a password change is required.
 *                       example: true
 *       400:
 *         description: Invalid credentials or role
 */
router.post('/login', 
  config.isProduction ? enhancedLoginRateLimiter : (req, res, next) => next(),
  (req: any, res: Response) => authController.login(req as any, res)
);

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email address
 *     description: |
 *       Verify email for any role (user, superadmin, event_organizer, event_manager, event_staff, etc.).
 *       For event roles, use the token sent to the event organizer/manager/staff email and specify the correct role in the request body.
 *       Example for event organizer:
 *         POST /api/auth/verify-email/{token}
 *         Body: { "role": "event_organizer" }
 *       Example for event manager:
 *         POST /api/auth/verify-email/{token}
 *         Body: { "role": "event_manager" }
 *       Example for event staff:
 *         POST /api/auth/verify-email/{token}
 *         Body: { "role": "event_staff" }
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
 *                 enum: [user, superadmin, event_organizer, event_manager, event_staff]
 *                 description: Role of the account to verify
 *           examples:
 *             EventOrganizer:
 *               summary: Event Organizer Verification
 *               value:
 *                 role: event_organizer
 *             EventManager:
 *               summary: Event Manager Verification
 *               value:
 *                 role: event_manager
 *             EventStaff:
 *               summary: Event Staff Verification
 *               value:
 *                 role: event_staff
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email/:token', 
  config.isProduction ? enhancedEmailVerificationRateLimiter : (req, res, next) => next(),
  (req: any, res: Response) => authController.verifyEmail(req as any, res)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: >-
 *       Request a password reset for any role (user, admin, super_admin, outlet_admin, employee, event_organizer, event_manager, event_staff).
 *       Provide the email and role in the request body.
 *       Example for event_manager:
 *         { "email": "manager@example.com", "role": "event_manager" }
 *       Example for event_staff:
 *         { "email": "staff@example.com", "role": "event_staff" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [user, admin, super_admin, outlet_admin, employee, event_organizer, event_manager, event_staff]
 *           examples:
 *             EventManager:
 *               summary: Event Manager Forgot Password
 *               value:
 *                 email: manager@example.com
 *                 role: event_manager
 *             EventStaff:
 *               summary: Event Staff Forgot Password
 *               value:
 *                 email: staff@example.com
 *                 role: event_staff
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
router.post(
  '/forgot-password',
  config.isProduction ? enhancedPasswordResetRateLimiter : (req, res, next) => next(),
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
router.post('/login/super-admin', 
  config.isProduction ? enhancedLoginRateLimiter : (req, res, next) => next(),
  (req, res) => loginSuperAdmin(req, res)
);
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
router.post('/login-outlet-admin', 
  config.isProduction ? enhancedLoginRateLimiter : (req, res, next) => next(),
  loginOutletAdmin
);

router.post('/register-employee', authenticate, (req, res) => authController.registerEmployee(req as any, res));
router.post('/login-employee', 
  config.isProduction ? enhancedLoginRateLimiter : (req, res, next) => next(),
  loginEmployee
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (any role)
 *     description: >-
 *       Change password for any role (user, admin, super_admin, outlet_admin, employee, event_organizer, event_manager, event_staff).
 *       Provide the current password, new password, and role in the request body.
 *       Example for event_manager:
 *         { "currentPassword": "OldPass@123", "newPassword": "NewPass@123", "role": "event_manager" }
 *       Example for event_staff:
 *         { "currentPassword": "OldPass@123", "newPassword": "NewPass@123", "role": "event_staff" }
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
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [user, admin, super_admin, outlet_admin, employee, event_organizer, event_manager, event_staff]
 *           examples:
 *             EventManager:
 *               summary: Event Manager Change Password
 *               value:
 *                 currentPassword: "OldPass@123"
 *                 newPassword: "NewPass@123"
 *                 role: event_manager
 *             EventStaff:
 *               summary: Event Staff Change Password
 *               value:
 *                 currentPassword: "OldPass@123"
 *                 newPassword: "NewPass@123"
 *                 role: event_staff
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
    body('role').isIn(['user', 'super_admin', 'employee', 'outlet_admin', 'event_organizer', 'event_manager', 'event_staff'])
  ]),
  (req: any, res: Response) => authController.changePassword(req as any, res)
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     description: >-
 *       Reset password for any role (user, admin, super_admin, outlet_admin, employee, event_organizer, event_manager, event_staff).
 *       Provide the token, new password, and role in the request body.
 *       Example for event_manager:
 *         { "token": "...", "newPassword": "...", "role": "event_manager" }
 *       Example for event_staff:
 *         { "token": "...", "newPassword": "...", "role": "event_staff" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - role
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [user, admin, super_admin, outlet_admin, employee, event_organizer, event_manager, event_staff]
 *           examples:
 *             EventManager:
 *               summary: Event Manager Reset Password
 *               value:
 *                 token: "..."
 *                 newPassword: "NewPass@123"
 *                 role: event_manager
 *             EventStaff:
 *               summary: Event Staff Reset Password
 *               value:
 *                 token: "..."
 *                 newPassword: "NewPass@123"
 *                 role: event_staff
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password/:token', (req, res) => authController.resetPassword(req as any, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req as any, res));

router.post('/resend-verification', 
  config.isProduction ? enhancedEmailVerificationRateLimiter : (req, res, next) => next(),
  (req: any, res: Response) => authController.resendVerification(req as any, res)
);

/**
 * @swagger
 * /api/auth/first-login-change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password on first login (outlet admin or employee)
 *     description: >-
 *       Allows outlet admins and employees to change their password on first login. This will also set the isFirstLogin flag to false.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - role
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password to set
 *               role:
 *                 type: string
 *                 enum: [outlet_admin, employee, event_organizer, event_manager, event_staff]
 *                 description: Role of the user
 *     responses:
 *       200:
 *         description: Password changed and first login flag unset
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
 *                   example: Password changed and first login flag unset
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated:
 *                       type: object
 *       400:
 *         description: Invalid input or unsupported role
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/first-login-change-password',
  authenticate,
  validateRequest([
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('role').isIn(['outlet_admin', 'employee', 'event_organizer', 'event_manager', 'event_staff']).withMessage('Role must be outlet_admin, employee, event_organizer, event_manager, or event_staff')
  ]),
  (req: any, res: Response) => authController.firstLoginChangePassword(req as any, res)
);

/**
 * @swagger
 * /api/auth/guest-login:
 *   post:
 *     summary: Guest login for event (phone + OTP)
 *     tags: [Auth]
 *     description: |
 *       Guest login for event flow. Step 1: Send phone to receive OTP. Step 2: Send phone and OTP to verify and login as a guest user. Guest users can only pay via Razorpay for events and do not receive discounts or reward points.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919999999999"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *           examples:
 *             RequestOTP:
 *               summary: Request OTP
 *               value:
 *                 phone: "+919999999999"
 *             VerifyOTP:
 *               summary: Verify OTP and login
 *               value:
 *                 phone: "+919999999999"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: Success (OTP sent or guest login successful)
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
 *                     user:
 *                       type: object
 *                       description: Guest user info
 *                     token:
 *                       type: string
 *                       description: JWT token for guest session
 *       400:
 *         description: Invalid input or OTP
 */
router.post('/guest-login', (req: any, res: Response) => authController.guestLogin(req as any, res));

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for guest login
 *     tags: [Auth]
 *     description: |
 *       Verifies the OTP sent to the user's phone for guest login. Returns a JWT and guest user info on success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919999999999"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Guest login successful
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
 *                     user:
 *                       type: object
 *                       description: Guest user info
 *                     token:
 *                       type: string
 *                       description: JWT token for guest session
 *       400:
 *         description: Invalid input or OTP
 */
router.post('/verify-otp', (req: any, res: Response) => authController.verifyGuestOtp(req as any, res));

export default router; 