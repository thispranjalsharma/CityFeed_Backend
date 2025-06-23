import { Router } from 'express';
import { assignRoleToOutlet, getRolesForOutlet } from '../controllers/outletRoleAssignment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Assign role and responsibilities to an outlet
router.post('/:outletId/roles', authenticate, assignRoleToOutlet);

// Get all role assignments for an outlet
router.get('/:outletId/roles', authenticate, getRolesForOutlet);

export default router; 