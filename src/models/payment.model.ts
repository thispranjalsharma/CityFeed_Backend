import mongoose, { Document, Schema } from "mongoose";
import { Types } from "mongoose";
// import { IPayment } from '../interfaces/payment.interface';

//

export interface IPayment extends Document {
  userId: string;
  outletId?: string;
  offerId?: string;
  amount: number;
  type: "recharge" | "dine-in" | "refund" | "membership_purchase" | "event";
  status:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "insufficient_coins"
    | "otp_required";
  paymentMethod: "wallet" | "razorpay" | "upi" | "cash" | "card";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  dineInSessionId?: string;
  sessionId?: string;
  requiredCoins?: number;
  currentCoins?: number;
  finalAmount?: number;
  totalBill?: number;
  orderDetails?: any;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  orderId?: Types.ObjectId | string;
  coinsUsed?: number;
  cashAmount?: number;
  nonCoinPaymentMethod?: "upi" | "cash" | "card";
}

export interface InsufficientCoinsResponse {
  status: "insufficient_coins";
  requiredCoins: number;
  currentCoins: number;
  finalAmount: number;
  _id: null;
  orderDetails: null;
}

export interface OTPRequiredResponse {
  status: "otp_required";
  message: string;
  finalAmount: number;
}

export interface DirectPaymentResponse {
  order: any; // Using any for Razorpay order since type definitions are problematic
  paymentId: unknown;
  keyId: string;
}

export type PaymentServiceResponse =
  | IPayment
  | InsufficientCoinsResponse
  | OTPRequiredResponse
  | DirectPaymentResponse;

export interface CreatePaymentDto {
  userId: string;
  outletId?: string;
  offerId?: string;
  amount: number;
  type: "recharge" | "dine-in" | "refund" | "membership_purchase";
  paymentMethod: "wallet" | "razorpay";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  dineInSessionId?: string;
  requiredCoins?: number;
  currentCoins?: number;
  finalAmount?: number;
  totalBill?: number;
  orderDetails?: any;
  paidAt?: Date;
}

export interface UpdatePaymentDto {
  status?:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "insufficient_coins"
    | "otp_required";
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
}

//

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    outletId: {
      type: String,
      ref: "Outlet",
    },
    offerId: {
      type: String,
      ref: "Offer",
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["recharge", "dine-in", "refund", "membership_purchase", "event"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "razorpay", "upi", "cash", "card"],
      required: false,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    dineInSessionId: {
      type: String,
      ref: "DineInSession",
    },
    sessionId: { type: String },
    coinsUsed: {
      type: Number,
      required: false,
    },
    cashAmount: {
      type: Number,
      required: false,
    },
    nonCoinPaymentMethod: {
      type: String,
      enum: ["upi", "cash", "card"],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes
paymentSchema.index({ userId: 1 });
paymentSchema.index({ outletId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ createdAt: -1 });
// Compound index for duplicate payment check
paymentSchema.index({
  userId: 1,
  outletId: 1,
  amount: 1,
  status: 1,
  type: 1,
  createdAt: -1,
});

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
