import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { OfferController } from '../controllers/offer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { check, body } from 'express-validator';
import { requireResponsibility } from '../middleware/requireResponsibility.middleware';
import { Offer } from '../models/offer.model';

const router = Router();
const offerController = new OfferController();

/*
  ===================== EMPLOYEE RESPONSIBILITY PATTERN =====================
  For any offer-related action (create, update, delete, etc.):
    - Use requireResponsibility('responsibility_name') for the action.
    - For actions on a specific offer (update, delete), use injectOutletIdFromOffer before requireResponsibility.
    - Assign the correct responsibilities to employees in the responsibilities array.
  Example:
    router.put('/:id', authenticate, injectOutletIdFromOffer, requireResponsibility('update_offer'), ...)
    router.delete('/:id', authenticate, injectOutletIdFromOffer, requireResponsibility('delete_offer'), ...)
    router.post('/', authenticate, requireResponsibility('create_offer'), ...)
  TODO: For other resources (orders, feedback, etc.), create a similar inject middleware and use requireResponsibility for all protected actions.
  ===========================================================================
*/

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
 *         outletId:
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
 *     summary: Get all offers (optionally filter by outlet, status, or date)
 *     tags: [Offers]
 *     parameters:
 *       - in: query
 *         name: outletId
 *         schema:
 *           type: string
 *         description: Filter by outlet ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by offer status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter offers valid on a specific date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of offers
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
 *                     $ref: '#/components/schemas/Offer'
 */
router.get('/', offerController.getAllOffers as RequestHandler);

/**
 * @swagger
 * /api/offers/valid-today:
 *   get:
 *     summary: Get offers valid today
 *     tags: [Offers]
 *     responses:
 *       200:
 *         description: List of offers valid today
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
 *                       outletId:
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
 *                     outletId:
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
 * /api/offers/outlet/{outletId}:
 *   get:
 *     summary: Get offers by outlet
 *     tags: [Offers]
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *         example: "60d21b4667d0d8992e610c86"
 *     responses:
 *       200:
 *         description: List of outlet's offers
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
 *                       outletId:
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
router.get('/outlet/:outletId', offerController.getOffersByOutlet as RequestHandler);

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
 *                     outletId:
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
  injectOutletIdFromOffer,
  requireResponsibility('update_offer'),
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

// Middleware to inject outletId from offer for delete route
async function injectOutletIdFromOffer(req, res, next) {
  try {
    const offerId = req.params.id;
    if (!offerId) return res.status(400).json({ message: 'Offer ID is required' });
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    req.body.outletId = offer.outletId;
    next();
  } catch (error) {
    next(error);
  }
}

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
  injectOutletIdFromOffer,
  requireResponsibility('delete_offer'),
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
 *     tags: [Offers]
 *     summary: Create a new offer
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
 *               - outletId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               discountPercentage:
 *                 type: number
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               outletId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Offer created successfully
 *       400:
 *         description: Invalid input data
 */
router.post(
  '/',
  authenticate,
  requireResponsibility('create_offer'),
  validateRequest([
    body('title').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('discountPercentage').isNumeric(),
    body('validFrom').isISO8601(),
    body('validTo').isISO8601(),
    body('outletId').isString().notEmpty()
  ]),
  validateOfferDates,
  offerController.createOffer as RequestHandler
);

export default router; 