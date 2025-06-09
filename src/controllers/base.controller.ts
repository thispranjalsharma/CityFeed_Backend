import { Response } from 'express';
import { AppErrorClass } from '../middleware/error.middleware';

export class BaseController {
  protected sendSuccess(res: Response, data: any, message?: string): Response {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  protected sendCreated<T>(res: Response, data: T, message?: string): Response {
    return res.status(201).json({
      status: 'success',
      message,
      data
    });
  }

  protected sendError(res: Response, message: string, statusCode: number = 400): Response {
    return res.status(statusCode).json({
      success: false,
      message
    });
  }

  protected handleError(res: Response, error: Error): Response {
    if (error instanceof AppErrorClass) {
      return this.sendError(res, error.message, error.statusCode);
    }
    console.error('Error:', error);
    return this.sendError(res, error.message || 'Internal server error', 500);
  }
} 