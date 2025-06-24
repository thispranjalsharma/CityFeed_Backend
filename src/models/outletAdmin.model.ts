import mongoose, { Schema, Document } from 'mongoose';
import bcryptjs from 'bcryptjs';

export interface IOutletAdminDocument extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'outlet_admin';
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const outletAdminSchema = new Schema<IOutletAdminDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['outlet_admin'], default: 'outlet_admin' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

outletAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

outletAdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcryptjs.compare(candidatePassword, this.password);
};

export const OutletAdmin = mongoose.model<IOutletAdminDocument>('OutletAdmin', outletAdminSchema); 