import { Document } from 'mongoose';

export interface IPreRegistrationPayment extends Document {
  email: string;
  membershipType: 'cityfeed_select' | 'cityfeed_edge' | 'cityfeed_prime';
  amount: number;
  razorpayOrderId: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;
  updatedAt: Date;
} 