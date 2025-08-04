import { Router } from 'express';
import { 
  assignRoleToOutlet, 
  getMyProfile, 
  updateMyProfile, 
  deleteMyProfile,
  updateStaffResponsibilities,
  getStaffById,
  getAvailableResponsibilities,
  activateStaff,
  deactivateStaff
} from '../controllers/staff.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

/**
 * @swagger
 * /api/staff/assign-role:
 *   post:
 *     tags: [Staff]
 *     summary: Assign employee to outlet
 *     description: Create a new employee and assign them to an outlet with flexible responsibilities. All staff members have the role "employee" with customizable responsibilities.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outlet
 *               - role
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               outlet:
 *                 type: string
 *                 description: Outlet ID
 *                 example: "507f1f77bcf86cd799439011"
 *               role:
 *                 type: string
 *                 description: Role is automatically set to "employee" for all staff members
 *                 example: "employee"
 *                 readOnly: true
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of responsibilities for this staff member
 *                 example: ["create_offer", "update_offer", "view_order", "manage_inventory", "handle_complaints", "manage_customers"]
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff member's email address
 *                 example: "employee@restaurant.com"
 *               password:
 *                 type: string
 *                 description: Staff member's password
 *                 example: "SecurePassword123!"
 *               phone:
 *                 type: string
 *                 description: Staff member's phone number
 *                 example: "+1234567890"
 *               name:
 *                 type: string
 *                 description: Staff member's name
 *                 example: "John Employee"
 *     responses:
 *       201:
 *         description: Role assigned successfully and verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 verificationToken:
 *                   type: string
 *                   description: JWT token for email verification (for testing purposes)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 verificationUrl:
 *                   type: string
 *                   description: Complete verification URL (for testing purposes)
 *                   example: "https://cityfeed-admin.vercel.app/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&role=employee"
 *                 message:
 *                   type: string
 *                   example: "Staff member assigned successfully. Verification email has been sent."
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Bad request - Invalid input data or validation error
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
 *                   example: "Validation error: Email is required"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       409:
 *         description: Conflict - Staff member with this email already exists
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
 *                   example: "Staff member with email employee@restaurant.com already exists"
 *       500:
 *         description: Server error
 */
router.post('/assign-role', authenticate, authorize('outlet_admin', 'super_admin'), assignRoleToOutlet);



/**
 * @swagger
 * /api/staff/available-responsibilities:
 *   get:
 *     tags: [Staff]
 *     summary: Get available responsibilities
 *     description: Retrieve a comprehensive list of all available responsibilities that can be flexibly assigned to employees. This allows for granular permission control without multiple role types.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available responsibilities retrieved successfully
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
 *                     type: string
 *                   example: ["create_offer", "update_offer", "view_order", "manage_inventory"]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/available-responsibilities', authenticate, authorize('super_admin', 'outlet_admin'), getAvailableResponsibilities);



/**
 * @swagger
 * /api/staff/profile:
 *   get:
 *     tags: [Staff]
 *     summary: Get staff profile
 *     description: Retrieve the current staff member's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Staff]
 *     summary: Update staff profile
 *     description: Update the current staff member's profile information. Only name and phone can be modified. Email cannot be updated.
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
 *                 description: Staff member's name
 *                 example: "John Employee"
 *               phone:
 *                 type: string
 *                 description: Staff member's phone number
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Bad request - Invalid input data or email update attempted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Staff]
 *     summary: Delete staff profile (soft delete)
 *     description: Soft delete the current staff member's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
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
 *                   example: "Profile deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
router.route('/profile')
  .get(authenticate, authorize('employee'), getMyProfile)
  .put(authenticate, authorize('employee'), validateRequest([
    body('name').optional().isString().withMessage('Name must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string')
  ]), updateMyProfile)
  .delete(authenticate, authorize('employee'), deleteMyProfile);

/**
 * @swagger
 * /api/staff/{staffId}:
 *   get:
 *     tags: [Staff]
 *     summary: Get staff member by ID
 *     description: Retrieve a specific staff member's details by their ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff member ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Staff member retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.get('/:staffId', authenticate, authorize('super_admin', 'outlet_admin'), getStaffById);

/**
 * @swagger
 * /api/staff/{staffId}/responsibilities:
 *   put:
 *     tags: [Staff]
 *     summary: Update employee responsibilities
 *     description: Update the responsibilities assigned to a specific employee. This allows flexible permission management without changing the employee role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff member ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - responsibilities
 *             properties:
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of responsibilities to assign. Choose from available responsibilities for flexible permission control.
 *                 example: ["create_offer", "update_offer", "view_order", "manage_inventory", "view_feedback", "handle_complaints"]
 *     responses:
 *       200:
 *         description: Responsibilities updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Bad request - Invalid responsibilities format
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.put('/:staffId/responsibilities', authenticate, authorize('super_admin', 'outlet_admin'), updateStaffResponsibilities);

/**
 * @swagger
 * /api/staff/{staffId}/activate:
 *   patch:
 *     summary: Activate a staff member (Super Admin or Outlet Admin)
 *     description: |
 *       Activate a staff member with role-based permissions:
 *       
 *       **Super Admin Permissions:**
 *       - Can activate staff from any outlet they created
 *       - Cannot activate staff from outlets created by other super admins
 *       
 *       **Outlet Admin Permissions:**
 *       - Can activate staff only from their assigned outlet
 *       - Cannot activate staff from other outlets
 *       
 *       The system automatically checks permissions based on the authenticated user's role.
 *     tags: [Staff]
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
 *         description: Forbidden - Only super admins and outlet admins can activate staff, or insufficient permissions for this specific staff member
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.patch('/:staffId/activate', authenticate, authorize('super_admin', 'outlet_admin'), (req, res) => activateStaff(req as any, res));

/**
 * @swagger
 * /api/staff/{staffId}/deactivate:
 *   patch:
 *     summary: Deactivate a staff member (Super Admin or Outlet Admin)
 *     description: |
 *       Deactivate a staff member with role-based permissions:
 *       
 *       **Super Admin Permissions:**
 *       - Can deactivate staff from any outlet they created
 *       - Cannot deactivate staff from outlets created by other super admins
 *       
 *       **Outlet Admin Permissions:**
 *       - Can deactivate staff only from their assigned outlet
 *       - Cannot deactivate staff from other outlets
 *       
 *       The system automatically checks permissions based on the authenticated user's role.
 *     tags: [Staff]
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
 *         description: Forbidden - Only super admins and outlet admins can deactivate staff, or insufficient permissions for this specific staff member
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.patch('/:staffId/deactivate', authenticate, authorize('super_admin', 'outlet_admin'), (req, res) => deactivateStaff(req as any, res));



export default router; 