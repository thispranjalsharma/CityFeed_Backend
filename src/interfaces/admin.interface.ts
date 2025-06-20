import { Document, Types } from 'mongoose';

export interface IAdmin {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'outlet_admin';
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAdminDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'outlet_admin';
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IAdminResponse {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'outlet_admin';
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
} 