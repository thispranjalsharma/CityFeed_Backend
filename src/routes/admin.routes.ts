import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, adminAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { check } from 'express-validator';
import { getAllSuperAdmins } from '../controllers/superAdmin.controller';
import { getAllOutletAdmins } from '../controllers/outletAdmin.controller';
import { getAllOutlets } from '../controllers/outlet.controller';
import { getAllEmployees } from '../controllers/outletRoleAssignment.controller';
import { activateUserByAdmin } from '../controllers/user.controller';
import { enhancedLoginRateLimiter } from '../middleware/enhancedRateLimit.middleware';

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
  enhancedLoginRateLimiter,
  validateRequest([
    check('email').isEmail().withMessage('Please provide a valid email'),
    check('password').notEmpty().withMessage('Password is required')
  ]),
  adminController.login
);

/**
 * @swagger
 * /api/admin/super-admins:
 *   get:
 *     summary: Get all super admins
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of super admins
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/super-admins', authenticate, adminAuth, getAllSuperAdmins);

/**
 * @swagger
 * /api/admin/outlet-admins:
 *   get:
 *     summary: Get all outlet admins (optionally filter by super admin)
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: superAdminId
 *         schema:
 *           type: string
 *         required: false
 *         description: The ID of the super admin to filter outlet admins by
 *     responses:
 *       200:
 *         description: List of outlet admins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OutletAdmin'
 */
router.get('/outlet-admins', authenticate, adminAuth, getAllOutletAdmins);

/**
 * @swagger
 * /api/admin/outlets:
 *   get:
 *     summary: Get all outlets (optionally filter by super admin)
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: superAdminId
 *         schema:
 *           type: string
 *         required: false
 *         description: The ID of the super admin to filter outlets by
 *     responses:
 *       200:
 *         description: List of outlets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Outlet'
 */
router.get('/outlets', authenticate, adminAuth, getAllOutlets);

/**
 * @swagger
 * /api/admin/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/employees', authenticate, adminAuth, getAllEmployees);

/**
 * @swagger
 * /api/admin/users/activate/{id}:
 *   patch:
 *     summary: Activate a user (by Cityfeed admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to activate
 *     responses:
 *       200:
 *         description: User activated successfully
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
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.patch('/users/activate/:id', authenticate, adminAuth, activateUserByAdmin);

export default router; 