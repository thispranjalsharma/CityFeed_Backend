import mongoose, { Schema } from 'mongoose';
import { IPreRegistrationPayment } from '../interfaces/preRegistrationPayment.interface';

const preRegistrationPaymentSchema = new Schema<IPreRegistrationPayment>({
  email: { type: String, required: true },
  membershipType: {
    type: String,
    enum: ['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'],
    required: true,
  },
  amount: { type: Number, required: true },
  razorpayOrderId: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

export const PreRegistrationPayment = mongoose.model<IPreRegistrationPayment>('PreRegistrationPayment', preRegistrationPaymentSchema); 