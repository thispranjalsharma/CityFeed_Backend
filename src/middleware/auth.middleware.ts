import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { AuthRequest } from '../interfaces/auth.interface';
import { AppErrorClass } from './error.middleware';

export const authenticate = async (req: Request & { originalUrl: string }, res: Response, next: NextFunction) => {
  try {
  
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppErrorClass('No token provided', 401);
    }

    if (typeof authHeader !== 'string') {
      throw new AppErrorClass('Invalid authorization header format', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppErrorClass('Invalid token format. Must be Bearer token', 401);
    }

    const token = authHeader.split(' ')[1];

    const decoded = verifyToken(token);

    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 401);
    }

    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;

      if (!user) {
        throw new AppErrorClass('Not authenticated', 401);
      }

      if (!roles.includes(user.role)) {
      
        throw new AppErrorClass('Not authorized', 403);
      }

      
      next();
    } catch (error) {
      console.error('Authorization Error:', error);
      next(error);
    }
  };
};

export const userAuth = authorize('user');
export const merchantAuth = authorize('merchant');
export const adminAuth = authorize('admin'); 