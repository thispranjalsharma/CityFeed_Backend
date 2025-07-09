import { Router } from 'express';
import { registerSuperAdmin, getMyProfile, updateMyProfile, deleteMyProfile, disapproveSuperAdmin, getDashboardData } from '../controllers/superAdmin.controller';
import { getMyOutlets } from '../controllers/outlet.controller';
import { getMyOutletAdmins } from '../controllers/outletAdmin.controller';
import { getMyEmployees } from '../controllers/outletRoleAssignment.controller';
import { OfferController } from '../controllers/offer.controller';
import { authenticate, superAdminAuth, adminAuth } from '../middleware/auth.middleware';

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
router.post('/register', registerSuperAdmin);

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
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/my-employees', authenticate, superAdminAuth, (req, res) => getMyEmployees(req as any, res));

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
 *               email:
 *                 type: string
 *                 example: "superadmin@example.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.put('/profile', authenticate, superAdminAuth, (req, res) => updateMyProfile(req as any, res));

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