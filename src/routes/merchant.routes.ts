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
 * /api/merchants:
 *   get:
 *     summary: Get all merchants
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of merchants
 */
router.get('/profile', authenticate, merchantController.getProfile);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     businessName:
 *                       type: string
 *                     businessType:
 *                       type: string
 *                     businessDescription:
 *                       type: string
 *                     category:
 *                       type: string
 *                     address:
 *                       type: string
 *                     location:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                     defaultMaxDiscount:
 *                       type: number
 *                     isApproved:
 *                       type: boolean
 *                     isEmailVerified:
 *                       type: boolean
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
