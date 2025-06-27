import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * /api/employee/{employeeId}:
 *   put:
 *     summary: Update employee details (Super Admin/Outlet Admin only)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the employee to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Employee's name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Employee's email
 *               phone:
 *                 type: string
 *                 description: Employee's phone number
 *               role:
 *                 type: string
 *                 enum: [employee, outlet_admin]
 *                 description: Employee's role
 *               isActive:
 *                 type: boolean
 *                 description: Whether the employee is active
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Employee's responsibilities
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only super admin or outlet admin can update employees
 *       404:
 *         description: Employee not found
 */
router.put('/:employeeId', authenticate, validateRequest([
  body('name').optional().isString().withMessage('Name must be a string'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('role').optional().isIn(['employee', 'outlet_admin']).withMessage('Role must be employee or outlet_admin'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('responsibilities').optional().isArray().withMessage('Responsibilities must be an array')
]), (req, res, next) => {
  const allowedRoles = ['super_admin', 'outlet_admin'];
  const user = (req as any).user;
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden - Only super admin or outlet admin can update employees' });
  }
  next();
}, (req, res) => {
  console.log('ROUTE: employeeId param:', req.params.employeeId);
  req.params.userId = req.params.employeeId;
  console.log('ROUTE: userId param after assignment:', req.params.userId);
  return userController.updateEmployee(req as any, res);
});

/**
 * @swagger
 * /api/employee/{employeeId}:
 *   delete:
 *     summary: Delete employee (Super Admin/Outlet Admin only)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the employee to delete
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only super admin or outlet admin can delete employees
 *       404:
 *         description: Employee not found
 */
router.delete('/:employeeId', authenticate, (req, res, next) => {
  const allowedRoles = ['super_admin', 'outlet_admin'];
  const user = (req as any).user;
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden - Only super admin or outlet admin can delete employees' });
  }
  next();
}, (req, res) => {
  console.log('ROUTE: employeeId param:', req.params.employeeId);
  req.params.userId = req.params.employeeId;
  console.log('ROUTE: userId param after assignment:', req.params.userId);
  return userController.deleteEmployee(req as any, res);
});

export default router; 