import { Router } from 'express';
import { assignRoleToOutlet, getRolesForOutlet } from '../controllers/outletRoleAssignment.controller';
import { authenticate } from '../middleware/auth.middleware';

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

export default router; 