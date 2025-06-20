import { Router } from 'express';
import { assignRoleToOutlet, getRolesForOutlet } from '../controllers/outletRoleAssignment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/outlet-role-assignment/{outletId}/roles:
 *   post:
 *     summary: Assign role and responsibilities to an outlet
 *     tags: [OutletRoleAssignment]
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
 *               role:
 *                 type: string
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role assigned successfully
 */
router.post('/:outletId/roles', authenticate, assignRoleToOutlet);

/**
 * @swagger
 * /api/outlet-role-assignment/{outletId}/roles:
 *   get:
 *     summary: Get all role assignments for an outlet
 *     tags: [OutletRoleAssignment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of role assignments
 */
router.get('/:outletId/roles', authenticate, getRolesForOutlet);

export default router; 