import express, { Router, RequestHandler } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticate, userAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { check } from 'express-validator';

const router: Router = express.Router();
const reviewController = new ReviewController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - dineInSessionId
 *         - rating
 *         - comment
 *       properties:
 *         dineInSessionId:
 *           type: string
 *           description: ID of the dine-in session
 *         rating:
 *           type: number
 *           description: Rating from 1 to 5
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *           description: Review comment
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a new review using dine-in session ID
 *     description: Create a new review for a dine-in session using session ID (no authentication required)
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
 *                 description: ID of the dine-in session
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5
 *               comment:
 *                 type: string
 *                 description: Review comment
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input data or review already exists
 *       404:
 *         description: Dine-in session not found
 */
router.post(
  '/',
  validateRequest([
    check('dineInSessionId').notEmpty().withMessage('Dine-in session ID is required'),
    check('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    check('comment').notEmpty().withMessage('Comment is required')
  ]),
  reviewController.createReview as RequestHandler
);

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
router.get('/session/:dineInSessionId',
  reviewController.getReviewsByDineInSession as RequestHandler
);

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
router.get('/outlet/:outletId',
  reviewController.getReviewsByOutlet as RequestHandler
);

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
 *       400:
 *         description: Invalid outlet ID
 *       404:
 *         description: Outlet not found
 */
router.get('/public/outlet/:outletId',
  reviewController.getPublicOutletReviews as RequestHandler
);

/**
 * @swagger
 * /api/reviews/user:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews by user
 *     description: Retrieve all reviews created by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user reviews
 *       401:
 *         description: Unauthorized
 */
router.get('/user',
  authenticate,
  userAuth,
  reviewController.getReviewsByUser as RequestHandler
);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update a review
 *     description: Update an existing review by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
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
 *                 description: Updated rating
 *               comment:
 *                 type: string
 *                 description: Updated comment
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
router.put('/:id',
  authenticate,
  userAuth,
  validateRequest([
    check('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    check('comment').optional().notEmpty().withMessage('Comment cannot be empty')
  ]),
  reviewController.updateReview as RequestHandler
);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review
 *     description: Delete a review by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 */
router.delete('/:id',
  authenticate,
  reviewController.deleteReview as RequestHandler
);

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
router.get('/all', reviewController.getAllReviewsPaginated as RequestHandler);

export default router; 