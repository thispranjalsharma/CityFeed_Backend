import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();


  // Log request details of the users
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Log request body in development
  if (config.nodeEnv === 'development' && req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request Body:', JSON.stringify(req.body, null, 2));
  }

  // Log response details when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}; 