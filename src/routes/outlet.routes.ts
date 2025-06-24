import { Router } from 'express';
import { createOutlet, getOutletsBySuperAdmin, assignAdmin, assignRoleToEmployee } from '../controllers/outlet.controller';
import { authenticate } from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /api/outlets:
 *   post:
 *     tags: [Outlet]
 *     summary: Create a new outlet with admin info (form data)
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
 *               - images
 *               - defaultMaxDiscount
 *               - adminEmail
 *               - adminPassword
 *               - adminPhone
 *             properties:
 *               businessName:
 *                 type: string
 *               businessType:
 *                 type: string
 *               businessDescription:
 *                 type: string
 *               category:
 *                 type: string
 *               address:
 *                 type: string
 *               location:
 *                 type: string
 *                 description: 'GeoJSON Point as string, e.g. {"type":"Point","coordinates":[77.5946,12.9716]}'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               defaultMaxDiscount:
 *                 type: number
 *               adminEmail:
 *                 type: string
 *               adminPassword:
 *                 type: string
 *               adminPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Outlet and admin created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authenticate, upload.array('images', 5), createOutlet);

/**
 * @swagger
 * /api/outlets:
 *   get:
 *     tags: [Outlet]
 *     summary: Get all outlets for the logged-in super admin
 *     responses:
 *       200:
 *         description: List of outlets
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getOutletsBySuperAdmin);

/**
 * @swagger
 * /api/outlets/assign-admin:
 *   patch:
 *     tags: [Outlet]
 *     summary: Assign admin to outlet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outletId
 *               - adminId
 *             properties:
 *               outletId:
 *                 type: string
 *               adminId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin assigned successfully
 *       400:
 *         description: Invalid input data
 */
router.patch('/assign-admin', authenticate, assignAdmin);

/**
 * @swagger
 * /api/outlets/{outletId}/roles:
 *   post:
 *     tags: [Outlet]
 *     summary: Assign role and responsibilities to employee for an outlet
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - phone
 *               - role
 *               - responsibilities
 *             properties:
 *               email:
 *                 type: string
 *                 description: Employee's email address
 *                 example: employee@example.com
 *               password:
 *                 type: string
 *                 description: Employee's password
 *                 example: password123
 *               phone:
 *                 type: string
 *                 description: Employee's phone number
 *                 example: "+1234567890"
 *               role:
 *                 type: string
 *                 description: Role to assign (e.g., waiter, manager, etc.)
 *                 example: waiter
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of responsibilities
 *                 example: ["take_orders", "serve_food"]
 *               name:
 *                 type: string
 *                 description: Employee's name (optional, defaults to email prefix)
 *                 example: "John Doe"
 *     responses:
 *       201:
 *         description: Role assigned successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/:outletId/roles', authenticate, assignRoleToEmployee);

export default router; 