import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';

const router = Router();
const baseController = new BaseController();

// Health check endpoint
router.get('/health', baseController.healthCheck.bind(baseController));

// Email queue status endpoint
router.get('/email-queue-status', baseController.emailQueueStatus.bind(baseController));

export default router;
