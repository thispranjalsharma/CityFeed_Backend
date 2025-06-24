import { Request } from 'express';

export interface AuthUser {
  _id: string;
  email: string;
  role: string;
  type: 'user' | 'merchant' | 'admin' | 'super_admin';
}

export interface TokenPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
  file?: Express.Multer.File;
  userId?: string;
  merchantId?: string;
  adminId?: string;
  ip?: string;
} 