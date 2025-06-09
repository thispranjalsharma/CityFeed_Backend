import { Response } from 'express';
import { BaseController } from './base.controller';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AuthRequest } from '../interfaces/auth.interface';

export class MerchantController extends BaseController {
  private merchantRepository: MerchantRepository;

  constructor() {
    super();
    this.merchantRepository = new MerchantRepository();
  }

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
  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, 'Merchant not authenticated', 401);
      }

      const merchantProfile = await this.merchantRepository.findById(req.user._id);
      if (!merchantProfile) {
        return this.sendError(res, 'Merchant not found', 404);
      }
      return this.sendSuccess(res, merchantProfile);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

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
   *               phone:
   *                 type: string
   *               businessName:
   *                 type: string
   *               businessType:
   *                 type: string
   *               address:
   *                 type: string
   *               location:
   *                 type: object
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *       401:
   *         description: Unauthorized
   */
  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return this.sendError(res, 'Merchant not authenticated', 401);
      }

      const merchantProfile = await this.merchantRepository.findById(req.user._id);
      if (!merchantProfile) {
        return this.sendError(res, 'Merchant not found', 404);
      }

      // Only allow updating specific fields
      const allowedFields = ['name', 'phone', 'businessName', 'businessType', 'address', 'location', 'images'];
      const updateData = Object.keys(req.body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {} as Record<string, any>);

      const updatedMerchant = await this.merchantRepository.update(req.user._id, updateData);
      if (!updatedMerchant) {
        return this.sendError(res, 'Failed to update profile', 500);
      }

      const response = {
        merchant: {
          _id: updatedMerchant._id,
          name: updatedMerchant.name,
          email: updatedMerchant.email,
          phone: updatedMerchant.phone,
          businessName: updatedMerchant.businessName,
          businessType: updatedMerchant.businessType,
          address: updatedMerchant.address,
          location: updatedMerchant.location,
          images: updatedMerchant.images,
          role: updatedMerchant.role,
          isActive: updatedMerchant.isActive,
          isApproved: updatedMerchant.isApproved,
          isEmailVerified: updatedMerchant.isEmailVerified
        }
      };

      return this.sendSuccess(res, response, 'Profile updated successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };
} 