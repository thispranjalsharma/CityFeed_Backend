import { Router } from 'express';
import { MerchantController } from '../controllers/merchant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();
const merchantController = new MerchantController();

/**
 * @swagger
 * tags:
 *   name: Merchants
 *   description: Merchant management endpoints
 */

/**
 * @swagger
 * /api/merchants/profile:
 *   get:
 *     tags: [Merchants]
 *     summary: Get merchant profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Merchant profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, merchantController.getProfile);

/**
 * @swagger
 * /api/merchants/profile:
 *   put:
 *     tags: [Merchants]
 *     summary: Update merchant profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Merchant's name
 *               phone:
 *                 type: string
 *                 description: Merchant's phone number
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *               businessType:
 *                 type: string
 *                 enum: [cafe, restaurant]
 *                 description: Type of business
 *               address:
 *                 type: string
 *                 description: Business address
 *               location:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [Point]
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     minItems: 2
 *                     maxItems: 2
 *                 description: Business location coordinates
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 7
 *                 description: Business images (1-7 images)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/profile',
  authenticate,
  validateRequest([
    body('name').optional().isString(),
    body('phone').optional().isString(),
    body('businessName').optional().isString(),
    body('businessType').optional().isIn(['cafe', 'restaurant']),
    body('address').optional().isString(),
    body('location').optional().isObject(),
    body('location.type').optional().equals('Point'),
    body('location.coordinates').optional().isArray(),
    body('location.coordinates.*').optional().isNumeric(),
    body('images').optional().isArray(),
    body('images.*').optional().isString()
  ]),
  merchantController.updateProfile
);

/**
 * @swagger
 * /api/merchants/register:
 *   post:
 *     tags: [Merchants]
 *     summary: Register a new merchant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - phone
 *               - businessName
 *               - businessType
 *               - address
 *               - images
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               businessName:
 *                 type: string
 *               businessType:
 *                 type: string
 *                 enum: [cafe, restaurant, bar, shop, service, other]
 *               address:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [Point]
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     minItems: 2
 *                     maxItems: 2
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs to be uploaded to Cloudinary
 *     responses:
 *       201:
 *         description: Merchant registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post(
  '/register',
  validateRequest([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('businessName').notEmpty().withMessage('Business name is required'),
    body('businessType').isIn(['cafe', 'restaurant', 'bar', 'shop', 'service', 'other']).withMessage('Invalid business type'),
    body('address').notEmpty().withMessage('Address is required'),
    body('images').isArray().withMessage('Images must be an array')
  ]),
  merchantController.registerMerchant
);

export default router;
