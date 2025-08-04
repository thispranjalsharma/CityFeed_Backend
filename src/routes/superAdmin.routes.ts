import { Router } from 'express';
import { registerSuperAdmin, getMyProfile, updateMyProfile, deleteMyProfile, disapproveSuperAdmin, getDashboardData } from '../controllers/superAdmin.controller';
import { getMyOutlets } from '../controllers/outlet.controller';
import { getMyOutletAdmins } from '../controllers/outletAdmin.controller';
import { getEmployeesByOutlets, getMyEmployeesForSuperAdmin, getMyEmployees } from '../controllers/staff.controller';
import { OfferController } from '../controllers/offer.controller';
import { authenticate, superAdminAuth, adminAuth } from '../middleware/auth.middleware';
import * as expressValidator from 'express-validator';
import { validateRequest, isValidPhone, isStrongPassword } from '../middleware/validation.middleware';

const { body } = expressValidator;

const router = Router();

/**
 * @swagger
 * /api/super-admin/register:
 *   post:
 *     tags: [SuperAdmin]
 *     summary: Register a new super admin
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
 *         description: Super admin registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post(
  '/register',
  validateRequest([
    body('name').isString().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    (body('password') as any)
      .custom(isStrongPassword)
      .withMessage('Password must be at least 8 characters, include 1 special character, 1 lowercase letter, and 1 digit'),
    (body('phone') as any)
      .custom(isValidPhone)
      .withMessage('Phone number must be valid 10 digits')
  ]),
  registerSuperAdmin
);

/**
 * @swagger
 * /api/super-admin/my-outlets:
 *   get:
 *     summary: Get all outlets created by the authenticated super admin
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of outlets
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/my-outlets', authenticate, superAdminAuth, (req, res) => getMyOutlets(req as any, res));

/**
 * @swagger
 * /api/super-admin/my-outlet-admins:
 *   get:
 *     summary: Get all outlet admins for outlets created by the authenticated super admin
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of outlet admins
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/my-outlet-admins', authenticate, superAdminAuth, (req, res) => getMyOutletAdmins(req as any, res));

/**
 * @swagger
 * /api/super-admin/my-employees:
 *   get:
 *     summary: Get all employees for outlets created by the authenticated super admin
 *     description: Retrieve all employees grouped by outlet for outlets created by the authenticated super admin
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
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
 *                     outlets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           outlet:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: "507f1f77bcf86cd799439011"
 *                               name:
 *                                 type: string
 *                                 example: "Restaurant Name"
 *                               address:
 *                                 type: string
 *                                 example: "123 Main St, City"
 *                           employees:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Staff'
 *                     totalEmployees:
 *                       type: integer
 *                       example: 15
 *                     message:
 *                       type: string
 *                       example: "Retrieved 15 employees from 3 outlets"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only super admins can access this endpoint
 *       500:
 *         description: Server error
 */
router.get('/my-employees', authenticate, superAdminAuth, (req, res) => getMyEmployeesForSuperAdmin(req as any, res));

/**
 * @swagger
 * /api/super-admin/outlet-employees:
 *   get:
 *     summary: Get employees for a specific outlet (Super Admin only)
 *     description: Retrieve all employees assigned to a specific outlet created by the super admin
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet to get employees for
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
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
 *                     outlet:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         name:
 *                           type: string
 *                           example: "Restaurant Name"
 *                         address:
 *                           type: string
 *                           example: "123 Main St, City"
 *                     employees:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Staff'
 *                     totalEmployees:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Bad request - Outlet ID is required
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only super admins can access this endpoint
 *       404:
 *         description: Outlet not found or no permission to access it
 *       500:
 *         description: Server error
 */
router.get('/outlet-employees', authenticate, superAdminAuth, (req, res) => getMyEmployees(req as any, res));

/**
 * @swagger
 * /api/super-admin/my-offers:
 *   get:
 *     summary: Get all offers for outlets created by the authenticated super admin
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of offers
 *       401:
 *         description: Unauthorized - Invalid token
 */
const offerController = new OfferController();
router.get('/my-offers', authenticate, superAdminAuth, (req, res) => offerController.getMyOffers(req as any, res));

/**
 * @swagger
 * /api/super-admin/profile:
 *   get:
 *     summary: Get super admin profile
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Super admin profile
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/profile', authenticate, superAdminAuth, (req, res) => getMyProfile(req as any, res));

/**
 * @swagger
 * /api/super-admin/profile:
 *   put:
 *     summary: Update super admin profile
 *     tags: [SuperAdmin]
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
 *                 example: "Super Admin Name"
 *                 description: "Super admin name (optional)"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *                 description: "Super admin phone number (optional)"
 *             description: "Only name and phone can be updated. Email cannot be modified."
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Bad request - Email cannot be updated
 *       401:
 *         description: Unauthorized - Invalid token
 *       404:
 *         description: Profile not found
 */
router.put('/profile', authenticate, superAdminAuth, validateRequest([
  body('name').optional().isString().withMessage('Name must be a string'),
  body('phone').optional().isString().withMessage('Phone must be a string')
]), (req, res) => updateMyProfile(req as any, res));

/**
 * @swagger
 * /api/super-admin/profile:
 *   delete:
 *     summary: Delete super admin profile
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.delete('/profile', authenticate, superAdminAuth, (req, res) => deleteMyProfile(req as any, res));

/**
 * @swagger
 * /api/super-admin/disapprove/{id}:
 *   patch:
 *     summary: Disapprove a super admin (by Cityfeed admin) and deactivate all related entities
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the super admin to disapprove
 *     responses:
 *       200:
 *         description: Super admin disapproved and all related entities deactivated
 *       400:
 *         description: Invalid request or super admin not found
 */
router.patch('/disapprove/:id', authenticate, adminAuth, (req, res) => disapproveSuperAdmin(req as any, res));

/**
 * @swagger
 * /api/super-admin/dashboard:
 *   get:
 *     summary: Get dashboard metrics for super admin
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/dashboard', authenticate, superAdminAuth, (req, res) => getDashboardData(req as any, res));

export default router; 