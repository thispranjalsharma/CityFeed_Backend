import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { DineInService } from '../services/dineIn.service';
import { AppErrorClass } from '../middleware/error.middleware';
import { AuthRequest } from '../interfaces/auth.interface';

/**
 * @swagger
 * components:
 *   schemas:
 *     StartSessionRequest:
 *       type: object
 *       required:
 *         - merchantId
 *         - offerId
 *         - totalBill
 *       properties:
 *         merchantId:
 *           type: string
 *           description: ID of the merchant
 *         offerId:
 *           type: string
 *           description: ID of the offer
 *         totalBill:
 *           type: number
 *           description: Total bill amount
 */

export class DineInController extends BaseController {
  private dineInService: DineInService;

  constructor() {
    super();
    this.dineInService = new DineInService();
  }

  /**
   * @swagger
   * /api/dine-in/start:
   *   post:
   *     summary: Start a new dine-in session
   *     tags: [DineIn]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StartSessionRequest'
   *     responses:
   *       201:
   *         description: Dine-in session started successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   *       402:
   *         description: Insufficient coins
   */
  startSession = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { merchantId, offerId, totalBill } = req.body;
      const result = await this.dineInService.processDineIn({
        userId,
        merchantId,
        offerId,
        totalBill
      });

      if (result.status === 'insufficient_coins') {
        return this.sendSuccess(res, {
          status: 'insufficient_coins',
          message: 'Insufficient coins. Please recharge your wallet.',
          requiredCoins: result.requiredCoins,
          currentCoins: result.currentCoins,
          finalAmount: result.finalAmount
        });
      }

      this.sendCreated(res, result.session, 'Dine-in session started successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/dine-in/sessions:
   *   get:
   *     summary: Get user's dine-in sessions
   *     tags: [DineIn]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dine-in sessions retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getUserSessions = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const sessions = await this.dineInService.getUserDineInHistory(userId);
      this.sendSuccess(res, sessions);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/dine-in/merchant/{merchantId}/sessions:
   *   get:
   *     summary: Get merchant's dine-in sessions
   *     tags: [DineIn]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: merchantId
   *         required: true
   *         schema:
   *           type: string
   *         description: Merchant ID
   *     responses:
   *       200:
   *         description: Merchant's dine-in sessions retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getMerchantSessions = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { merchantId } = req.params;
      const sessions = await this.dineInService.getMerchantDineInHistory(merchantId);
      this.sendSuccess(res, sessions);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
} 