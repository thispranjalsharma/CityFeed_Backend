import { Router } from 'express';
import { 
  createOutlet, 
  getOutletsBySuperAdmin, 
  getOutletById,
  updateOutlet,
  deleteOutlet,
  restoreOutlet,
  getDeletedOutlets,
  updateOutletStatus,
  getOutletsByStatus,
  assignAdmin, 
  removeAdmin,
  assignRoleToEmployee,
  fixOutletStatus
} from '../controllers/outlet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import upload from '../middleware/upload.middleware';
import { Outlet } from '../models/outlet.model';
import { Review } from '../models/review.model';

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
 *         isDeleted:
 *           type: boolean
 *           example: false
 *           description: Soft delete flag - indicates if the outlet has been deleted
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           example: null
 *           description: Timestamp when the outlet was soft deleted (null if not deleted)
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
 *     summary: Get all active outlets (public)
 *     description: |
 *       Returns all active outlets that are not soft deleted. This endpoint is publicly accessible
 *       and does not require authentication. Soft deleted outlets are automatically excluded.
 *     tags: [Outlets]
 *     responses:
 *       200:
 *         description: List of all active outlets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Outlet'
 *       500:
 *         description: Internal server error
 */
router.get('/public', async (req, res) => {
  try {
    const outlets = await Outlet.find({
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    // Get all outlet IDs
    const outletIds = outlets.map(outlet => outlet._id);
    // Aggregate average ratings for all outlets
    const ratings = await Review.aggregate([
      { $match: { outletId: { $in: outletIds } } },
      { $group: { _id: '$outletId', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
    ]);
    // Map outletId to rating
    const ratingMap = {};
    ratings.forEach(r => {
      ratingMap[r._id.toString()] = { avgRating: r.avgRating, reviewCount: r.reviewCount };
    });
    // Attach rating to each outlet
    const outletsWithRating = outlets.map(outlet => {
      const ratingInfo = ratingMap[outlet._id.toString()] || { avgRating: null, reviewCount: 0 };
      return {
        ...outlet.toObject(),
        avgRating: ratingInfo.avgRating,
        reviewCount: ratingInfo.reviewCount
      };
    });
    res.status(200).json({ success: true, data: outletsWithRating });
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
 *               - createDefaultOffer
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
 *               adminName:
 *                 type: string
 *                 description: "Name of the outlet admin (optional, defaults to email prefix if not provided)"
 *                 example: "John Doe"
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
 *               createDefaultOffer:
 *                 type: boolean
 *                 description: "Whether to create a default offer for the outlet (default: false)"
 *                 example: false
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
router.post('/', authenticate, upload.array('images', 5),
  validateRequest([
    body('businessName').isString().notEmpty(),
    body('businessType').isString().notEmpty(),
    body('businessDescription').isString().notEmpty(),
    body('category').isString().notEmpty(),
    body('address').isString().notEmpty(),
    body('location').isString().notEmpty(),
    body('defaultMaxDiscount').isNumeric(),
    body('adminEmail').isString().notEmpty(),
    body('adminPassword').isString().notEmpty(),
    body('adminPhone').isString().notEmpty(),
    body('createDefaultOffer').optional().isBoolean()
  ]),
  createOutlet
);

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
 *     summary: Search outlets by business name
 *     tags: [Outlets]
 *     parameters:
 *       - in: query
 *         name: businessName
 *         schema:
 *           type: string
 *         description: Search by business name (partial match)
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Outlet'
 */
router.get('/search', async (req, res) => {
  try {
    const { businessName } = req.query;
    if (!businessName || typeof businessName !== 'string') {
      return res.status(400).json({ success: false, message: 'businessName query parameter is required' });
    }
    // Use imported Outlet directly
    const outlets = await Outlet.find({ businessName: { $regex: businessName, $options: 'i' } });
    res.status(200).json({ success: true, data: outlets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
 *     summary: Get outlet by ID (Super Admin or assigned Outlet Admin)
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
 *     summary: Update outlet details (Super Admin or assigned Outlet Admin)
 *     description: |
 *       Super Admins can update all fields including admin assignment.
 *       Outlet Admins can update outlet details but cannot assign new admins.
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
 *               adminName:
 *                 type: string
 *                 description: "Name of the outlet admin (optional, updates existing admin name if provided)"
 *                 example: "Jane Smith"
 *               adminEmail:
 *                 type: string
 *                 format: email
 *                 example: "newadmin@restaurant.com"
 *                 description: "Only Super Admins can assign new admins"
 *               adminPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newpassword123"
 *                 description: "Only Super Admins can assign new admins"
 *               adminPhone:
 *                 type: string
 *                 example: "+1987654321"
 *                 description: "Only Super Admins can assign new admins"
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
  body('adminName').optional().isString(),
  body('adminEmail').optional(),
  body('adminPassword').optional().isString(),
  body('adminPhone').optional().isString()
]), updateOutlet);

/**
 * @swagger
 * /api/outlets/{outletId}:
 *   delete:
 *     tags: [Outlet]
 *     summary: Soft delete an outlet
 *     description: |
 *       This endpoint performs a soft delete operation. The outlet is marked as deleted
 *       but remains in the database. All associated offers are also soft deleted.
 *       Deleted outlets can be restored using the restore endpoint.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet to soft delete
 *     responses:
 *       200:
 *         description: Outlet soft deleted successfully
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
 * /api/outlets/{outletId}/restore:
 *   patch:
 *     tags: [Outlet]
 *     summary: Restore a soft deleted outlet
 *     description: |
 *       This endpoint restores a previously soft deleted outlet. The outlet becomes active again
 *       and can be accessed normally. Only the super admin who created the outlet can restore it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the soft deleted outlet to restore
 *     responses:
 *       200:
 *         description: Outlet restored successfully
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
 *                   example: "Outlet restored successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outlet:
 *                       $ref: '#/components/schemas/Outlet'
 *       400:
 *         description: Outlet is not deleted or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Outlet is not deleted"
 *       404:
 *         description: Outlet not found
 *       403:
 *         description: Not authorized to restore this outlet
 *       401:
 *         description: Unauthorized
 */
router.patch('/:outletId/restore', authenticate, restoreOutlet);

/**
 * @swagger
 * /api/outlets/deleted:
 *   get:
 *     tags: [Outlet]
 *     summary: Get all soft deleted outlets for the logged-in super admin
 *     description: |
 *       This endpoint retrieves all soft deleted outlets that were created by the authenticated super admin.
 *       Only soft deleted outlets are returned. Active outlets are not included in this response.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of soft deleted outlets
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
 *                   example: "Retrieved 2 deleted outlets"
 *       401:
 *         description: Unauthorized
 */
router.get('/deleted', authenticate, getDeletedOutlets);

/**
 * @swagger
 * /api/outlets/{outletId}/status:
 *   patch:
 *     tags: [Outlet]
 *     summary: Update outlet status (activate/deactivate) - Super Admin or assigned Outlet Admin
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
 *     summary: Remove admin from outlet (Super Admin or self-removal by Outlet Admin)
 *     description: |
 *       Super Admins can remove any admin from outlets they created.
 *       Outlet Admins can remove themselves from their assigned outlet.
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
 *               name:
 *                 type: string
 *                 description: Employee's name (optional, defaults to email prefix if not provided)
 *                 example: "John Doe"
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
 *                         name:
 *                           type: string
 *                           example: "John Doe"
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
  body('name').optional().isString().withMessage('Name must be a string'),
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