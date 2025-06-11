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
 *     tags: [Merchant]
 *     summary: Register a new merchant
 *     description: Register a new merchant with business details
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - phone
 *               - businessName
 *               - businessType
 *               - businessDescription
 *               - address
 *               - location
 *               - images
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Merchant's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Merchant's password
 *               name:
 *                 type: string
 *                 description: Merchant's full name
 *               phone:
 *                 type: string
 *                 description: Merchant's phone number
 *               businessName:
 *                 type: string
 *                 description: Name of the business
 *               businessType:
 *                 type: string
 *                 description: Type of business
 *               businessDescription:
 *                 type: string
 *                 description: Description of the business
 *               address:
 *                 type: string
 *                 description: Business address
 *               location:
 *                 type: string
 *                 description: Business location coordinates
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Business images (max 5 images, 5MB each)
 *     responses:
 *       201:
 *         description: Merchant registered successfully
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
 *                     merchant:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         businessName:
 *                           type: string
 *                         businessType:
 *                           type: string
 *                         businessDescription:
 *                           type: string
 *                         address:
 *                           type: string
 *                         location:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                         role:
 *                           type: string
 *                         isApproved:
 *                           type: boolean
 *                         isEmailVerified:
 *                           type: boolean
 *                     token:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: Merchant registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */
router.post('/register', upload.array('images', 5), merchantController.registerMerchant);

export default router;
