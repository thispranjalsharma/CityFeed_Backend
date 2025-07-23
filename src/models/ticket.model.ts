import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  ticketTierId: mongoose.Types.ObjectId;
  qrCodeUrl: string;
  quantity: number;
  status: 'active' | 'used' | 'invalidated';
  issuedAt: Date;
  scannedAt?: Date | null;
  scannedBy?: mongoose.Types.ObjectId | null;
}

const TicketSchema = new Schema<ITicket>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketTierId: { type: Schema.Types.ObjectId, ref: 'TicketTier', required: false },
  qrCodeUrl: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['active', 'used', 'invalidated', 'refunded'], default: 'active' },
  issuedAt: { type: Date, default: Date.now },
  scannedAt: { type: Date, default: null },
  scannedBy: { type: Schema.Types.ObjectId, ref: 'EventStaff', default: null }
}, { timestamps: true });

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema); 