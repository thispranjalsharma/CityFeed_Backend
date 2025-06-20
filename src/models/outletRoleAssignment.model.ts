import mongoose, { Schema } from 'mongoose';
import { IOutletRoleAssignment } from '../interfaces/outletRoleAssignment.interface';

const outletRoleAssignmentSchema = new Schema<IOutletRoleAssignment>({
  outlet: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  role: { type: String, required: true },
  responsibilities: { type: [String], default: [] },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  name: { type: String },
}, { timestamps: true });

export const OutletRoleAssignment = mongoose.model<IOutletRoleAssignment>('OutletRoleAssignment', outletRoleAssignmentSchema); 