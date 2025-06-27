import mongoose, { Schema } from 'mongoose';
import { IOutlet } from '../interfaces/outlet.interface';
import { BaseDocument } from '../repositories/base.repository';

export interface IOutletDocument extends IOutlet, BaseDocument {}

const outletSchema = new Schema<IOutletDocument>({
  businessName: { type: String, required: true },
  businessType: { type: String, required: true },
  businessDescription: { type: String, required: true },
  category: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined }
  },
  images: { type: [String], default: [] },
  defaultMaxDiscount: { type: Number, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'SuperAdmin', required: true },
  assignedAdmin: { type: Schema.Types.ObjectId, ref: 'OutletAdmin' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true
});

export const Outlet = mongoose.model<IOutletDocument>('Outlet', outletSchema); 