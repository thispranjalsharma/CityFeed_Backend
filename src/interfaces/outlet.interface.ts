import { Document, Types } from 'mongoose';

export interface IOutlet extends Document {
  businessName: string;
  businessType: string;
  businessDescription: string;
  category: string;
  address: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  images: string[];
  defaultMaxDiscount: number;
  createdBy: Types.ObjectId; // Super admin ID
  assignedAdmin?: Types.ObjectId; // Admin user ID
  isActive: boolean; // Status of the outlet
  createdAt: Date;
  updatedAt: Date;
} 