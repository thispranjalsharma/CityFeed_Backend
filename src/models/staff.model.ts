import mongoose, { Schema } from 'mongoose';

const staffSchema = new Schema({
  outlet: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  role: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  responsibilities: { type: [String], default: [] },
}, { timestamps: true, collection: 'staffs' });

export const Staff = mongoose.model('Staff', staffSchema); 