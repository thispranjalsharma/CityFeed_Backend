import { Router } from 'express';
import { getMyOutlet } from '../controllers/outlet.controller';
import { getEmployeesByOutlet, getMyEmployees, activateStaff, deactivateStaff } from '../controllers/staff.controller';
import { OfferController } from '../controllers/offer.controller';
import { authenticate, outletAdminAuth } from '../middleware/auth.middleware';
import { 
  getMyProfile, 
  updateMyProfile, 
  deleteMyProfile,
  getDeletedOutletAdmins,
  restoreOutletAdmin,
  softDeleteOutletAdmin,
  registerOutletAdmin
} from '../controllers/outletAdmin.controller';
import * as expressValidator from 'express-validator';
import { validateRequest, isValidPhone, isStrongPassword } from '../middleware/validation.middleware';

const { body } = expressValidator;

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
router.get('/my-outlet', authenticate, outletAdminAuth, (req, res) => getMyOutlet(req as any, res));

/**
 * @swagger
 * /api/outlet-admin/my-employees:
 *   get:
 *     summary: Get my employees (Outlet Admin only)
 *     description: Retrieve all employees assigned to the outlet where the outlet admin is assigned
 *     tags: [OutletAdmin]
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
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only outlet admins can access this endpoint
 *       404:
 *         description: No outlet found for this admin
 *       500:
 *         description: Server error
 */
router.get('/my-employees', authenticate, outletAdminAuth, (req, res) => getMyEmployees(req as any, res));


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
router.get('/my-offers', authenticate, outletAdminAuth, (req, res) => offerController.getMyOffersForOutletAdmin(req as any, res));

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
router.get('/profile', authenticate, outletAdminAuth, (req, res) => getMyProfile(req as any, res));

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
 *                 description: "Outlet admin name (optional)"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *                 description: "Outlet admin phone number (optional)"
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
router.put('/profile', authenticate, outletAdminAuth, validateRequest([
  body('name').optional().isString().withMessage('Name must be a string'),
  body('phone').optional().isString().withMessage('Phone must be a string')
]), (req, res) => updateMyProfile(req as any, res));

/**
 * @swagger
 * /api/outlet-admin/profile:
 *   delete:
 *     summary: Soft delete outlet admin profile
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile soft deleted successfully
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.delete('/profile', authenticate, outletAdminAuth, (req, res) => deleteMyProfile(req as any, res));

/**
 * @swagger
 * /api/outlet-admin/deleted:
 *   get:
 *     summary: Get all soft deleted outlet admins (Super Admin only)
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of soft deleted outlet admins
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       isDeleted:
 *                         type: boolean
 *                         example: true
 *                       deletedAt:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *                   example: "Retrieved 5 deleted outlet admins"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only super admins can view deleted outlet admins
 */
router.get('/deleted', authenticate, (req, res) => {
  // Check if user is super admin
  const user = (req as any).user;
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Only super admins can view deleted outlet admins' 
    });
  }
  return getDeletedOutletAdmins(req as any, res);
});

/**
 * @swagger
 * /api/outlet-admin/{adminId}/restore:
 *   patch:
 *     summary: Restore a soft deleted outlet admin (Super Admin only)
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the soft deleted outlet admin to restore
 *     responses:
 *       200:
 *         description: Outlet admin restored successfully
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
 *                   example: "Outlet admin restored successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outletAdmin:
 *                       type: object
 *       404:
 *         description: Outlet admin not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only super admins can restore outlet admins
 */
router.patch('/:adminId/restore', authenticate, (req, res) => {
  // Check if user is super admin
  const user = (req as any).user;
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Only super admins can restore outlet admins' 
    });
  }
  return restoreOutletAdmin(req as any, res);
});

/**
 * @swagger
 * /api/outlet-admin/{adminId}:
 *   delete:
 *     summary: Soft delete an outlet admin (Super Admin only)
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet admin to soft delete
 *     responses:
 *       200:
 *         description: Outlet admin soft deleted successfully
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
 *                   example: "Outlet admin soft deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outletAdmin:
 *                       type: object
 *       404:
 *         description: Outlet admin not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only super admins can delete outlet admins
 */
router.delete('/:adminId', authenticate, (req, res) => {
  // Check if user is super admin
  const user = (req as any).user;
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Only super admins can delete outlet admins' 
    });
  }
  return softDeleteOutletAdmin(req as any, res);
});

/**
 * @swagger
 * /api/outlet-admin/register:
 *   post:
 *     summary: Register a new outlet admin (Super Admin only)
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
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
 *                 example: "Outlet Admin Name"
 *               email:
 *                 type: string
 *                 example: "outletadmin@example.com"
 *               password:
 *                 type: string
 *                 example: "StrongP@ssw0rd123"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Outlet admin registered successfully
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
 *                   example: "Outlet admin registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outletAdmin:
 *                       type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Invalid token
 *       403:
 *         description: Forbidden - Only super admins can create outlet admins
 *       409:
 *         description: Email or phone number already in use
 */
router.post(
  '/register',
  authenticate,
  (req, res, next) => {
    // Check if user is super admin
    const user = (req as any).user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden - Only super admins can create outlet admins' 
      });
    }
    next();
  },
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
  registerOutletAdmin
);

/**
 * @swagger
 * /api/outlet-admin/staff/{staffId}/activate:
 *   patch:
 *     summary: Activate a staff member (Outlet Admin only)
 *     description: Activate a staff member from the outlet assigned to the outlet admin
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the staff member to activate
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Staff member activated successfully
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
 *                   example: "Staff member activated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     staff:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         name:
 *                           type: string
 *                           example: "John Employee"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         role:
 *                           type: string
 *                           example: "employee"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only outlet admins can activate staff
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.patch('/staff/:staffId/activate', authenticate, outletAdminAuth, (req, res) => activateStaff(req as any, res));

/**
 * @swagger
 * /api/outlet-admin/staff/{staffId}/deactivate:
 *   patch:
 *     summary: Deactivate a staff member (Outlet Admin only)
 *     description: Deactivate a staff member from the outlet assigned to the outlet admin
 *     tags: [OutletAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the staff member to deactivate
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Staff member deactivated successfully
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
 *                   example: "Staff member deactivated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     staff:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         name:
 *                           type: string
 *                           example: "John Employee"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         role:
 *                           type: string
 *                           example: "employee"
 *                         isActive:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only outlet admins can deactivate staff
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.patch('/staff/:staffId/deactivate', authenticate, outletAdminAuth, (req, res) => deactivateStaff(req as any, res));

export default router; 