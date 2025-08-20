import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const feedbackController = new FeedbackController();

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     tags:
 *       - Feedback
 *     summary: Submit new feedback
 *     description: Create a new feedback entry for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - description
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [general, bug, feature, complaint]
 *                 description: Category of the feedback
 *               description:
 *                 type: string
 *                 description: Detailed description of the feedback
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     category:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: User not authenticated
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  validateRequest([
    body('category').isIn(['general', 'bug', 'feature', 'complaint']).withMessage('Invalid category'),
    body('description').notEmpty().withMessage('Description is required')
  ]),
  (req, res, next) => feedbackController.createFeedback(req as any, res, next)
);

/**
 * @swagger
 * /api/feedback/my-feedback:
 *   get:
 *     tags:
 *       - Feedback
 *     summary: Get user's feedback history
 *     description: Retrieve all feedback entries submitted by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feedback history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       category:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: User not authenticated
 */
router.get('/my-feedback', authenticate, (req, res, next) => feedbackController.getUserFeedback(req as any, res, next));

/**
 * @swagger
 * /api/feedback/all:
 *   get:
 *     tags:
 *       - Feedback
 *     summary: Get all feedback 
 *     description: Retrieve all feedback entries submitted by all users. Admin access required.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All feedback retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           gender:
 *                             type: string
 *                             enum: [male, female, other]
 *                       category:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - Admins only
 */
// Admin: Get all feedback
router.get('/all', (req, res, next) => feedbackController.getAllFeedback(req as any, res, next));

export default router; 