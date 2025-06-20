import mongoose, { Schema } from 'mongoose';
import { ISuperAdmin } from '../interfaces/superAdmin.interface';
import bcryptjs from 'bcryptjs';

const superAdminSchema = new Schema<ISuperAdmin>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

superAdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcryptjs.compare(candidatePassword, this.password);
};

export const SuperAdmin = mongoose.model<ISuperAdmin>('SuperAdmin', superAdminSchema); 