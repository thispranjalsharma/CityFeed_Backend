import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { JsonWebTokenError } from 'jsonwebtoken';
import { AppErrorClass } from '../utils/appError';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  errors?: any[];
}

interface ValidationError {
  param: string;
  msg: string;
  value?: any;
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Format error response for Swagger UI
  const errorResponse = {
    success: false,
    message: err.message || 'Something went wrong',
    statusCode: err.statusCode
  };

  if (process.env.NODE_ENV === 'development') {
    // Development error response
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        ...errorResponse,
        error: err.message,
        stack: err.stack
      });
    }

    if (err.message === 'Not allowed by CORS') {
      return res.status(403).json({
        ...errorResponse,
        error: err.message,
        origin: req.headers.origin,
        stack: err.stack
      });
    }

    return res.status(err.statusCode).json({
      ...errorResponse,
      error: err,
      stack: err.stack
    });
  } else {
    // Production error response
    if (err.isOperational) {
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
          ...errorResponse,
          message: 'CORS Error: Request blocked by CORS policy'
        });
      }

      return res.status(err.statusCode).json(errorResponse);
    }

    // Programming or unknown errors
    console.error('ERROR 💥', err);
    return res.status(500).json({
      ...errorResponse,
      message: 'Something went wrong'
    });
  }
}; 