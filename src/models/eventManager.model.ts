import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEventManager extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  isFirstLogin: boolean;
  isDeleted: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const EventManagerSchema = new Schema<IEventManager>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  role: { type: String, default: 'event_manager' },
  isEmailVerified: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'EventOrganizer', required: true },
}, { timestamps: true });

EventManagerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err as any);
  }
});

export const EventManager = mongoose.model<IEventManager>('EventManager', EventManagerSchema); 