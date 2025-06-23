import { Router } from 'express';
import { assignRoleToOutlet, getRolesForOutlet } from '../controllers/outletRoleAssignment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Assign role and responsibilities to an outlet
router.post('/:outletId/roles', authenticate, assignRoleToOutlet);

// Get all role assignments for an outlet
router.get('/:outletId/roles', authenticate, getRolesForOutlet);

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

export default router; 