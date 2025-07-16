import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../interfaces/auth.interface';
import { AppErrorClass } from '../utils/appError';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    (req as any).user = decoded; // Works for both platform users and employees
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;
      console.log('Authorize middleware: user.role =', user && user.role);

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
export const adminAuth = authorize('admin'); 
export const superAdminAuth = authorize('super_admin');
export const outletAdminAuth = authorize('outlet_admin');
export const employeeAuth = authorize('employee'); 