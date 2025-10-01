import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { IReviewService } from "../services/review.service";
import { AuthRequest } from "../interfaces/auth.interface";
import { IUserRepository } from "../repositories/user.repository";
import { injectable, inject } from "inversify";
import { EmailQueueService } from "../services/emailQueue.service";

@injectable()
export class ReviewController extends BaseController {

  constructor(
    @inject("ReviewService") private reviewService: IReviewService,
    @inject("UserRepository") private userRepository: IUserRepository,
    @inject("EmailQueueService") emailQueueService: EmailQueueService
  ) {
    super(
      emailQueueService
    );
  }

  createReview = async (req: Request, res: Response) => {
    try {
      const { dineInSessionId, rating, comment } = req.body;

      // Validate required fields
      if (!dineInSessionId || !rating || !comment) {
        return this.sendError(res, "Missing required fields", 400);
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        return this.sendError(res, "Rating must be between 1 and 5", 400);
      }

      const review = await this.reviewService.createReviewBySessionId({
        dineInSessionId,
        rating,
        comment,
      });

      res.status(201);
      this.sendSuccess(res, review, "Review created successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getReviewsByDineInSession = async (req: Request, res: Response) => {
    try {
      const { dineInSessionId } = req.params;
      const review = await this.reviewService.getReviewByDineInSession(
        dineInSessionId
      );
      if (!review) {
        return this.sendError(res, "Review not found", 404);
      }
      this.sendSuccess(res, review);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getReviewsByOutlet = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const reviews = await this.reviewService.getOutletReviews(outletId);
      // const userRepository = new UserRepository();
      const reviewsWithUserDetails = await Promise.all(
        reviews.map(async (review: any) => {
          const user = await this.userRepository.findById(review.userId);
          let userDetails = null;
          if (user) {
            userDetails = {
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              profilePicture: user.profilePicture,
            };
          }
          return {
            ...review.toObject(),
            userDetails,
          };
        })
      );
      this.sendSuccess(res, reviewsWithUserDetails);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getReviewsByUser = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const reviews = await this.reviewService.getUserReviews(
        userId.toString()
      );
      this.sendSuccess(res, reviews);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  updateReview = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const { rating, comment } = req.body;
      if (rating && (rating < 1 || rating > 5)) {
        return this.sendError(res, "Rating must be between 1 and 5", 400);
      }

      const updatedReview = await this.reviewService.updateReview(
        id,
        userId.toString(),
        { rating, comment }
      );
      this.sendSuccess(res, updatedReview);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  deleteReview = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const userEmail = req.user?.email;
      const userResponsibilities = req.user?.responsibilities;
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      await this.reviewService.deleteReview(
        id,
        userId.toString(),
        userRole,
        userEmail,
        userResponsibilities
      );
      this.sendSuccess(res, null, "Review deleted successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getAllReviewsPaginated = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { reviews, total } =
        await this.reviewService.getAllReviewsPaginated(page, limit);
      // Format response: username, gender, comment, rating, created date, businessName
      const formatted = reviews.map((review: any) => ({
        username: review.userId?.name,
        gender: review.userId?.gender,
        comment: review.comment,
        rating: review.rating,
        createdAt: review.createdAt,
        businessName: review.outletId?.businessName,
      }));
      this.sendSuccess(res, {
        reviews: formatted,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getPublicOutletReviews = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate outletId format
      if (!outletId || outletId.length !== 24) {
        return this.sendError(res, "Invalid outlet ID format", 400);
      }

      // Get reviews with pagination
      const { reviews, total } =
        await this.reviewService.getOutletReviewsPaginated(
          outletId,
          page,
          limit
        );

      // Format response with only public user information
      const formattedReviews = reviews.map((review: any) => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          name: review.userId?.name || "Anonymous",
          gender: review.userId?.gender || null,
        },
      }));

      this.sendSuccess(res, {
        reviews: formattedReviews,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
}
