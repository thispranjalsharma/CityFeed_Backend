import { Router } from 'express';
import { createOutlet, getOutletsBySuperAdmin, assignAdmin, assignRoleToEmployee } from '../controllers/outlet.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /api/outlets:
 *   post:
 *     summary: Create a new outlet
 *     tags: [Outlets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - businessType
 *               - businessDescription
 *               - category
 *               - address
 *               - location
 *               - defaultMaxDiscount
 *               - adminEmail
 *               - adminPassword
 *               - adminPhone
 *             properties:
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *                 example: My Restaurant
 *               businessType:
 *                 type: string
 *                 description: Type of business (e.g., cafe, restaurant)
 *                 example: restaurant
 *               businessDescription:
 *                 type: string
 *                 description: Description of the business
 *                 example: A great place to eat
 *               category:
 *                 type: string
 *                 description: Type of food served (veg, non-veg, both)
 *                 example: both
 *               address:
 *                 type: string
 *                 description: Business address
 *                 example: 123 Main St
 *               location:
 *                 type: string
 *                 description: Business location coordinates in GeoJSON format
 *                 example: '{"type":"Point","coordinates":[77.5946,12.9716]}'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Business images (max 5 images, 5MB each)
 *               defaultMaxDiscount:
 *                 type: number
 *                 description: Maximum discount percentage that can be offered (0-100)
 *                 example: 30
 *               adminEmail:
 *                 type: string
 *                 description: Email of the outlet admin
 *                 example: admin@myrestaurant.com
 *               adminPassword:
 *                 type: string
 *                 description: Password for the outlet admin
 *                 example: password123
 *               adminPhone:
 *                 type: string
 *                 description: Phone number of the outlet admin
 *                 example: '+1234567890'
 *     responses:
 *       201:
 *         description: Outlet created successfully
 */
router.post('/', authenticate, authorize('super_admin'), upload.array('images', 5), createOutlet);

/**
 * @swagger
 * /api/outlets:
 *   get:
 *     summary: Get all outlets for the logged-in super admin
 *     tags: [Outlets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of outlets
 */
router.get('/', authenticate, getOutletsBySuperAdmin);

/**
 * @swagger
 * /api/outlets/assign-admin:
 *   patch:
 *     summary: Assign admin to outlet
 *     tags: [Outlets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               outletId:
 *                 type: string
 *               adminId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin assigned successfully
 */
router.patch('/assign-admin', authenticate, assignAdmin);

/**
 * @swagger
 * /api/outlets/{outletId}/roles:
 *   post:
 *     summary: Assign role and responsibilities to employee for an outlet
 *     tags: [Outlets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role assigned successfully
 */
router.post('/:outletId/roles', authenticate, assignRoleToEmployee);

export default router; 