import mongoose, { Schema } from 'mongoose';
import { IEventOrganizer } from '../interfaces/eventOrganizer.interface';
import bcrypt from 'bcryptjs';

const eventOrganizerSchema = new Schema<IEventOrganizer>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false }
}, { timestamps: true });

eventOrganizerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const EventOrganizer = mongoose.model<IEventOrganizer>('EventOrganizer', eventOrganizerSchema); 