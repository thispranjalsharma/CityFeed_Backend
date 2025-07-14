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
 *     description: Retrieve all dine-in sessions for the specified outlet
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DineInSession'
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