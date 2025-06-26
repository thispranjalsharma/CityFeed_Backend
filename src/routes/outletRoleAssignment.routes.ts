import { Router } from 'express';
import { assignRoleToOutlet, getRolesForOutlet, getMyProfile, updateMyProfile, deleteMyProfile } from '../controllers/outletRoleAssignment.controller';
import { authenticate, employeeAuth } from '../middleware/auth.middleware';

const router = Router();

// Assign role and responsibilities to an outlet
/**
 * @swagger
 * /api/outlet-role-assignment/assign:
 *   post:
 *     tags: [OutletRoleAssignment]
 *     summary: Assign a role to an outlet admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outletAdminId
 *               - role
 *             properties:
 *               outletAdminId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [manager, staff, other]
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/:outletId/roles', authenticate, assignRoleToOutlet);

// Get all role assignments for an outlet
/**
 * @swagger
 * /api/outlet-role-assignment/{outletId}/roles:
 *   get:
 *     tags: [OutletRoleAssignment]
 *     summary: Get all role assignments for an outlet
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of role assignments
 *       400:
 *         description: Invalid outlet ID
 */
router.get('/:outletId/roles', authenticate, getRolesForOutlet);

/**
 * @swagger
 * /api/employee/profile:
 *   get:
 *     summary: Get employee profile
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee profile
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.get('/profile', authenticate, employeeAuth, (req, res) => getMyProfile(req as any, res));

/**
 * @swagger
 * /api/employee/profile:
 *   put:
 *     summary: Update employee profile
 *     tags: [Employee]
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
 *                 example: "Employee Name"
 *               email:
 *                 type: string
 *                 example: "employee@example.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.put('/profile', authenticate, employeeAuth, (req, res) => updateMyProfile(req as any, res));

/**
 * @swagger
 * /api/employee/profile:
 *   delete:
 *     summary: Delete employee profile
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 *       401:
 *         description: Unauthorized - Invalid token
 */
router.delete('/profile', authenticate, employeeAuth, (req, res) => deleteMyProfile(req as any, res));

export default router; 