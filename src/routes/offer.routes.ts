import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { OfferController } from '../controllers/offer.controller';
import { authenticate, merchantAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { check, body } from 'express-validator';
import upload from '../middleware/upload.middleware';

const router = Router();
const offerController = new OfferController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Offer:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60d21b4667d0d8992e610c85"
 *         merchantId:
 *           type: string
 *           example: "60d21b4667d0d8992e610c86"
 *         title:
 *           type: string
 *           example: "Summer Special"
 *         description:
 *           type: string
 *           example: "Get 20% off on all items"
 *         discountPercentage:
 *           type: number
 *           example: 20
 *         validFrom:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T00:00:00.000Z"
 *         validTo:
 *           type: string
 *           format: date-time
 *           example: "2024-08-31T23:59:59.999Z"
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-15T10:30:00.000Z"
 */

/**
 * @swagger
 * tags:
 *   name: Offers
 *   description: Offer management endpoints
 */

/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: Get all active offers
 *     tags: [Offers]
 *     responses:
 *       200:
 *         description: List of active offers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d21b4667d0d8992e610c85"
 *                       merchantId:
 *                         type: string
 *                         example: "60d21b4667d0d8992e610c86"
 *                       title:
 *                         type: string
 *                         example: "Summer Special"
 *                       description:
 *                         type: string
 *                         example: "Get 20% off on all items"
 *                       discountPercentage:
 *                         type: number
 *                         example: 20
 *                       validFrom:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-06-01T00:00:00.000Z"
 *                       validTo:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-08-31T23:59:59.999Z"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-03-15T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-03-15T10:30:00.000Z"
 */
router.get('/', offerController.getActiveOffers as RequestHandler);

/**
 * @swagger
 * /api/offers/{id}:
 *   get:
 *     summary: Get offer by ID
 *     tags: [Offers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "60d21b4667d0d8992e610c85"
 *     responses:
 *       200:
 *         description: Offer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c85"
 *                     merchantId:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c86"
 *                     title:
 *                       type: string
 *                       example: "Summer Special"
 *                     description:
 *                       type: string
 *                       example: "Get 20% off on all items"
 *                     discountPercentage:
 *                       type: number
 *                       example: 20
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-06-01T00:00:00.000Z"
 *                     validTo:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-08-31T23:59:59.999Z"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-03-15T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-03-15T10:30:00.000Z"
 *       404:
 *         description: Offer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Offer not found"
 */
router.get('/:id', offerController.getOfferById as RequestHandler);

/**
 * @swagger
 * /api/offers/merchant/{merchantId}:
 *   get:
 *     summary: Get offers by merchant
 *     tags: [Offers]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         example: "60d21b4667d0d8992e610c86"
 *     responses:
 *       200:
 *         description: List of merchant's offers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d21b4667d0d8992e610c85"
 *                       merchantId:
 *                         type: string
 *                         example: "60d21b4667d0d8992e610c86"
 *                       title:
 *                         type: string
 *                         example: "Summer Special"
 *                       description:
 *                         type: string
 *                         example: "Get 20% off on all items"
 *                       discountPercentage:
 *                         type: number
 *                         example: 20
 *                       validFrom:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-06-01T00:00:00.000Z"
 *                       validTo:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-08-31T23:59:59.999Z"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-03-15T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-03-15T10:30:00.000Z"
 */
router.get('/merchant/:merchantId', offerController.getOffersByMerchant as RequestHandler);

/**
 * @swagger
 * /api/offers/{id}:
 *   put:
 *     summary: Update an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "60d21b4667d0d8992e610c85"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Summer Special 2024"
 *               description:
 *                 type: string
 *                 example: "Get 25% off on all items"
 *               discountPercentage:
 *                 type: number
 *                 example: 25
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-01T00:00:00.000Z"
 *               validTo:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-08-31T23:59:59.999Z"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Offer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c85"
 *                     merchantId:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c86"
 *                     title:
 *                       type: string
 *                       example: "Summer Special 2024"
 *                     description:
 *                       type: string
 *                       example: "Get 25% off on all items"
 *                     discountPercentage:
 *                       type: number
 *                       example: 25
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-06-01T00:00:00.000Z"
 *                     validTo:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-08-31T23:59:59.999Z"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-03-15T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-03-15T10:30:00.000Z"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "No token provided"
 *       403:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Not authorized to update this offer"
 *       404:
 *         description: Offer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Offer not found"
 */
router.put('/:id',
  authenticate,
  merchantAuth,
  validateRequest([
    check('title').optional().isString(),
    check('description').optional().isString(),
    check('discountPercentage').optional().isNumeric(),
    check('validFrom').optional().isISO8601(),
    check('validTo').optional().isISO8601(),
    check('isActive').optional().isBoolean()
  ]),
  offerController.updateOffer as RequestHandler
);

/**
 * @swagger
 * /api/offers/{id}:
 *   delete:
 *     summary: Delete an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "60d21b4667d0d8992e610c85"
 *     responses:
 *       200:
 *         description: Offer deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Offer deleted successfully"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "No token provided"
 *       403:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Not authorized to delete this offer"
 *       404:
 *         description: Offer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Offer not found"
 */
router.delete('/:id',
  authenticate,
  merchantAuth,
  offerController.deleteOffer as RequestHandler
);

const validateOfferDates: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const { validFrom, validTo } = req.body;
  
  if (new Date(validFrom) < new Date()) {
    res.status(400).json({
      success: false,
      error: 'Valid from date must be in the future'
    });
    return;
  }

  if (new Date(validTo) <= new Date(validFrom)) {
    res.status(400).json({
      success: false,
      error: 'Valid to date must be after valid from date'
    });
    return;
  }

  next();
};

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Create a new offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - discountPercentage
 *               - validFrom
 *               - validTo
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Summer Special"
 *               description:
 *                 type: string
 *                 example: "Get 20% off on all items"
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 20
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-01T00:00:00.000Z"
 *               validTo:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-08-31T23:59:59.999Z"
 *     responses:
 *       201:
 *         description: Offer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c85"
 *                     merchantId:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c86"
 *                     title:
 *                       type: string
 *                       example: "Summer Special"
 *                     description:
 *                       type: string
 *                       example: "Get 20% off on all items"
 *                     discountPercentage:
 *                       type: number
 *                       example: 20
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-06-01T00:00:00.000Z"
 *                     validTo:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-08-31T23:59:59.999Z"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-03-15T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-03-15T10:30:00.000Z"
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid request body"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 */
router.post(
  '/',
  authenticate,
  merchantAuth,
  validateRequest([
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('discountPercentage')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Discount percentage must be between 0 and 100'),
    body('validFrom').isISO8601().withMessage('Valid from date must be a valid date'),
    body('validTo').isISO8601().withMessage('Valid to date must be a valid date')
  ]),
  validateOfferDates,
  offerController.createOffer as RequestHandler
);

export default router; 