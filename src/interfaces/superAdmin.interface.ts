import { Document } from 'mongoose';

export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  isEmailVerified: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
} 