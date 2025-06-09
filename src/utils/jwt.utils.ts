import jwt from 'jsonwebtoken';
import { AppErrorClass } from '../middleware/error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (payload: any): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  } catch (error) {
    throw new AppErrorClass('Error generating token', 500);
  }
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new AppErrorClass('Invalid token', 401);
  }
}; 