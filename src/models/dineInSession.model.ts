import mongoose, { Document, Schema } from "mongoose";
// import { IDineInSession } from '../interfaces/dineInSession.interface';

// Interface STarted

export interface IDineInSession extends Document {
  userId: string;
  outletId: string;
  offerId: string;
  status: "pending" | "active" | "completed" | "cancelled";
  startTime: Date;
  endTime?: Date;
  totalBill?: number;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDineInSessionDto {
  userId: string;
  outletId: string;
  offerId: string;
  totalBill?: number;
  status?: "pending" | "active" | "completed" | "cancelled";
}

export interface UpdateDineInSessionDto {
  status?: "pending" | "active" | "completed" | "cancelled";
  endTime?: Date;
  totalBill?: number;
  paymentId?: string;
}

export interface IDineInSessionResponse extends IDineInSession {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  outlet: {
    _id: string;
    businessName: string;
  };
  offer: {
    _id: string;
    title: string;
    discountDetails: string;
  };
}

// Interface Ended

const dineInSessionSchema = new Schema<IDineInSession>(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    outletId: {
      type: String,
      required: true,
      ref: "Outlet",
    },
    offerId: {
      type: String,
      required: true,
      ref: "Offer",
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    totalBill: {
      type: Number,
    },
    paymentId: {
      type: String,
      ref: "Payment",
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes
dineInSessionSchema.index({ userId: 1 });
dineInSessionSchema.index({ outletId: 1 });
dineInSessionSchema.index({ status: 1 });
dineInSessionSchema.index({ createdAt: -1 });

export const DineInSession = mongoose.model<IDineInSession>(
  "DineInSession",
  dineInSessionSchema
);
