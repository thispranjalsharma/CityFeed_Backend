import mongoose, { Document, Schema } from "mongoose";
// import { IPreRegistrationPayment } from '../interfaces/preRegistrationPayment.interface';

export interface IPreRegistrationPayment extends Document {
  email: string;
  membershipType: "cityfeed_select" | "cityfeed_edge" | "cityfeed_prime";
  amount: number;
  razorpayOrderId: string;
  status: "pending" | "success" | "failed" | "consumed";
  consumedAt?: Date;
  userId?: string;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const preRegistrationPaymentSchema = new Schema<IPreRegistrationPayment>(
  {
    email: { type: String, required: true },
    membershipType: {
      type: String,
      enum: ["cityfeed_select", "cityfeed_edge", "cityfeed_prime"],
      required: true,
    },
    amount: { type: Number, required: true },
    razorpayOrderId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "consumed"],
      default: "pending",
    },
    consumedAt: { type: Date },
    userId: { type: String, ref: "User" },
    paymentId: { type: String, ref: "Payment" },
  },
  {
    timestamps: true,
  }
);

export const PreRegistrationPayment = mongoose.model<IPreRegistrationPayment>(
  "PreRegistrationPayment",
  preRegistrationPaymentSchema
);
