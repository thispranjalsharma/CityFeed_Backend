import mongoose, { Schema, Document, Types } from 'mongoose';
import { IReview } from '../interfaces/review.interface';

export interface IReviewDocument extends Omit<IReview, '_id'>, Document {
  _id: Types.ObjectId;
}

const reviewSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  merchantId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Merchant', 
    required: true 
  },
  dineInSessionId: { 
    type: Schema.Types.ObjectId, 
    ref: 'DineInSession', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  comment: { type: String, required: true }
}, {
  timestamps: true
});

// Index for querying merchant reviews
reviewSchema.index({ merchantId: 1, createdAt: -1 });

// Index for querying user reviews
reviewSchema.index({ userId: 1, createdAt: -1 });

export const Review = mongoose.model<IReviewDocument>('Review', reviewSchema); 