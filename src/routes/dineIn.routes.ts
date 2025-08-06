import { Router } from 'express';
import { authenticate, userAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { DineInController } from '../controllers/dineIn.controller';

const router = Router();
const dineInController = new DineInController();

/**
 * @swagger
 * /api/dine-in/session:
 *   post:
 *     tags: [DineIn]
 *     summary: Create a new dine-in session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outletId
 *               - offerId
 *               - totalBill
 *             properties:
 *               outletId:
 *                 type: string
 *               offerId:
 *                 type: string
 *               totalBill:
 *                 type: number
 *     responses:
 *       201:
 *         description: Dine-in session created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/session',
  authenticate,
  userAuth,
  validateRequest([
    body('outletId').isString().notEmpty(),
    body('offerId').isString().notEmpty(),
    body('totalBill').isNumeric()
  ]),
  (req, res) => dineInController.startSession(req as any, res)
);

/**
 * @swagger
 * /api/dine-in/user/history:
 *   get:
 *     tags: [DineIn]
 *     summary: Get user's dine-in history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's dine-in history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user/history',
  authenticate,
  userAuth,
  (req, res) => dineInController.getUserSessions(req as any, res)
);

/**
 * @swagger
 * /api/dine-in/outlet/{outletId}/history:
 *   get:
 *     tags: [DineIn]
 *     summary: Get outlet's dine-in history
 *     description: Retrieve paginated dine-in sessions for the specified outlet, including user details (name, email, phone)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: "Number of items per page (default: 10, max: 100)"
 *     responses:
 *       200:
 *         description: Outlet's dine-in history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           userId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: "507f1f77bcf86cd799439012"
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               email:
 *                                 type: string
 *                                 example: "john@example.com"
 *                               phone:
 *                                 type: string
 *                                 example: "9876543210"
 *                           outletId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: "507f1f77bcf86cd799439013"
 *                               name:
 *                                 type: string
 *                                 example: "Restaurant Name"
 *                               businessName:
 *                                 type: string
 *                                 example: "Business Name"
 *                           offerId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439014"
 *                           status:
 *                             type: string
 *                             enum: [pending, active, completed, cancelled]
 *                             example: "completed"
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-03-20T10:00:00Z"
 *                           endTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-03-20T12:00:00Z"
 *                           totalBill:
 *                             type: number
 *                             example: 1000
 *                           paymentId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439015"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-03-20T10:00:00Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-03-20T12:00:00Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalItems:
 *                           type: integer
 *                           example: 50
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Bad request - Invalid pagination parameters
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - User is not authorized
 */
router.get(
  '/outlet/:outletId/history',
  authenticate,
  (req, res) => dineInController.getOutletSessions(req as any, res)
);

/**
 * @swagger
 * /api/dine-in/outlet/{outletId}/monthly-stats:
 *   get:
 *     tags: [DineIn]
 *     summary: Get monthly dine-in statistics for an outlet
 *     description: Retrieve monthly dine-in statistics for the specified outlet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the outlet
 *     responses:
 *       200:
 *         description: Monthly dine-in statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DineInMonthlyStats'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - User is not authorized
 */
router.get(
  '/outlet/:outletId/monthly-stats',
  authenticate,
  (req, res) => dineInController.getMonthlyDineInStats(req as any, res)
);

export default router; 