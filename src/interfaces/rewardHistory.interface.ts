import { BaseDocument } from '../repositories/base.repository';

export interface IRewardHistory extends BaseDocument {
  userId: string;
  transactionType: 'earned' | 'redeemed' | 'refund' | 'adjustment';
  amount: number;
  sourceType: 'dine-in' | 'event' | 'referral' | 'membership' | 'adjustment' | 'refund';
  sourceId?: string; // paymentId, dineInSessionId, eventId, etc.
  outletId?: string;
  eventId?: string;
  description: string;
  balanceAfter: number;
  balanceBefore: number;
  metadata?: any;
  // Referral-specific fields
  referredUserId?: string; // ID of the user who was referred (only for referral rewards)
  createdAt: Date;
  updatedAt: Date;
}

export interface IRewardHistoryCreate {
  userId: string;
  transactionType: 'earned' | 'redeemed' | 'refund' | 'adjustment';
  amount: number;
  sourceType: 'dine-in' | 'event' | 'referral' | 'membership' | 'adjustment' | 'refund';
  sourceId?: string;
  outletId?: string;
  eventId?: string;
  description: string;
  balanceAfter: number;
  balanceBefore: number;
  metadata?: any;
  // Referral-specific fields
  referredUserId?: string; // ID of the user who was referred (only for referral rewards)
}
