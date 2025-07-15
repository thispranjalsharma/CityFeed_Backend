import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { DineInService } from '../services/dineIn.service';
import { AppErrorClass } from '../utils/appError';
import { AuthRequest } from '../interfaces/auth.interface';
import { logger } from '../utils/logger.util';

/**
 * @swagger
 * components:
 *   schemas:
 *     StartSessionRequest:
 *       type: object
 *       required:
 *         - outletId
 *         - offerId
 *         - totalBill
 *       properties:
 *         outletId:
 *           type: string
 *           description: ID of the outlet
 *         offerId:
 *           type: string
 *           description: ID of the offer
 *         totalBill:
 *           type: number
 *           description: Total bill amount
 *     DineInMonthlyStats:
 *       type: object
 *       properties:
 *         year:
 *           type: integer
 *           example: 2024
 *         month:
 *           type: integer
 *           example: 4
 *         totalValue:
 *           type: number
 *           example: 12345.67
 *         count:
 *           type: integer
 *           example: 56
 *         avgBill:
 *           type: number
 *           example: 220.45
 *         uniqueCustomers:
 *           type: integer
 *           example: 40
 *         paymentMethodBreakdown:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           example: { wallet: 30, razorpay: 26 }
 *         totalDiscount:
 *           type: number
 *           example: 1200.50
 *         topOfferId:
 *           type: string
 *           example: "64e8b2f1c2a4e2a1b2c3d4e5"
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

      const { outletId, offerId, totalBill } = req.body;
      const result = await this.dineInService.processDineIn({
        userId,
        outletId,
        offerId,
        totalBill
      });

      this.sendCreated(res, {
        session: result.session,
        finalAmount: result.finalAmount
      }, 'Dine-in session started successfully');
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
   * /api/dine-in/outlet/{outletId}/sessions:
   *   get:
   *     summary: Get outlet's dine-in sessions
   *     tags: [DineIn]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: outletId
   *         required: true
   *         schema:
   *           type: string
   *         description: Outlet ID
   *     responses:
   *       200:
   *         description: Outlet's dine-in sessions retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getOutletSessions = async (req: AuthRequest, res: Response) => {
    try {
      const outletId = req.params.outletId;
      if (!outletId) {
        return this.sendError(res, 'Outlet ID is required', 400);
      }

      const sessions = await this.dineInService.getOutletDineInHistory(outletId);
      this.sendSuccess(res, sessions);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/dine-in/outlet/{outletId}/monthly-stats:
   *   get:
   *     summary: Get month-wise dine-in statistics for an outlet
   *     tags: [DineIn]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: outletId
   *         required: true
   *         schema:
   *           type: string
   *         description: Outlet ID
   *       - in: query
   *         name: year
   *         schema:
   *           type: number
   *         description: Filter by year (e.g., 2024)
   *     responses:
   *       200:
   *         description: Month-wise dine-in statistics
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
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  getMonthlyDineInStats = async (req: AuthRequest, res: Response) => {
    try {
      const { outletId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const user = req.user;
      if (!user) return this.sendError(res, 'Unauthorized', 401);
      // Superadmin: can access any outlet they created
      // Outlet admin: can access their assigned outlet
      if (user.role === 'super_admin') {
        // Find all outlets created by this superadmin
        const outletRepo = new (require('../repositories/outlet.repository').OutletRepository)();
        const outlets = await outletRepo.find({ createdBy: user._id });
        const outletIds = outlets.map((o: any) => o._id.toString());
        if (!outletIds.includes(outletId)) {
          return this.sendError(res, 'Forbidden: Not your outlet', 403);
        }
      } else if (user.role === 'outlet_admin') {
        // Find all outlets assigned to this admin
        const outletRepo = new (require('../repositories/outlet.repository').OutletRepository)();
        const outlets = await outletRepo.findByAssignedAdmin(user._id);
        const outletIds = outlets.map((o: any) => o._id.toString());
        if (!outletIds.includes(outletId)) {
          return this.sendError(res, 'Forbidden: Not your outlet', 403);
        }
      } else {
        return this.sendError(res, 'Forbidden: Only outlet admin or superadmin allowed', 403);
      }
      // Get stats
      const stats = await this.dineInService.getMonthlyDineInStats(outletId, year);
      this.sendSuccess(res, stats);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public processDineIn = async (req: Request, res: Response) => {
    try {
      const { userId, outletId, offerId, totalBill } = req.body;

      // Validate required fields
      if (!userId || !outletId || !offerId || !totalBill) {
        throw new AppErrorClass('Missing required fields', 400);
      }

      const result = await this.dineInService.processDineIn({
        userId,
        outletId,
        offerId,
        totalBill
      });

      res.status(200).json({
        status: 'success',
        data: {
          session: result.session,
          finalAmount: result.finalAmount
        }
      });
    } catch (error) {
      logger.error('Error in processDineIn:', error);
      if (error instanceof AppErrorClass) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error'
        });
      }
    }
  };
} 