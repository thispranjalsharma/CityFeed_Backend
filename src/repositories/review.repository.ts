import { Review, IReviewDocument } from "../models/review.model";
import { inject, injectable } from "inversify";

export interface IReviewRepository {
  findByUser(userId: string): Promise<IReviewDocument[]>;
  findByOutlet(outletId: string): Promise<IReviewDocument[]>;
  findByDineInSession(dineInSessionId: string): Promise<IReviewDocument | null>;
  getOutletAverageRating(outletId: string): Promise<number>;
  findAllPaginated(
    page: number,
    limit: number
  ): Promise<{ reviews: IReviewDocument[]; total: number }>;
  getRewardHistory(
    userId: string,
    page?: number,
    limit?: number,
    transactionType?: string,
    sourceType?: string
  ): Promise<any>;
  getRewardSummary(userId: string): Promise<any>;
  create(data: Partial<IReviewDocument>): Promise<IReviewDocument>;
  findById(id: string): Promise<IReviewDocument | null>;
  update(
    id: string,
    data: Partial<IReviewDocument>
  ): Promise<IReviewDocument | null>;
  delete(id: string): Promise<IReviewDocument | null>;
}

@injectable()
export class ReviewRepository implements IReviewRepository {
  constructor(@inject("Review") private review: typeof Review) {}

  delete(id: string): Promise<IReviewDocument | null> {
    return this.review.findByIdAndDelete(id);
  }

  update(
    id: string,
    data: Partial<IReviewDocument>
  ): Promise<IReviewDocument | null> {
    return this.review.findByIdAndUpdate(id, data, { new: true });
  }

  findById(id: string): Promise<IReviewDocument | null> {
    return this.review.findById(id);
  }

  async create(data: Partial<IReviewDocument>): Promise<IReviewDocument> {
    const newReview = new this.review(data);
    return newReview.save();
  }

  getRewardSummary(userId: string): Promise<any> {
    return this.review.find({ userId }).sort({ createdAt: -1 });
  }

  async getRewardHistory(
    userId: string,
    page?: number,
    limit?: number,
    transactionType?: string,
    sourceType?: string
  ): Promise<any> {
    return this.review.find({ userId }).sort({ createdAt: -1 });
  }

  async findByUser(userId: string): Promise<IReviewDocument[]> {
    return this.review.find({ userId }).sort({ createdAt: -1 });
  }

  async findByOutlet(outletId: string): Promise<IReviewDocument[]> {
    return this.review.find({ outletId }).sort({ createdAt: -1 });
  }

  async findByDineInSession(
    dineInSessionId: string
  ): Promise<IReviewDocument | null> {
    return this.review.findOne({ dineInSessionId });
  }

  async getOutletAverageRating(outletId: string): Promise<number> {
    const reviews = await this.review.find({ outletId });
    if (reviews.length === 0) return 0;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
  }

  /**
   * Fetch all reviews with pagination and sorting.
   * @param {number} page - The page number (1-based)
   * @param {number} limit - The number of reviews per page
   * @returns {Promise<{reviews: IReviewDocument[], total: number}>}
   */
  async findAllPaginated(
    page: number,
    limit: number
  ): Promise<{ reviews: IReviewDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      Review.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name gender")
        .populate("outletId", "businessName")
        .exec(),
      Review.countDocuments({}),
    ]);
    return { reviews, total };
  }
}
