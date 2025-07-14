import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const eventStaffSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  role: { type: String, default: 'event_staff', required: true },
  responsibilities: { type: [String], required: true },
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

eventStaffSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const EventStaff = mongoose.model('EventStaff', eventStaffSchema); 