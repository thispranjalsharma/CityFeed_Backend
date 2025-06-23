import { Router } from 'express';
import { registerSuperAdmin } from '../controllers/superAdmin.controller';

const router = Router();

router.post('/register', registerSuperAdmin);

export default router; 