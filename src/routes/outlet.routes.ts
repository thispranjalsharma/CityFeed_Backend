import { Router } from 'express';
import { 
  createOutlet, 
  getOutletsBySuperAdmin, 
  getOutletById,
  updateOutlet,
  deleteOutlet,
  updateOutletStatus,
  getOutletsByStatus,
  searchOutlets,
  assignAdmin, 
  removeAdmin,
  assignRoleToEmployee,
  fixOutletStatus
} from '../controllers/outlet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, query } from 'express-validator';
import upload from '../middleware/upload.middleware';
import { Outlet } from '../models/outlet.model';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Outlet:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60d21b4667d0d8992e610c85"
 *         businessName:
 *           type: string
 *           example: "Downtown Restaurant"
 *         businessType:
 *           type: string
 *           example: "restaurant"
 *         businessDescription:
 *           type: string
 *           example: "A fine dining restaurant in downtown"
 *         category:
 *           type: string
 *           example: "both"
 *         address:
 *           type: string
 *           example: "123 Main Street, Downtown"
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               example: "Point"
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               example: [77.5946, 12.9716]
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *         defaultMaxDiscount:
 *           type: number
 *           example: 30
 *         createdBy:
 *           type: string
 *           example: "60d21b4667d0d8992e610c86"
 *         assignedAdmin:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "60d21b4667d0d8992e610c87"
 *             name:
 *               type: string
 *               example: "John Doe"
 *             email:
 *               type: string
 *               example: "admin@restaurant.com"
 *             phone:
 *               type: string
 *               example: "+1234567890"
 *             role:
 *               type: string
 *               example: "outlet_admin"
 *             isActive:
 *               type: boolean
 *               example: true
 *             isEmailVerified:
 *               type: boolean
 *               example: true
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 */

/**
 * @swagger
 * /api/outlets/public:
 *   get:
 *     summary: Get all outlets (public)
 *     tags: [Outlets]
 *     description: Returns all outlets. No authentication required.
 *     responses:
 *       200:
 *         description: List of all outlets
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
 *                     $ref: '#/components/schemas/Outlet'
 */
router.get('/public', async (req, res) => {
  try {
    const outlets = await Outlet.find();
    res.status(200).json({ success: true, data: outlets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/outlets:
 *   post:
 *     tags: [Outlet]
 *     summary: Create a new outlet with admin info
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
 *                 example: "Downtown Restaurant"
 *               businessType:
 *                 type: string
 *                 enum: [cafe, restaurant]
 *                 example: "restaurant"
 *               businessDescription:
 *                 type: string
 *                 example: "A fine dining restaurant in downtown"
 *               category:
 *                 type: string
 *                 enum: [veg, non-veg, both]
 *                 example: "both"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, Downtown"
 *               location:
 *                 type: string
 *                 description: 'GeoJSON Point as string, e.g. {"type":"Point","coordinates":[77.5946,12.9716]}'
 *                 example: '{"type":"Point","coordinates":[77.5946,12.9716]}'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Outlet images (max 5 images, 5MB each)
 *               defaultMaxDiscount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 30
 *               adminEmail:
 *                 type: string
 *                 format: email
 *                 example: "admin@restaurant.com"
 *               adminPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               adminPhone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Outlet and admin created successfully
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
 *                   example: "Outlet created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlet:
 *                       $ref: '#/components/schemas/Outlet'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, upload.array('images', 5), createOutlet);

/**
 * @swagger
 * /api/outlets:
 *   get:
 *     tags: [Outlet]
 *     summary: Get all outlets for the logged-in super admin
 *     security:
 *       - bearerAuth: []
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Outlet'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getOutletsBySuperAdmin);

/**
 * @swagger
 * /api/outlets/search:
 *   get:
 *     tags: [Outlet]
 *     summary: Search outlets by name, description, address, or category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term to find outlets
 *         example: "restaurant"
 *     responses:
 *       200:
 *         description: List of matching outlets
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
 *                         $ref: '#/components/schemas/Outlet'
 *                 message:
 *                   type: string
 *                   example: "Found 2 outlets matching \"restaurant\""
 *       400:
 *         description: Search term is required
 *       401:
 *         description: Unauthorized
 */
router.get('/search', authenticate, validateRequest([
  query('searchTerm').isString().notEmpty().withMessage('Search term is required')
]), searchOutlets);

/**
 * @swagger
 * /api/outlets/status/{status}:
 *   get:
 *     tags: [Outlet]
 *     summary: Get outlets by status (active/inactive)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Status of outlets to retrieve
 *         example: "active"
 *     responses:
 *       200:
 *         description: List of outlets with specified status
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
 *                         $ref: '#/components/schemas/Outlet'
 *                 message:
 *                   type: string
 *                   example: "Retrieved 3 active outlets"
 *       400:
 *         description: Invalid status parameter
 *       401:
 *         description: Unauthorized
 */
router.get('/status/:status', authenticate, getOutletsByStatus);

/**
 * @swagger
 * /api/outlets/{outletId}:
 *   get:
 *     tags: [Outlet]
 *     summary: Get outlet by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet
 *     responses:
 *       200:
 *         description: Outlet details
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
 *                       $ref: '#/components/schemas/Outlet'
 *       404:
 *         description: Outlet not found
 *       403:
 *         description: Not authorized to access this outlet
 *       401:
 *         description: Unauthorized
 */
router.get('/:outletId', authenticate, getOutletById);

/**
 * @swagger
 * /api/outlets/{outletId}:
 *   put:
 *     tags: [Outlet]
 *     summary: Update outlet details
 *     security:
 *       - bearerAuth: []
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: "Updated Restaurant Name"
 *               businessType:
 *                 type: string
 *                 enum: [cafe, restaurant]
 *                 example: "restaurant"
 *               businessDescription:
 *                 type: string
 *                 example: "Updated description"
 *               category:
 *                 type: string
 *                 enum: [veg, non-veg, both]
 *                 example: "both"
 *               address:
 *                 type: string
 *                 example: "456 New Street, Downtown"
 *               location:
 *                 type: string
 *                 description: 'GeoJSON Point as string'
 *                 example: '{"type":"Point","coordinates":[77.5946,12.9716]}'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: New outlet images (max 5 images, 5MB each)
 *               defaultMaxDiscount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 25
 *               adminEmail:
 *                 type: string
 *                 format: email
 *                 example: "newadmin@restaurant.com"
 *               adminPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newpassword123"
 *               adminPhone:
 *                 type: string
 *                 example: "+1987654321"
 *     responses:
 *       200:
 *         description: Outlet updated successfully
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
 *                   example: "Outlet updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlet:
 *                       $ref: '#/components/schemas/Outlet'
 *       404:
 *         description: Outlet not found
 *       403:
 *         description: Not authorized to update this outlet
 *       401:
 *         description: Unauthorized
 */
router.put('/:outletId', authenticate, upload.array('images', 5), validateRequest([
  body('businessName').optional().isString(),
  body('businessType').optional().isString(),
  body('businessDescription').optional().isString(),
  body('category').optional().isString(),
  body('address').optional().isString(),
  body('location').optional().isString(),
  body('defaultMaxDiscount').optional(),
  body('adminEmail').optional(),
  body('adminPassword').optional().isString(),
  body('adminPhone').optional().isString()
]), updateOutlet);

/**
 * @swagger
 * /api/outlets/{outletId}:
 *   delete:
 *     tags: [Outlet]
 *     summary: Delete an outlet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet
 *     responses:
 *       200:
 *         description: Outlet deleted successfully
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
 *                   example: "Outlet deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlet:
 *                       $ref: '#/components/schemas/Outlet'
 *       404:
 *         description: Outlet not found
 *       403:
 *         description: Not authorized to delete this outlet
 *       401:
 *         description: Unauthorized
 */
router.delete('/:outletId', authenticate, deleteOutlet);

/**
 * @swagger
 * /api/outlets/{outletId}/status:
 *   patch:
 *     tags: [Outlet]
 *     summary: Update outlet status (activate/deactivate)
 *     security:
 *       - bearerAuth: []
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
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Whether the outlet should be active or inactive
 *                 example: false
 *     responses:
 *       200:
 *         description: Outlet status updated successfully
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
 *                   example: "Outlet deactivated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlet:
 *                       $ref: '#/components/schemas/Outlet'
 *       404:
 *         description: Outlet not found
 *       403:
 *         description: Not authorized to update this outlet
 *       401:
 *         description: Unauthorized
 */
router.patch('/:outletId/status', authenticate, validateRequest([
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
]), updateOutletStatus);

/**
 * @swagger
 * /api/outlets/assign-admin:
 *   patch:
 *     tags: [Outlet]
 *     summary: Assign admin to outlet
 *     security:
 *       - bearerAuth: []
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
 *                 description: The ID of the outlet
 *               adminId:
 *                 type: string
 *                 description: The ID of the admin
 *     responses:
 *       200:
 *         description: Admin assigned successfully
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
 *                   example: "Admin assigned successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlet:
 *                       $ref: '#/components/schemas/Outlet'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.patch('/assign-admin', authenticate, validateRequest([
  body('outletId').isString().withMessage('Invalid outlet ID'),
  body('adminId').isString().withMessage('Invalid admin ID')
]), assignAdmin);

/**
 * @swagger
 * /api/outlets/{outletId}/remove-admin:
 *   patch:
 *     tags: [Outlet]
 *     summary: Remove admin from outlet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet
 *     responses:
 *       200:
 *         description: Admin removed successfully
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
 *                   example: "Admin removed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlet:
 *                       $ref: '#/components/schemas/Outlet'
 *       404:
 *         description: Outlet not found
 *       403:
 *         description: Not authorized to update this outlet
 *       401:
 *         description: Unauthorized
 */
router.patch('/:outletId/remove-admin', authenticate, removeAdmin);

/**
 * @swagger
 * /api/outlets/{outletId}/roles:
 *   post:
 *     tags: [Outlet]
 *     summary: Assign role and responsibilities to employee for an outlet
 *     security:
 *       - bearerAuth: []
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
 *                 format: email
 *                 description: Employee's email address
 *                 example: "employee@restaurant.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Employee's password
 *                 example: "password123"
 *               phone:
 *                 type: string
 *                 description: Employee's phone number
 *                 example: "+1234567890"
 *               role:
 *                 type: string
 *                 description: Role to assign (e.g., waiter, manager, etc.)
 *                 example: "waiter"
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of responsibilities
 *                 example: ["take_orders", "serve_food", "clean_tables"]
 *               name:
 *                 type: string
 *                 description: Employee's name (optional, defaults to email prefix)
 *                 example: "John Doe"
 *     responses:
 *       201:
 *         description: Role assigned successfully
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
 *                   example: "Role assigned successfully. Verification email sent to employee."
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignment:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60d21b4667d0d8992e610c88"
 *                         email:
 *                           type: string
 *                           example: "employee@restaurant.com"
 *                         role:
 *                           type: string
 *                           example: "employee"
 *                         responsibilities:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["take_orders", "serve_food", "clean_tables"]
 *                         isEmailVerified:
 *                           type: boolean
 *                           example: false
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/:outletId/roles', authenticate, validateRequest([
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').isString().withMessage('Phone is required'),
  body('role').isString().withMessage('Role is required'),
  body('responsibilities').isArray().withMessage('Responsibilities must be an array')
]), assignRoleToEmployee);

/**
 * @swagger
 * /api/outlets/fix-status:
 *   post:
 *     tags: [Outlet]
 *     summary: Fix outlets without isActive field
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Outlets fixed successfully
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
 *                   example: "Outlets fixed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Outlet'
 *       401:
 *         description: Unauthorized
 */
router.post('/fix-status', authenticate, fixOutletStatus);

export default router; 