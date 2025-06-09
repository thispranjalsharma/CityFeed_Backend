import { Router } from 'express';
import { authenticate, userAuth, merchantAuth } from '../middleware/auth.middleware';
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
 *               - merchantId
 *               - offerId
 *               - totalBill
 *             properties:
 *               merchantId:
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
    body('merchantId').isString().notEmpty(),
    body('offerId').isString().notEmpty(),
    body('totalBill').isNumeric()
  ]),
  dineInController.startSession
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
  dineInController.getUserSessions
);

/**
 * @swagger
 * /api/dine-in/merchant/history:
 *   get:
 *     tags: [DineIn]
 *     summary: Get merchant's dine-in history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Merchant's dine-in history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/merchant/:merchantId/history',
  authenticate,
  merchantAuth,
  dineInController.getMerchantSessions
);

export default router; 