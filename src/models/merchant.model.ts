import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IMerchantDocument } from '../interfaces/merchant.interface';

export { IMerchantDocument } from '../interfaces/merchant.interface';

interface ILocation {
  type: string;
  coordinates: number[];
}

const locationSchema = new Schema<ILocation>({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { 
    type: [Number],
    required: true,
    validate: {
      validator: function(v: number[]) {
        return v.length === 2 && 
               v[0] >= -180 && v[0] <= 180 && 
               v[1] >= -90 && v[1] <= 90;
      },
      message: 'Coordinates must be [longitude, latitude] with longitude between -180 and 180, and latitude between -90 and 90'
    }
  }
});

const merchantSchema = new Schema<IMerchantDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  businessName: { type: String, required: true },
  businessType: { 
    type: String, 
    enum: ['cafe', 'restaurant', 'bar', 'shop', 'service', 'other'], 
    required: true 
  },
  address: { type: String, required: true },
  location: { type: locationSchema, required: true },
  images: [{ type: String }],
  isApproved: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  role: { type: String, default: 'merchant' }
}, {
  timestamps: true
});

// Create geospatial index
merchantSchema.index({ location: '2dsphere' });

// Hash password before saving
merchantSchema.pre('save', async function(next) {
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
merchantSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Merchant = mongoose.model<IMerchantDocument>('Merchant', merchantSchema); 