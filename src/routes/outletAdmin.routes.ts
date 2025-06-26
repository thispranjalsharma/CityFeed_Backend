import { Router } from 'express';
import { getMyOutlet } from '../controllers/outlet.controller';
import { getMyEmployeesForOutletAdmin } from '../controllers/outletRoleAssignment.controller';
import { OfferController } from '../controllers/offer.controller';
import { authenticate, outletAdminAuth } from '../middleware/auth.middleware';
import { getMyProfile, updateMyProfile, deleteMyProfile } from '../controllers/outletAdmin.controller';

const router = Router();

const offerController = new OfferController();

/**
 * @swagger
 * /api/outlet-admin/my-outlet:
 *   get:
 *     summary: Get the outlet assigned to the authenticated outlet admin
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The outlet
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/my-outlet', authenticate, outletAdminAuth, getMyOutlet);

/**
 * @swagger
 * /api/outlet-admin/my-employees:
 *   get:
 *     summary: Get all employees for the outlet assigned to the authenticated outlet admin
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/my-employees', authenticate, outletAdminAuth, getMyEmployeesForOutletAdmin);

/**
 * @swagger
 * /api/outlet-admin/my-offers:
 *   get:
 *     summary: Get all offers for the outlet assigned to the authenticated outlet admin
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of offers
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/my-offers', authenticate, outletAdminAuth, offerController.getMyOffersForOutletAdmin);

/**
 * @swagger
 * /api/outlet-admin/profile:
 *   get:
 *     summary: Get outlet admin profile
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Outlet admin profile
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/profile', authenticate, outletAdminAuth, getMyProfile);

/**
 * @swagger
 * /api/outlet-admin/profile:
 *   put:
 *     summary: Update outlet admin profile
 *     tags: [OutletAdmin]
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
 *                 example: "Outlet Admin Name"
 *               email:
 *                 type: string
 *                 example: "outletadmin@example.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.put('/profile', authenticate, outletAdminAuth, updateMyProfile);

/**
 * @swagger
 * /api/outlet-admin/profile:
 *   delete:
 *     summary: Delete outlet admin profile
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.delete('/profile', authenticate, outletAdminAuth, deleteMyProfile);

export default router; 