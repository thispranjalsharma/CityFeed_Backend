import mongoose, { Schema } from 'mongoose';
import { IStaff } from '../interfaces/staff.interface';
import bcryptjs from 'bcryptjs';

const staffSchema = new Schema<IStaff>({
  outlet: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  role: { type: String, required: true },
  responsibilities: { type: [String], default: [] },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  name: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true, collection: 'staffs' });

// Index for soft delete queries
staffSchema.index({ isDeleted: 1 });
staffSchema.index({ deletedAt: 1 });

// Compound index for email and outlet (optional - for future use if you want to allow same email across outlets)
// staffSchema.index({ email: 1, outlet: 1 }, { unique: true });

// Add pre-save hook to hash password if modified
staffSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Staff = mongoose.model<IStaff>('Staff', staffSchema); 