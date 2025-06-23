import { Router } from 'express';
import { createOutlet, getOutletsBySuperAdmin, assignAdmin, assignRoleToEmployee } from '../controllers/outlet.controller';
import { authenticate } from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';

const router = Router();

// Create outlet (super admin only)
router.post('/', authenticate, upload.array('images', 5), createOutlet);

// Get all outlets for the logged-in super admin
router.get('/', authenticate, getOutletsBySuperAdmin);

// Assign admin to outlet
router.patch('/assign-admin', authenticate, assignAdmin);

// Assign role and responsibilities to employee for an outlet
router.post('/:outletId/roles', authenticate, assignRoleToEmployee);

export default router; 