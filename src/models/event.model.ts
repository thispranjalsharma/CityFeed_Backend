import mongoose, { Schema, Document } from 'mongoose';

export interface IVenue {
  name: string;
  address: string;
  capacity: number;
  location: {
    lat: number;
    lng: number;
  };
}

export interface ITicketTier {
  name: string;
  price: number;
  quantity: number;
  description?: string;
  order: number;
  isActive: boolean;
  soldCount: number;
}

export interface IEvent extends Document {
  name: string;
  description: string;
  type: string;
  coverImages: string[];
  date: Date;
  startTime: string;
  endTime: string;
  venue: IVenue;
  saleStart: Date;
  saleEnd: Date;
  refundPolicy: string;
  specialInstructions?: string;
  status: 'draft' | 'published';
  createdBy: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  ticketPrice?: number;
  totalSoldCount?: number;
  ticketTiers: ITicketTier[];
}

const VenueSchema = new Schema<IVenue>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  capacity: { type: Number, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
});

const TicketTierSchema = new Schema<ITicketTier>({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  description: { type: String },
  order: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true },
  soldCount: { type: Number, default: 0, min: 0 }
}, { _id: true });

const EventSchema = new Schema<IEvent>({
  name: { type: String },
  description: { type: String },
  type: { type: String },
  coverImages: { type: [String], required: true },
  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  venue: { type: VenueSchema },
  saleStart: { type: Date },
  saleEnd: { type: Date },
  refundPolicy: { type: String },
  specialInstructions: { type: String },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  managerId: { type: Schema.Types.ObjectId, ref: 'EventManager' },
  ticketPrice: { type: Number },
  totalSoldCount: { type: Number, default: 0 },
  ticketTiers: { type: [TicketTierSchema], default: [] },
}, { timestamps: true });

// Ensure virtuals are included in toObject and toJSON
EventSchema.set('toObject', { virtuals: true });
EventSchema.set('toJSON', { virtuals: true });

export const Event = mongoose.model<IEvent>('Event', EventSchema); 