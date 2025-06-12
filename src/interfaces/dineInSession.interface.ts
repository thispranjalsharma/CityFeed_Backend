import { Document } from 'mongoose';

export interface IDineInSession extends Document {
  userId: string;
  merchantId: string;
  offerId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalBill?: number;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDineInSessionDto {
  userId: string;
  merchantId: string;
  offerId: string;
  totalBill?: number;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
}

export interface UpdateDineInSessionDto {
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  endTime?: Date;
  totalBill?: number;
  paymentId?: string;
}

export interface IDineInSessionResponse extends IDineInSession {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  merchant: {
    _id: string;
    businessName: string;
  };
  offer: {
    _id: string;
    title: string;
    discountDetails: string;
  };
} 