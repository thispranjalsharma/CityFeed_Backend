import { BaseRepository } from './base.repository';
import { Review, IReviewDocument } from '../models/review.model';

export class ReviewRepository extends BaseRepository<IReviewDocument> {
  constructor() {
    super(Review);
  }

  async findByUser(userId: string): Promise<IReviewDocument[]> {
    return this.findSorted({ userId }, { createdAt: -1 });
  }

  async findByOutlet(outletId: string): Promise<IReviewDocument[]> {
    return this.findSorted({ outletId }, { createdAt: -1 });
  }

  async findByDineInSession(dineInSessionId: string): Promise<IReviewDocument | null> {
    return this.findOne({ dineInSessionId });
  }

  async getOutletAverageRating(outletId: string): Promise<number> {
    const reviews = await this.find({ outletId });
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
  async findAllPaginated(page: number, limit: number): Promise<{reviews: IReviewDocument[], total: number}> {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      Review.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name gender')
        .populate('outletId', 'businessName')
        .exec(),
      Review.countDocuments({})
    ]);
    return { reviews, total };
  }
} 