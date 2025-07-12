import { Document, Types } from 'mongoose';

export interface IOutlet extends Document {
  _id: Types.ObjectId;
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
  assignedAdmin?: Types.ObjectId; // Outlet admin ID
  isActive: boolean; // Status of the outlet
  isDeleted?: boolean; // Soft delete flag
  deletedAt?: Date; // Soft delete timestamp
  createdAt: Date;
  updatedAt: Date;
} 