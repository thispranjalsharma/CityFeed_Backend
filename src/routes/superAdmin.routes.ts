import { Router } from 'express';
import { registerSuperAdmin } from '../controllers/superAdmin.controller';

const router = Router();

/**
 * @swagger
 * /api/super-admin/register:
 *   post:
 *     summary: Register a new super admin
 *     tags: [SuperAdmin]
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
 *                 description: Full name of the super admin
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 description: Email address of the super admin
 *                 example: superadmin@example.com
 *               password:
 *                 type: string
 *                 description: Password for the super admin
 *                 example: password123
 *               phone:
 *                 type: string
 *                 description: Phone number of the super admin
 *                 example: '+1234567890'
 *     responses:
 *       201:
 *         description: Super admin registered successfully
 */
router.post('/register', registerSuperAdmin);

export default router; 