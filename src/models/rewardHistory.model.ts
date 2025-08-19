import mongoose, { Schema } from 'mongoose';
import { IRewardHistory } from '../interfaces/rewardHistory.interface';

const rewardHistorySchema = new Schema<IRewardHistory>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User'
    },
    transactionType: {
      type: String,
      enum: ['earned', 'redeemed', 'refund', 'adjustment'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    sourceType: {
      type: String,
      enum: ['dine-in', 'event', 'referral', 'membership', 'adjustment', 'refund'],
      required: true
    },
    sourceId: {
      type: String,
      required: false // Can be paymentId, dineInSessionId, eventId, etc.
    },
    outletId: {
      type: String,
      ref: 'Outlet',
      required: false
    },
    eventId: {
      type: String,
      ref: 'Event', 
      required: false
    },
    description: {
      type: String,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Add indexes for efficient querying
rewardHistorySchema.index({ userId: 1, createdAt: -1 });
rewardHistorySchema.index({ transactionType: 1 });
rewardHistorySchema.index({ sourceType: 1 });
rewardHistorySchema.index({ sourceId: 1 });
rewardHistorySchema.index({ outletId: 1 });
rewardHistorySchema.index({ eventId: 1 });

export const RewardHistory = mongoose.model<IRewardHistory>('RewardHistory', rewardHistorySchema);
