import { Document, Types } from 'mongoose';

export interface IOutletAdmin extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'outlet_admin';
  isActive: boolean;
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  isDeleted?: boolean; // Soft delete flag
  deletedAt?: Date; // Soft delete timestamp
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
} 