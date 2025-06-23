import { Document, Types } from 'mongoose';

export interface IOutletRoleAssignment extends Document {
  outlet: Types.ObjectId;
  role: string;
  responsibilities: string[];
  email: string;
  password: string;
  phone: string;
  name?: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
} 