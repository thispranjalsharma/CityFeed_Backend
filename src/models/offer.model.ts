import mongoose, { Schema, Document, Types } from "mongoose";
// import { IOffer } from "../interfaces/offer.interface";

//

export interface IOffer {
  _id?: string;
  outletId: Types.ObjectId | string; // Allow both for compatibility
  title: string;
  description: string;
  discountPercentage: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdByRole?: string;
  createdByUser?: Types.ObjectId | string;
  isDeleted?: boolean;
  deletedAt?: Date;
  // REMOVE: toObject(): any;  <-- DELETE THIS LINE
}

export interface IOfferResponse extends Omit<IOffer, "outletId"> {
  outlet: {
    _id: string;
    name: string;
  };
}

//

export interface IOfferDocument extends IOffer {}

const offerSchema = new Schema(
  {
    outletId: { type: Schema.Types.ObjectId, ref: "Outlet", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    discountPercentage: { type: Number, required: true },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    createdByRole: { type: String },
    createdByUser: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index for outlet queries
offerSchema.index({ outletId: 1 });

// Index for active offers
offerSchema.index({ isActive: 1 });

// Index for date range queries
offerSchema.index({ validFrom: 1, validTo: 1 });

// Compound index for active offers by outlet with date range
offerSchema.index({ outletId: 1, isActive: 1, validFrom: 1, validTo: 1 });

// Compound index for default offers per outlet
offerSchema.index({ outletId: 1, isDefault: 1 });

// Index for soft delete queries
offerSchema.index({ isDeleted: 1 });
offerSchema.index({ deletedAt: 1 });

export const Offer = mongoose.model<IOfferDocument>("Offer", offerSchema);
