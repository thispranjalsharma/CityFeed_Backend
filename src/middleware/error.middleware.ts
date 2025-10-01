import { Request, Response, NextFunction } from 'express';


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
    statusCode: err.statusCode,
    error: err,
    details: err.details || undefined,
    stack: err.stack || undefined
  };

  // Always return error details and stack for debugging
  return res.status(err.statusCode).json(errorResponse);
}; 