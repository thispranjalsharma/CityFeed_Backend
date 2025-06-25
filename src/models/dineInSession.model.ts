import mongoose, { Schema } from 'mongoose';
import { IDineInSession } from '../interfaces/dineInSession.interface';

const dineInSessionSchema = new Schema<IDineInSession>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User'
    },
    outletId: {
      type: String,
      required: true,
      ref: 'Outlet'
    },
    offerId: {
      type: String,
      required: true,
      ref: 'Offer'
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending'
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date
    },
    totalBill: {
      type: Number
    },
    paymentId: {
      type: String,
      ref: 'Payment'
    }
  },
  {
    timestamps: true
  }
);

// Add indexes
dineInSessionSchema.index({ userId: 1 });
dineInSessionSchema.index({ outletId: 1 });
dineInSessionSchema.index({ status: 1 });
dineInSessionSchema.index({ createdAt: -1 });

export const DineInSession = mongoose.model<IDineInSession>('DineInSession', dineInSessionSchema); 