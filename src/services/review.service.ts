import { ReviewRepository } from '../repositories/review.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { UserRepository } from '../repositories/user.repository';
import { OutletRepository } from '../repositories/outlet.repository';
import { AppErrorClass } from '../utils/appError';
import { Review } from '../models/review.model';

export class ReviewService {
  private reviewRepository: ReviewRepository;
  private dineInSessionRepository: DineInSessionRepository;
  private userRepository: UserRepository;
  private outletRepository: OutletRepository;

  constructor() {
    this.reviewRepository = new ReviewRepository();
    this.dineInSessionRepository = new DineInSessionRepository();
    this.userRepository = new UserRepository();
    this.outletRepository = new OutletRepository();
  }

  async createReview(data: {
    userId: string;
    dineInSessionId: string;
    rating: number;
    comment: string;
  }) {
    const { userId, dineInSessionId, rating, comment } = data;

    // Verify user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }

    // Verify dine-in session
    const session = await this.dineInSessionRepository.findById(dineInSessionId);
    if (!session) {
      throw new AppErrorClass('Dine-in session not found', 404);
    }

    // Check if user is authorized to review this session
    if (session.userId.toString() !== userId) {
      throw new AppErrorClass('Not authorized to review this session', 403);
    }

    // Check if review already exists
    const existingReview = await this.reviewRepository.findByDineInSession(dineInSessionId);
    if (existingReview) {
      throw new AppErrorClass('Review already exists for this session', 400);
    }

    // Create review
    const review = await this.reviewRepository.create({
      userId,
      outletId: session.outletId.toString(),
      dineInSessionId,
      rating,
      comment
    });

    return review;
  }

  async getReviewByDineInSession(dineInSessionId: string) {
    return this.reviewRepository.findByDineInSession(dineInSessionId);
  }

  async getOutletReviews(outletId: string) {
    // Verify outlet exists
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass('Outlet not found', 404);
    }

    return this.reviewRepository.findByOutlet(outletId);
  }

  async getUserReviews(userId: string) {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }

    return this.reviewRepository.findByUser(userId);
  }

  async updateReview(reviewId: string, userId: string, data: { rating?: number; comment?: string }) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppErrorClass('Review not found', 404);
    }

    // Check if user is authorized to update this review
    if (review.userId.toString() !== userId) {
      throw new AppErrorClass('Not authorized to update this review', 403);
    }

    const updatedReview = await this.reviewRepository.update(reviewId, data);
    return updatedReview;
  }

  async deleteReview(reviewId: string, userId: string, userRole?: string, userEmail?: string, userResponsibilities?: string[]) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppErrorClass('Review not found', 404);
    }

    // Allow super_admin and outlet_admin
    if (userRole === 'super_admin' || userRole === 'outlet_admin') {
      await this.reviewRepository.delete(reviewId);
      return;
    }

    // Allow employee with 'delete_review' responsibility for this outlet
    if (userRole === 'employee' && userResponsibilities && userResponsibilities.includes('delete_review')) {
      await this.reviewRepository.delete(reviewId);
      return;
    }

    // Only allow the user who created the review to delete (if not admin/employee)
    if (review.userId.toString() === userId) {
      throw new AppErrorClass('Users are not allowed to delete reviews', 403);
    }

    throw new AppErrorClass('Not authorized to delete this review', 403);
  }

  async getOutletAverageRating(outletId: string) {
    return this.reviewRepository.getOutletAverageRating(outletId);
  }

  /**
   * Get all reviews with pagination.
   * @param {number} page
   * @param {number} limit
   */
  async getAllReviewsPaginated(page: number, limit: number) {
    return this.reviewRepository.findAllPaginated(page, limit);
  }

  /**
   * Get paginated reviews for a specific outlet with user details.
   * @param {string} outletId
   * @param {number} page
   * @param {number} limit
   */
  async getOutletReviewsPaginated(outletId: string, page: number, limit: number) {
    // Verify outlet exists
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass('Outlet not found', 404);
    }

    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      Review.find({ outletId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name gender')
        .exec(),
      Review.countDocuments({ outletId })
    ]);

    return { reviews, total };
  }
} 