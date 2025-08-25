import { Document } from 'mongoose';

export interface IPreRegistrationPayment extends Document {
  email: string;
  membershipType: 'cityfeed_select' | 'cityfeed_edge' | 'cityfeed_prime';
  amount: number;
  razorpayOrderId: string;
  status: 'pending' | 'success' | 'failed' | 'consumed';
  consumedAt?: Date;
  userId?: string;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
} 