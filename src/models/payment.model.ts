import mongoose, { Schema } from 'mongoose';
import { IPayment } from '../interfaces/payment.interface';

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User'
    },
    outletId: {
      type: String,
      ref: 'Outlet'
    },
    offerId: {
      type: String,
      ref: 'Offer'
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['recharge', 'dine-in', 'refund', 'membership_upgrade', 'event'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'razorpay', 'upi', 'cash', 'card'],
      required: false
    },
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false
    },
    dineInSessionId: {
      type: String,
      ref: 'DineInSession'
    },
    sessionId: { type: String },
    coinsUsed: {
      type: Number,
      required: false
    },
    cashAmount: {
      type: Number,
      required: false
    },
    nonCoinPaymentMethod: {
      type: String,
      enum: ['upi', 'cash', 'card'],
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Add indexes
paymentSchema.index({ userId: 1 });
paymentSchema.index({ outletId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema); 