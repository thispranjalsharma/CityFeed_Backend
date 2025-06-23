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
router.post('/', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      businessDescription,
      category,
      address,
      location,
      defaultMaxDiscount,
      adminEmail,
      adminPassword,
      adminPhone
    } = req.body;
    if (!businessName || !businessType || !businessDescription || !category || !address || !location || !defaultMaxDiscount || !adminEmail || !adminPassword || !adminPhone) {
      return res.status(400).json({ success: false, message: 'All outlet and admin fields are required' });
    }
    // Implement actual logic to create outlet and admin here using only the above fields
    return res.status(201).json({ 
      success: true, 
      message: 'Outlet and admin created successfully (implement logic)',
      token: 'dummy-jwt-token-for-testing' // Add a dummy token for testing
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - role
 *               - responsibilities
 *             properties:
 *               employeeId:
 *                 type: string
 *               role:
 *                 type: string
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/:outletId/roles', authenticate, assignRoleToEmployee);

export default router; 