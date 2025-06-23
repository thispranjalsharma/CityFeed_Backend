import { Router } from 'express';
import { registerSuperAdmin } from '../controllers/superAdmin.controller';

const router = Router();

/**
 * @swagger
 * /api/super-admin/register:
 *   post:
 *     tags: [SuperAdmin]
 *     summary: Register a new super admin
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Super admin registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/register', registerSuperAdmin);

export default router; 