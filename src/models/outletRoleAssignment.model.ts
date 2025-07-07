import mongoose, { Schema } from 'mongoose';
import { IOutletRoleAssignment } from '../interfaces/outletRoleAssignment.interface';
import bcryptjs from 'bcryptjs';

const outletRoleAssignmentSchema = new Schema<IOutletRoleAssignment>({
  outlet: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  role: { type: String, required: true },
  responsibilities: { type: [String], default: [] },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  name: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
}, { timestamps: true });

// Add pre-save hook to hash password if modified
outletRoleAssignmentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const OutletRoleAssignment = mongoose.model<IOutletRoleAssignment>('OutletRoleAssignment', outletRoleAssignmentSchema); 