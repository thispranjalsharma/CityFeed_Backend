import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { DineInService, IDineInService } from "../services/dineIn.service";
import { AppErrorClass } from "../utils/appError";
import { AuthRequest } from "../interfaces/auth.interface";
import { logger } from "../utils/logger.util";
import {
  IOutletRepository,
  OutletRepository,
} from "../repositories/outlet.repository";
import { injectable, inject } from "inversify";
import { EmailQueueService } from "../services/emailQueue.service";
import { IDineInSession } from "../models/dineInSession.model";
// import { controller, httpPost, httpGet, httpPut, httpDelete } from 'inversify-express-utils';

@injectable()
// @controller('/dine-in')
export class DineInController extends BaseController {
  constructor(
    @inject("DineInService") private dineInService: IDineInService,

    @inject("EmailQueueService") emailQueueService: EmailQueueService,
    @inject("OutletRepository") private outletRepository: IOutletRepository
  ) {
    super(emailQueueService); // what is the problem here? please explain me first and then give the solution
  }

  startSession = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const { outletId, offerId, totalBill } = req.body;
      const result = await this.dineInService.processDineIn({
        userId,
        outletId,
        offerId,
        totalBill,
      });

      this.sendCreated(
        res,
        {
          session: (
            result as {
              status: string;
              session: IDineInSession;
              finalAmount: number;
            }
          ).session,
          finalAmount: (
            result as {
              status: string;
              session: IDineInSession;
              finalAmount: number;
            }
          ).finalAmount,
        },
        "Dine-in session started successfully"
      );
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getUserSessions = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const sessions = await this.dineInService.getUserDineInHistory(userId);
      this.sendSuccess(res, sessions);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getOutletSessions = async (req: AuthRequest, res: Response) => {
    try {
      const outletId = req.params.outletId;
      if (!outletId) {
        return this.sendError(res, "Outlet ID is required", 400);
      }

      // Get pagination parameters from query
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate pagination parameters
      if (page < 1) {
        return this.sendError(res, "Page must be greater than 0", 400);
      }
      if (limit < 1 || limit > 100) {
        return this.sendError(res, "Limit must be between 1 and 100", 400);
      }

      const result = await this.dineInService.getOutletDineInHistoryPaginated(
        outletId,
        page,
        limit
      );
      this.sendSuccess(res, result);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMonthlyDineInStats = async (req: AuthRequest, res: Response) => {
    try {
      const { outletId } = req.params;
      const year = req.query.year
        ? parseInt(req.query.year as string, 10)
        : undefined;
      const user = req.user;
      if (!user) return this.sendError(res, "Unauthorized", 401);
      // Superadmin: can access any outlet they created
      // Outlet admin: can access their assigned outlet
      if (user.role === "super_admin") {
        // Find all outlets created by this superadmin
        // const outletRepo = new OutletRepository();
        const outlets = await this.outletRepository.find({
          createdBy: user._id,
        });
        const outletIds = outlets.map((o: any) => o._id.toString());
        if (!outletIds.includes(outletId)) {
          return this.sendError(res, "Forbidden: Not your outlet", 403);
        }
      } else if (user.role === "outlet_admin") {
        // Find all outlets assigned to this admin
        // const outletRepo = new OutletRepository();
        const outlets = await this.outletRepository.findByAssignedAdmin(
          user._id
        );
        const outletIds = outlets.map((o: any) => o._id.toString());
        if (!outletIds.includes(outletId)) {
          return this.sendError(res, "Forbidden: Not your outlet", 403);
        }
      } else {
        return this.sendError(
          res,
          "Forbidden: Only outlet admin or superadmin allowed",
          403
        );
      }
      // Get stats
      const stats = await this.dineInService.getMonthlyDineInStats(
        outletId,
        year
      );
      this.sendSuccess(res, stats);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  processDineIn = async (req: Request, res: Response) => {
    try {
      const { userId, outletId, offerId, totalBill } = req.body;

      // Validate required fields
      if (!userId || !outletId || !offerId || !totalBill) {
        throw new AppErrorClass("Missing required fields", 400);
      }

      const result = await this.dineInService.processDineIn({
        userId,
        outletId,
        offerId,
        totalBill,
      });

      res.status(200).json({
        status: "success",
        data: {
          session: (
            result as {
              status: string;
              session: IDineInSession;
              finalAmount: number;
            }
          ).session,
          finalAmount: (
            result as {
              status: string;
              session: IDineInSession;
              finalAmount: number;
            }
          ).finalAmount,
        },
      });
    } catch (error) {
      logger.error("Error in processDineIn:", error);
      if (error instanceof AppErrorClass) {
        res.status(error.statusCode).json({
          status: "error",
          message: error.message,
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Internal server error",
        });
      }
    }
  };
}
