import mongoose from 'mongoose';

export interface IFeedback {
  userId: mongoose.Types.ObjectId;
  category: 'general' | 'bug' | 'feature' | 'complaint';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new mongoose.Schema<IFeedback>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      enum: ['general', 'bug', 'feature', 'complaint'],
      required: true
    },
    description: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema); 