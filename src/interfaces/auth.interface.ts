import { Request } from 'express';

export interface AuthUser {
  _id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff';
  type: 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff';
}

export interface TokenPayload extends AuthUser {
  iat?: number;
  exp?: number;
  role: 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff';
  type: 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff';
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
  file?: Express.Multer.File;
  userId?: string;
  outletId?: string;
  adminId?: string;
  ip?: string;
} 