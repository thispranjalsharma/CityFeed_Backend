import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument } from '../interfaces/user.interface';

export { IUserDocument } from '../interfaces/user.interface';

const userSchema = new Schema<IUserDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  phone: { type: String, required: true },
  membershipType: { type: String, enum: ['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'], required: true },
  membershipExpiryDate: { type: Date, required: true },
  role: { type: String, enum: ['user', 'merchant', 'admin'], default: 'user' },
  coins: { 
    type: Number, 
    default: 0,
    get: (v: number) => Math.round(v),
    set: (v: number) => Math.round(v)
  },
  reward_points: {
    type: Number,
    default: 0,
    get: (v: number) => Math.round(v),
    set: (v: number) => Math.round(v)
  },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  profilePicture: { type: String },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zipCode: { type: String }
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' }
  },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  isApproved: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Index for email queries
// userSchema.index({ email: 1 });

export const User = mongoose.model<IUserDocument>('User', userSchema); 