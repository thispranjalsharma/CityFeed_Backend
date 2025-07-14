import { Types } from 'mongoose';

export interface IEventOrganizer {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
} 