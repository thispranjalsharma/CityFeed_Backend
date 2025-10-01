import { injectable, inject } from "inversify";
import { IReviewRepository } from "../repositories/review.repository";
import { IDineInSessionRepository } from "../repositories/dineInSession.repository";
import { IUserRepository } from "../repositories/user.repository";
import { AppErrorClass } from "../utils/appError";
import { Review } from "../models/review.model";
import { IOutletRepository } from "../repositories/outlet.repository";
import { IRewardHistoryRepository } from "../repositories/rewardHistory.repository";
// import { Review } from "../models/review.model";

export interface IReviewService {
  createReviewBySessionId(data: {
    dineInSessionId: string;
    rating: number;
    comment: string;
  }): Promise<any>;
  getReviewByDineInSession(dineInSessionId: string): Promise<any>;
  getOutletAverageRating(outletId: string): Promise<number>;
  getOutletReviews(outletId: string): Promise<any>;
  getUserReviews(userId: string): Promise<any>;
  updateReview(
    reviewId: string,
    userId: string,
    data: { rating?: number; comment?: string }
  ): Promise<any>;
  deleteReview(
    reviewId: string,
    userId: string,
    userRole?: string,
    userEmail?: string,
    userResponsibilities?: string[]
  ): Promise<void>;
  getAllReviewsPaginated(page: number, limit: number): Promise<any>;
  getOutletReviewsPaginated(
    outletId: string,
    page: number,
    limit: number
  ): Promise<any>;
  getRewardHistory(
    userId: string,
    page: number,
    limit: number,
    transactionType?: string,
    sourceType?: string
  ): Promise<any>;
}

@injectable()
export class ReviewService implements IReviewService {
  constructor(
    @inject("ReviewRepository") private reviewRepository: IReviewRepository,
    @inject("DineInSessionRepository")
    private dineInSessionRepository: IDineInSessionRepository,
    @inject("UserRepository") private userRepository: IUserRepository,
    @inject("OutletRepository") private outletRepository: IOutletRepository,
    @inject("RewardHistoryRepository")
    private rewardHistoryRepository: IRewardHistoryRepository
  ) {}

  async getRewardHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    transactionType?: "earned" | "redeemed" | "refund" | "adjustment",
    sourceType?:
      | "dine-in"
      | "event"
      | "referral"
      | "membership"
      | "adjustment"
      | "refund"
  ) {
    return await this.rewardHistoryRepository.getRewardHistoryByUserId(
      userId,
      page,
      limit,
      transactionType,
      sourceType
    );
  }

  async createReviewBySessionId(data: {
    dineInSessionId: string;
    rating: number;
    comment: string;
  }) {
    const { dineInSessionId, rating, comment } = data;

    // Verify dine-in session exists
    const session = await this.dineInSessionRepository.findById(
      dineInSessionId
    );
    if (!session) {
      throw new AppErrorClass("Dine-in session not found", 404);
    }

    // Extract userId from the session
    const userId = session.userId.toString();

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }

    // Check if session is in a valid state for review (completed or active)
    if (session.status !== "completed" && session.status !== "active") {
      throw new AppErrorClass(
        "Session is not in a valid state for review",
        400
      );
    }

    // Check if review already exists
    const existingReview = await this.reviewRepository.findByDineInSession(
      dineInSessionId
    );
    if (existingReview) {
      throw new AppErrorClass("Review already exists for this session", 400);
    }

    // Create review
    const review = await this.reviewRepository.create({
      userId,
      outletId: session.outletId.toString(),
      dineInSessionId,
      rating,
      comment,
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
      throw new AppErrorClass("Outlet not found", 404);
    }

    return this.reviewRepository.findByOutlet(outletId);
  }

  async getUserReviews(userId: string) {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }

    return this.reviewRepository.findByUser(userId);
  }

  async updateReview(
    reviewId: string,
    userId: string,
    data: { rating?: number; comment?: string }
  ) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppErrorClass("Review not found", 404);
    }

    // Check if user is authorized to update this review
    if (review.userId.toString() !== userId) {
      throw new AppErrorClass("Not authorized to update this review", 403);
    }

    const updatedReview = await this.reviewRepository.update(reviewId, data);
    return updatedReview;
  }

  async deleteReview(
    reviewId: string,
    userId: string,
    userRole?: string,
    userEmail?: string,
    userResponsibilities?: string[]
  ) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppErrorClass("Review not found", 404);
    }

    // Allow super_admin and outlet_admin
    if (userRole === "super_admin" || userRole === "outlet_admin") {
      await this.reviewRepository.delete(reviewId);
      return;
    }

    // Allow employee with 'delete_review' responsibility for this outlet
    if (
      userRole === "employee" &&
      userResponsibilities &&
      userResponsibilities.includes("delete_review")
    ) {
      await this.reviewRepository.delete(reviewId);
      return;
    }

    // Only allow the user who created the review to delete (if not admin/employee)
    if (review.userId.toString() === userId) {
      throw new AppErrorClass("Users are not allowed to delete reviews", 403);
    }

    throw new AppErrorClass("Not authorized to delete this review", 403);
  }

  async getOutletAverageRating(outletId: string) {
    return this.reviewRepository.getOutletAverageRating(outletId);
  }

  async getAllReviewsPaginated(page: number, limit: number) {
    return this.reviewRepository.findAllPaginated(page, limit);
  }

  async getOutletReviewsPaginated(
    outletId: string,
    page: number,
    limit: number
  ) {
    // Verify outlet exists
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass("Outlet not found", 404);
    }

    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      Review.find({ outletId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name gender")
        .exec(),
      Review.countDocuments({ outletId }),
    ]);

    return { reviews, total };
  }
}
