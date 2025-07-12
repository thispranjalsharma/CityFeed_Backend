import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ReviewService } from '../services/review.service';
import { AuthRequest } from '../interfaces/auth.interface';
import { UserRepository } from '../repositories/user.repository';

export class ReviewController extends BaseController {
  private reviewService: ReviewService;

  constructor() {
    super();
    this.reviewService = new ReviewService();
  }

  /**
   * @swagger
   * /api/reviews:
   *   post:
   *     summary: Create a new review
   *     tags: [Reviews]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - dineInSessionId
   *               - rating
   *               - comment
   *             properties:
   *               dineInSessionId:
   *                 type: string
   *               rating:
   *                 type: number
   *                 minimum: 1
   *                 maximum: 5
   *               comment:
   *                 type: string
   *     responses:
   *       201:
   *         description: Review created successfully
   *       400:
   *         description: Invalid input or review already exists
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Not authorized to review this session
   *       404:
   *         description: Dine-in session not found
   */
  createReview = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { dineInSessionId, rating, comment } = req.body;

      // Validate required fields
      if (!dineInSessionId || !rating || !comment) {
        return this.sendError(res, 'Missing required fields', 400);
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        return this.sendError(res, 'Rating must be between 1 and 5', 400);
      }

      const review = await this.reviewService.createReview({
        userId: userId.toString(),
        dineInSessionId,
        rating,
        comment
      });

      res.status(201);
      this.sendSuccess(res, review, 'Review created successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/reviews/session/{dineInSessionId}:
   *   get:
   *     summary: Get review for a dine-in session
   *     tags: [Reviews]
   *     parameters:
   *       - in: path
   *         name: dineInSessionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Review details
   *       404:
   *         description: Review not found
   */
  getReviewsByDineInSession = async (req: Request, res: Response) => {
    try {
      const { dineInSessionId } = req.params;
      const review = await this.reviewService.getReviewByDineInSession(dineInSessionId);
      if (!review) {
        return this.sendError(res, 'Review not found', 404);
      }
      this.sendSuccess(res, review);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/reviews/outlet/{outletId}:
   *   get:
   *     summary: Get all reviews for an outlet
   *     tags: [Reviews]
   *     parameters:
   *       - in: path
   *         name: outletId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of outlet reviews
   */
  getReviewsByOutlet = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const reviews = await this.reviewService.getOutletReviews(outletId);
      const userRepository = new UserRepository();
      const reviewsWithUserDetails = await Promise.all(reviews.map(async (review: any) => {
        const user = await userRepository.findById(review.userId);
        let userDetails = null;
        if (user) {
          userDetails = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            profilePicture: user.profilePicture
          };
        }
        return {
          ...review.toObject(),
          userDetails
        };
      }));
      this.sendSuccess(res, reviewsWithUserDetails);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/reviews/user:
   *   get:
   *     summary: Get all reviews by the authenticated user
   *     tags: [Reviews]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of user's reviews
   *       401:
   *         description: Not authenticated
   */
  getReviewsByUser = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const reviews = await this.reviewService.getUserReviews(userId.toString());
      this.sendSuccess(res, reviews);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/reviews/{id}:
   *   put:
   *     summary: Update a review
   *     tags: [Reviews]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               rating:
   *                 type: number
   *                 minimum: 1
   *                 maximum: 5
   *               comment:
   *                 type: string
   *     responses:
   *       200:
   *         description: Review updated successfully
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Not authorized to update this review
   *       404:
   *         description: Review not found
   */
  updateReview = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { rating, comment } = req.body;
      if (rating && (rating < 1 || rating > 5)) {
        return this.sendError(res, 'Rating must be between 1 and 5', 400);
      }

      const updatedReview = await this.reviewService.updateReview(id, userId.toString(), { rating, comment });
      this.sendSuccess(res, updatedReview);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/reviews/{id}:
   *   delete:
   *     summary: Delete a review
   *     tags: [Reviews]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Review deleted successfully
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Not authorized to delete this review
   *       404:
   *         description: Review not found
   */
  deleteReview = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const userEmail = req.user?.email;
      const userResponsibilities = req.user?.responsibilities;
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      await this.reviewService.deleteReview(id, userId.toString(), userRole, userEmail, userResponsibilities);
      this.sendSuccess(res, null, 'Review deleted successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/reviews/all:
   *   get:
   *     summary: Get all reviews with pagination
   *     tags: [Reviews]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of reviews per page
   *     responses:
   *       200:
   *         description: Paginated list of reviews
   */
  getAllReviewsPaginated = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { reviews, total } = await this.reviewService.getAllReviewsPaginated(page, limit);
      // Format response: username, gender, comment, rating, created date, businessName
      const formatted = reviews.map((review: any) => ({
        username: review.userId?.name,
        gender: review.userId?.gender,
        comment: review.comment,
        rating: review.rating,
        createdAt: review.createdAt,
        businessName: review.outletId?.businessName
      }));
      this.sendSuccess(res, {
        reviews: formatted,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/reviews/public/outlet/{outletId}:
   *   get:
   *     summary: Get all public reviews for an outlet (no authentication required)
   *     tags: [Reviews]
   *     parameters:
   *       - in: path
   *         name: outletId
   *         required: true
   *         schema:
   *           type: string
   *         description: The outlet ID to get reviews for
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of reviews per page
   *     responses:
   *       200:
   *         description: List of public outlet reviews
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                       rating:
   *                         type: number
   *                         minimum: 1
   *                         maximum: 5
   *                       comment:
   *                         type: string
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                       user:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                           gender:
   *                             type: string
   *                             enum: [male, female, other]
   *                 total:
   *                   type: number
   *                 page:
   *                   type: number
   *                 pageSize:
   *                   type: number
   *                 totalPages:
   *                   type: number
   *       400:
   *         description: Invalid outlet ID
   *       404:
   *         description: Outlet not found
   */
  getPublicOutletReviews = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate outletId format
      if (!outletId || outletId.length !== 24) {
        return this.sendError(res, 'Invalid outlet ID format', 400);
      }

      // Get reviews with pagination
      const { reviews, total } = await this.reviewService.getOutletReviewsPaginated(outletId, page, limit);

      // Format response with only public user information
      const formattedReviews = reviews.map((review: any) => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          name: review.userId?.name || 'Anonymous',
          gender: review.userId?.gender || null
        }
      }));

      this.sendSuccess(res, {
        reviews: formattedReviews,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
} 