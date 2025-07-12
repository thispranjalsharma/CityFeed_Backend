import { Document, Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  dob: Date;
  gender: 'male' | 'female' | 'other';
  phone: string;
  membershipType: 'cityfeed_select' | 'cityfeed_edge' | 'cityfeed_prime';
  membershipExpiryDate: Date;
  role: 'user'  | 'admin';
  coins: number;
  reward_points: number;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isApproved: boolean;
  isDeleted?: boolean; // Soft delete flag
  deletedAt?: Date; // Soft delete timestamp
  profilePicture?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  preferences?: {
    notifications: boolean;
    language: string;
    theme: string;
  };
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends Document, Omit<IUser, '_id'> {
  _id: Types.ObjectId;
  isApproved: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserResponse extends Omit<IUser, 'password'> {
  fullName: string;
} 