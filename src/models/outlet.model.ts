import mongoose, { Document, Schema } from "mongoose";
// import { IOutlet } from "../interfaces/outlet.interface";
// import { BaseDocument } from "../repositories/base.repository";
import { Types } from "mongoose";

//

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
  manager?: string; // Employee ID
  staff?: string; // Array of Employee IDs
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

//

export interface IOutletDocument extends IOutlet {}

const outletSchema = new Schema<IOutletDocument>(
  {
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    businessDescription: { type: String, required: true },
    category: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
    },
    images: { type: [String], default: [] },
    defaultMaxDiscount: { type: Number, required: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },
    assignedAdmin: { type: Schema.Types.ObjectId, ref: "OutletAdmin" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Index for soft delete queries
outletSchema.index({ isDeleted: 1 });
outletSchema.index({ deletedAt: 1 });

export const Outlet = mongoose.model<IOutletDocument>("Outlet", outletSchema);
