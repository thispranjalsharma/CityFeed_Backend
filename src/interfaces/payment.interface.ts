import { Document } from 'mongoose';

export interface IPayment extends Document {
  userId: string;
  merchantId?: string;
  offerId?: string;
  amount: number;
  type: 'recharge' | 'dine-in' | 'refund' | 'membership_upgrade';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'insufficient_coins';
  paymentMethod: 'wallet' | 'razorpay';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  dineInSessionId?: string;
  requiredCoins?: number;
  currentCoins?: number;
  finalAmount?: number;
  orderDetails?: any;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDto {
  userId: string;
  merchantId?: string;
  offerId?: string;
  amount: number;
  type: 'recharge' | 'dine-in' | 'refund' | 'membership_upgrade';
  paymentMethod: 'wallet' | 'razorpay';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  dineInSessionId?: string;
  requiredCoins?: number;
  currentCoins?: number;
  finalAmount?: number;
  orderDetails?: any;
  paidAt?: Date;
}

export interface UpdatePaymentDto {
  status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'insufficient_coins';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
}