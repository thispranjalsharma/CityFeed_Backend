import mongoose, { Schema, Document } from 'mongoose';

// TicketTier model is now deprecated. Ticket tiers are embedded in the Event model as subdocuments.
// Do not use this model for new features.
export interface ITicketTier extends Document {
  name: string;
  price: number;
  quantity: number;
  description?: string;
  order: number;
  event: mongoose.Types.ObjectId;
  isActive: boolean;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TicketTierSchema = new Schema<ITicketTier>({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  description: { type: String },
  order: { type: Number, required: true, min: 1 },
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  isActive: { type: Boolean, default: true },
  soldCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

// Index for efficient queries
TicketTierSchema.index({ event: 1, order: 1 });

export const TicketTier = mongoose.model<ITicketTier>('TicketTier', TicketTierSchema); 