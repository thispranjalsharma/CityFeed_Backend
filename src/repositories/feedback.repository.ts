import { Feedback, IFeedback } from "../models/feedback.model";
import mongoose from "mongoose";

export interface IFeedbackRepository {
  create(data: Partial<IFeedback>): Promise<IFeedback>;
  findByUserId(userId: string): Promise<IFeedback[]>;
  findById(id: string): Promise<IFeedback | null>;
  findAll(): Promise<IFeedback[]>;
}
export class FeedbackRepository implements IFeedbackRepository {
  async create(data: Partial<IFeedback>): Promise<IFeedback> {
    const feedback = new Feedback(data);
    return feedback.save();
  }

  async findByUserId(userId: string): Promise<IFeedback[]> {
    return Feedback.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({
      createdAt: -1,
    });
  }

  async findById(id: string): Promise<IFeedback | null> {
    return Feedback.findById(id);
  }

  async findAll(): Promise<IFeedback[]> {
    return Feedback.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email gender");
  }
}
