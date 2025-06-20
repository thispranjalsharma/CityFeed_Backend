import { Document, Types } from 'mongoose';

export interface IOutletAdmin extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'outlet_admin';
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
} 