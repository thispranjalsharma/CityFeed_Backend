import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderTicket {
  ticketTierId: mongoose.Types.ObjectId;
  quantity: number;
  priceAtPurchase: number;
}

export interface IOrder extends Document {
  event: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  tickets: IOrderTicket[];
  status: 'pending' | 'paid' | 'cancelled' | 'cancellation_requested' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const OrderTicketSchema = new Schema<IOrderTicket>({
  ticketTierId: { type: Schema.Types.ObjectId, ref: 'TicketTier', required: true },
  quantity: { type: Number, required: true },
  priceAtPurchase: { type: Number, required: true }
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tickets: { type: [OrderTicketSchema], required: true },
  status: { type: String, enum: ['pending', 'paid', 'cancelled', 'cancellation_requested', 'refunded'], default: 'pending' },
  expiresAt: { type: Date, required: false },
}, { timestamps: true });

// TTL index: auto-delete orders after expiresAt
OrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema); 