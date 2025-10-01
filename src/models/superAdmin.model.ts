import mongoose, { Document, Schema } from "mongoose";
export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  isEmailVerified: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const superAdminSchema = new Schema<ISuperAdmin>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    isEmailVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const SuperAdmin = mongoose.model<ISuperAdmin>(
  "SuperAdmin",
  superAdminSchema
);
