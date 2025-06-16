import { Feedback, IFeedback } from '../models/feedback.model';

export class FeedbackRepository {
  async create(data: Partial<IFeedback>): Promise<IFeedback> {
    const feedback = new Feedback(data);
    return feedback.save();
  }

  async findByUserId(userId: string): Promise<IFeedback[]> {
    return Feedback.find({ userId }).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IFeedback | null> {
    return Feedback.findById(id);
  }
} 