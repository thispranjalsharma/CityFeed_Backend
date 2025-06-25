import { ReviewRepository } from '../repositories/review.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { UserRepository } from '../repositories/user.repository';
import { AppErrorClass } from '../utils/appError';

export class ReviewService {
  private reviewRepository: ReviewRepository;
  private dineInSessionRepository: DineInSessionRepository;
  private userRepository: UserRepository;

  constructor() {
    this.reviewRepository = new ReviewRepository();
    this.dineInSessionRepository = new DineInSessionRepository();
    this.userRepository = new UserRepository();
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
    const outletRepository = require('../repositories/outlet.repository');
    const outletRepo = new outletRepository.OutletRepository();
    const outlet = await outletRepo.findById(outletId);
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

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppErrorClass('Review not found', 404);
    }

    // Check if user is authorized to delete this review
    if (review.userId.toString() !== userId) {
      throw new AppErrorClass('Not authorized to delete this review', 403);
    }

    await this.reviewRepository.delete(reviewId);
  }

  async getOutletAverageRating(outletId: string) {
    return this.reviewRepository.getOutletAverageRating(outletId);
  }
} 