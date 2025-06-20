import mongoose, { Schema, Document } from 'mongoose';
import bcryptjs from 'bcryptjs';
import { IAdminDocument } from '../interfaces/admin.interface';

const adminSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'outlet_admin'], default: 'outlet_admin' },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Index for email queries
// adminSchema.index({ email: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    if (!this.password) {
      return next(new Error('Password is required'));
    }
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const Admin = mongoose.model<IAdminDocument>('Admin', adminSchema); 