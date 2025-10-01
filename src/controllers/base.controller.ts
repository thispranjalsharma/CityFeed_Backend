import { Request, Response } from "express";
import { logger } from "../utils/logger.util";
import { AppErrorClass } from "../utils/appError";
import { inject, injectable } from "inversify";
import { EmailQueueService } from "../services/emailQueue.service";

@injectable()
export class BaseController {
  constructor(
    @inject("EmailQueueService") public emailQueueService: EmailQueueService
  ) {}

  protected sendSuccess(res: Response, data: any, message?: string): Response {
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  }

  protected sendCreated<T>(res: Response, data: T, message?: string): Response {
    return res.status(201).json({
      status: "success",
      message,
      data,
    });
  }

  protected sendError(
    res: Response,
    message: string | { message: string; [key: string]: any },
    statusCode: number = 400
  ): Response {
    if (typeof message === "string") {
      return res.status(statusCode).json({
        success: false,
        message,
      });
    }
    return res.status(statusCode).json({
      success: false,
      ...message,
    });
  }

  protected handleError(res: Response, error: Error): Response {
    if (error instanceof AppErrorClass) {
      return this.sendError(res, error.message, error.statusCode);
    }
    logger.error("Error:", error);
    const statusCode = (error as any).statusCode || 500;
    return this.sendError(
      res,
      error.message || "Internal server error",
      statusCode
    );
  }

  // Health check endpoint
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const emailQueueStatus = this.emailQueueService.getQueueStatus();

      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "connected", // You can add actual DB health check here
          email: {
            status: "operational",
            queue: emailQueueStatus,
          },
        },
      };

      res.status(200).json(healthStatus);
    } catch (error) {
      logger.error("Health check failed:", error);
      res.status(500).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      });
    }
  }

  // Email queue status endpoint
  async emailQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const queueStatus = this.emailQueueService.getQueueStatus();
      res.status(200).json({
        success: true,
        data: queueStatus,
      });
    } catch (error) {
      logger.error("Failed to get email queue status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email queue status",
      });
    }
  }
}
