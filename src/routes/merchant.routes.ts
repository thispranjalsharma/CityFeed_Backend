import express from 'express';
import { MerchantController } from '../controllers/merchant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import path from 'path';
const multer = require('multer');

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
 *         multipart/form-data:
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
 *                 description: Type of food served by the merchant
 *                 example: "both"
 *               address:
 *                 type: string
 *                 description: Business address
 *                 example: "123 Main St"
 *               location:
 *                 type: string
 *                 description: Business location coordinates in GeoJSON format
 *                 example: '{"type":"Point","coordinates":[0,0]}'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Business images (max 5 images, 5MB each)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/profile',
  authenticate,
  upload.array('images', 5),
  validateRequest([
    body('name').optional().isString(),
    body('phone').optional().isString(),
    body('businessName').optional().isString(),
    body('businessType').optional().isIn(['cafe', 'restaurant']),
    body('businessDescription').optional().isString(),
    body('category').optional().isIn(['veg', 'non-veg', 'both']),
    body('address').optional().isString(),
    body('location').optional().isString()
  ]),
  merchantController.updateProfile
);

/**
 * @swagger
 * /api/merchants/users/phone/{phone}:
 *   get:
 *     tags: [Merchants]
 *     summary: Get user details by phone number
 *     description: |
 *       Get user details using their phone number.
 *       This endpoint is only accessible to authenticated merchants.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: User's phone number
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Unauthorized - Not authenticated as a merchant
 *       403:
 *         description: Forbidden - Not authorized to access user details
 *       404:
 *         description: User not found
 */
router.get('/users/phone/:phone', authenticate, merchantController.getUserByPhone);

export default router;
