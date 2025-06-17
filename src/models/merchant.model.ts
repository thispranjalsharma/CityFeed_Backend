import mongoose, { Schema, Document, Types } from 'mongoose';
import { IMerchant, ILocation } from '../interfaces/merchant.interface';
import bcrypt from 'bcryptjs';
import { BaseDocument } from '../repositories/base.repository';

export interface IMerchantDocument extends IMerchant, BaseDocument {
  comparePassword(candidatePassword: string): Promise<boolean>;
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

const merchantSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessType: {
    type: String,
    required: true,
    enum: ['cafe', 'restaurant', 'bar', 'shop', 'service', 'other']
  },
  businessDescription: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['veg', 'non-veg', 'both'],
    default: undefined
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: locationSchema,
    required: true
  },
  images: {
    type: [{
      type: String,
      required: true
    }],
    default: []
  },
  role: {
    type: String,
    default: 'merchant'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  defaultMaxDiscount: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 20
  }
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
    const password = this.get('password') as string;
    const hashedPassword = await bcrypt.hash(password, salt);
    this.set('password', hashedPassword);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
merchantSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    const password = this.get('password') as string;
    return await bcrypt.compare(candidatePassword, password);
  } catch (error) {
    throw error;
  }
};

export const Merchant = mongoose.model<IMerchantDocument>('Merchant', merchantSchema); 