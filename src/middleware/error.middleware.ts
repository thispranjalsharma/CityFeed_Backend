import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { JsonWebTokenError } from 'jsonwebtoken';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  errors?: any[];
}

export class AppErrorClass extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

interface ValidationError {
  param: string;
  msg: string;
  value?: any;
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Development error response
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: err.message,
        stack: err.stack
      });
    }

    if (err.message === 'Not allowed by CORS') {
      return res.status(403).json({
        success: false,
        message: 'CORS Error: Request blocked by CORS policy',
        error: err.message,
        origin: req.headers.origin,
        stack: err.stack
      });
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err,
      stack: err.stack
    });
  } else {
    // Production error response
    if (err.isOperational) {
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
          success: false,
          message: 'CORS Error: Request blocked by CORS policy'
        });
      }

      return res.status(err.statusCode).json({
      success: false,
        message: err.message
    });
  }

    // Programming or unknown errors
    console.error('ERROR 💥', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
}; 