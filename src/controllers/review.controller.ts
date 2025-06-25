import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ReviewService } from '../services/review.service';
import { AuthRequest } from '../interfaces/auth.interface';

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
      this.sendSuccess(res, reviews);
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
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      await this.reviewService.deleteReview(id, userId.toString());
      this.sendSuccess(res, null, 'Review deleted successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
} 