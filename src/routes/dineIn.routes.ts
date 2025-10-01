import { Router } from "express";
import { authenticate, userAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { body } from "express-validator";
import { DineInController } from "../controllers/dineIn.controller";
import container from "../inversify.config";

const router = Router();
const dineInController = container.get(DineInController);

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
  "/session",
  authenticate,
  userAuth,
  validateRequest([
    body("outletId").isString().notEmpty(),
    body("offerId").isString().notEmpty(),
    body("totalBill").isNumeric(),
  ]),
  dineInController.startSession
);

router.get(
  "/user/history",
  authenticate,
  userAuth,
  dineInController.getUserSessions
);

router.get(
  "/outlet/:outletId/history",
  authenticate,
  dineInController.getOutletSessions
);

router.get(
  "/outlet/:outletId/monthly-stats",
  authenticate,
  dineInController.getMonthlyDineInStats
);

export default router;
