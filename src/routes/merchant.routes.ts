import express from 'express';
import { MerchantController } from '../controllers/merchant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
const multer = require('multer');
import path from 'path';

const router = express.Router();
const merchantController = new MerchantController();

// Configure multer for memory storage (no local file saving)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 description: Merchant's phone number
 *                 example: "+1234567890"
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *                 example: "My Restaurant"
 *               businessType:
 *                 type: string
 *                 enum: [cafe, restaurant]
 *                 description: Type of business
 *                 example: "restaurant"
 *               businessDescription:
 *                 type: string
 *                 description: Description of the business
 *                 example: "A great place to eat"
 *               category:
 *                 type: string
 *                 enum: [veg, non-veg, both]
 *                 description: Type of food served by the merchant (required, no default value)
 *                 example: ""
 *               address:
 *                 type: string
 *                 description: Business address
 *                 example: "123 Main St"
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
 *                 example: {"type": "Point", "coordinates": [0, 0]}
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 7
 *                 description: Business images (1-7 images)
 *                 example: []
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
    body('businessDescription').optional().isString(),
    body('category').optional().isIn(['veg', 'non-veg', 'both']),
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

export default router;
