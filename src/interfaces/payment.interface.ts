import { Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: string;
  outletId?: string;
  offerId?: string;
  amount: number;
  type: 'recharge' | 'dine-in' | 'refund' | 'membership_upgrade' | 'event';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'insufficient_coins' | 'otp_required';
  paymentMethod: 'wallet' | 'razorpay';
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
  createdAt: Date;
  updatedAt: Date;
  orderId?: Types.ObjectId | string;
}

export interface InsufficientCoinsResponse {
  status: 'insufficient_coins';
  requiredCoins: number;
  currentCoins: number;
  finalAmount: number;
  _id: null;
  orderDetails: null;
}

export interface OTPRequiredResponse {
  status: 'otp_required';
  message: string;
  finalAmount: number;
}

export interface DirectPaymentResponse {
  order: any; // Using any for Razorpay order since type definitions are problematic
  paymentId: unknown;
  keyId: string;
}

export type PaymentServiceResponse = IPayment | InsufficientCoinsResponse | OTPRequiredResponse | DirectPaymentResponse;

export interface CreatePaymentDto {
  userId: string;
  outletId?: string;
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
  totalBill?: number;
  orderDetails?: any;
  paidAt?: Date;
}

export interface UpdatePaymentDto {
  status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'insufficient_coins' | 'otp_required';
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
}