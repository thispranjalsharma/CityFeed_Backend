import { Document, Types } from 'mongoose';

export interface ILocation {
  type: string;
  coordinates: number[];
}

export interface IMerchant {
  name: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  businessType: 'cafe' | 'restaurant' | 'bar' | 'shop' | 'service' | 'other';
  address: string;
  location: ILocation;
  images: string[];
  isApproved: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMerchantResponse extends Omit<IMerchant, 'password'> {
  fullName: string;
}

export interface IMerchantDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  businessType: 'cafe' | 'restaurant' | 'bar' | 'shop' | 'service' | 'other';
  address: string;
  location: ILocation;
  images: string[];
  isApproved: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
} 