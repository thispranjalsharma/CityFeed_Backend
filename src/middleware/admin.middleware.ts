import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../interfaces/auth.interface';

export const adminApiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  if (!adminApiKey) {
    return res.status(500).json({
      success: false,
      message: 'Admin API key not configured'
    });
  }

  const providedKey = req.headers['x-admin-api-key'];
  
  if (!providedKey || providedKey !== adminApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid admin API key'
    });
  }

  return next();
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  return next();
}; 