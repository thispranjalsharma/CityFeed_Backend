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

/**
 * @swagger
<<<<<<< Updated upstream
 * /api/admin/cleanup/trigger:
 *   post:
 *     summary: Manually trigger soft delete cleanup
 *     description: |
 *       Manually triggers the cleanup job to permanently delete soft-deleted records
 *       that are older than 13 months. This is useful for immediate cleanup or testing.
=======
 * /api/admin/event-organizers/pending:
 *   get:
 *     summary: Get all pending event organizers
>>>>>>> Stashed changes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
<<<<<<< Updated upstream
 *         description: Cleanup job triggered successfully
 *       401:
 *         description: Unauthorized - Invalid token
 *       403:
 *         description: Not authorized - Only super admins can trigger cleanup
 *       500:
 *         description: Server error during cleanup
 */
// router.post('/cleanup/trigger', authenticate, adminAuth, adminController.triggerCleanup as any);

/**
 * @swagger
 * /api/admin/cleanup/stats:
 *   get:
 *     summary: Get soft delete statistics
 *     description: |
 *       Returns statistics about soft-deleted records in the system,
 *       including counts of records older than 13 months that would be
 *       cleaned up by the scheduled job.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Soft delete statistics retrieved successfully
 *       401:
 *         description: Unauthorized - Invalid token
 *       403:
 *         description: Not authorized - Only super admins can view statistics
 *       500:
 *         description: Server error retrieving statistics
 */
router.get('/cleanup/stats', authenticate, adminAuth, adminController.getCleanupStats as any);
=======
 *         description: List of pending event organizers
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
 *                     eventOrganizers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EventOrganizer'
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/event-organizers/pending', authenticate, adminAuth, adminController.getPendingEventOrganizers);

/**
 * @swagger
 * /api/admin/event-organizers/{organizerId}/approve:
 *   patch:
 *     summary: Approve an event organizer
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event organizer to approve
 *     responses:
 *       200:
 *         description: Event organizer approved successfully
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
 *                     eventOrganizer:
 *                       $ref: '#/components/schemas/EventOrganizer'
 *       400:
 *         description: Event organizer is already approved
 *       404:
 *         description: Event organizer not found
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.patch('/event-organizers/:organizerId/approve', authenticate, adminAuth, adminController.approveEventOrganizer);

/**
 * @swagger
 * /api/admin/event-managers-with-events:
 *   get:
 *     tags: [Admin]
 *     summary: Get all event managers with their assigned events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event managers with events
 *       401:
 *         description: Unauthorized
 */
router.get('/event-managers-with-events', authenticate, adminAuth, adminController.getAllEventManagersWithEvents);

/**
 * @swagger
 * /api/admin/event-organizers:
 *   get:
 *     tags: [Admin]
 *     summary: Get all event organizers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event organizers
 *       401:
 *         description: Unauthorized
 */
router.get('/event-organizers', authenticate, adminAuth, adminController.getAllEventOrganizers);

/**
 * @swagger
 * /api/admin/event-staff-with-events:
 *   get:
 *     tags: [Admin]
 *     summary: Get all event staff with their assigned events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event staff with events
 *       401:
 *         description: Unauthorized
 */
router.get('/event-staff-with-events', authenticate, adminAuth, adminController.getAllEventStaffWithEvents);
>>>>>>> Stashed changes

export default router; 