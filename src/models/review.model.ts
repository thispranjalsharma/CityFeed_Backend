import mongoose, { Schema, Document, Types, FilterQuery } from "mongoose";
// import { IReview } from "../interfaces/review.interface";

export interface IReview {
  _id?: string;
  userId: string;
  outletId: string;
  dineInSessionId: string;
  rating: number;
  comment: string;
  createdAt?: Date;
}

export interface IReviewResponse extends IReview {
  user: {
    _id: string;
    name: string;
  };
  outlet: {
    _id: string;
    businessName: string;
  };
}
export interface IReviewDocument extends Omit<IReview, "_id">, Document {
  _id: Types.ObjectId;
}

const reviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
    },
    dineInSessionId: {
      type: Schema.Types.ObjectId,
      ref: "DineInSession",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Index for querying outlet reviews
reviewSchema.index({ outletId: 1, createdAt: -1 });

// Index for querying user reviews
reviewSchema.index({ userId: 1, createdAt: -1 });

export const Review = mongoose.model<IReviewDocument>("Review", reviewSchema);
