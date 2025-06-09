import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { AuthRequest } from '../interfaces/auth.interface';
import { AppErrorClass } from './error.middleware';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('=== Authentication Debug ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    console.log('All Headers:', JSON.stringify(req.headers, null, 2));
    
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      console.log('No authorization header found');
      throw new AppErrorClass('No token provided', 401);
    }

    if (typeof authHeader !== 'string') {
      console.log('Authorization header is not a string');
      throw new AppErrorClass('Invalid authorization header format', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('Authorization header does not start with Bearer');
      throw new AppErrorClass('Invalid token format. Must be Bearer token', 401);
    }

    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token);

    const decoded = verifyToken(token);
    console.log('Decoded token:', JSON.stringify(decoded, null, 2));

    if (!decoded) {
      console.log('Token verification failed - decoded is null or undefined');
      throw new AppErrorClass('Invalid or expired token', 401);
    }

    (req as AuthRequest).user = decoded;
    console.log('User authenticated successfully:', JSON.stringify(decoded, null, 2));
    console.log('=== End Authentication Debug ===');
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('=== Authorization Debug ===');
      const user = (req as AuthRequest).user;
      console.log('User from request:', JSON.stringify(user, null, 2));
      console.log('Required roles:', roles);

      if (!user) {
        console.log('No user found in request');
        throw new AppErrorClass('Not authenticated', 401);
      }

      if (!roles.includes(user.role)) {
        console.log('User role does not match required roles');
        console.log('User role:', user.role);
        console.log('Required roles:', roles);
        throw new AppErrorClass('Not authorized', 403);
      }

      console.log('User authorized successfully');
      console.log('=== End Authorization Debug ===');
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