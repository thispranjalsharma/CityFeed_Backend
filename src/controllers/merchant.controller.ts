import { Response, Request, NextFunction } from 'express';
import { BaseController } from './base.controller';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AuthRequest } from '../interfaces/auth.interface';
import { MerchantService } from '../services/merchant.service';
import { AppErrorClass } from '../middleware/error.middleware';
import cloudinary from '../config/cloudinary';

export class MerchantController extends BaseController {
  private merchantRepository: MerchantRepository;
  private merchantService: MerchantService;

  constructor() {
    super();
    this.merchantRepository = new MerchantRepository();
    this.merchantService = new MerchantService();
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
  public getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?._id;
      if (!merchantId) {
        this.sendError(res, 'Merchant ID not found', 401);
        return;
      }

      const merchant = await this.merchantService.getMerchantById(merchantId.toString());
      if (!merchant) {
        this.sendError(res, 'Merchant not found', 404);
        return;
      }

      this.sendSuccess(res, {
        _id: merchant._id,
        email: merchant.email,
        name: merchant.name,
        phone: merchant.phone,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        address: merchant.address,
        location: merchant.location,
        images: merchant.images,
        role: merchant.role,
        isApproved: merchant.isApproved,
        isEmailVerified: merchant.isEmailVerified
      });
    } catch (error) {
      this.handleError(res, error as Error);
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
  public updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?._id;
      if (!merchantId) {
        this.sendError(res, 'Merchant ID not found', 401);
        return;
      }

      const updateData = req.body;
      const updatedMerchant = await this.merchantService.updateMerchant(merchantId.toString(), updateData);

      this.sendSuccess(res, {
        _id: updatedMerchant._id,
        email: updatedMerchant.email,
        name: updatedMerchant.name,
        phone: updatedMerchant.phone,
        businessName: updatedMerchant.businessName,
        businessType: updatedMerchant.businessType,
        address: updatedMerchant.address,
        location: updatedMerchant.location,
        images: updatedMerchant.images,
        role: updatedMerchant.role,
        isApproved: updatedMerchant.isApproved,
        isEmailVerified: updatedMerchant.isEmailVerified
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public registerMerchant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, phone, businessName, businessType, address, location, images } = req.body;

      // Upload image to Cloudinary
      let cloudinaryImages: string[] = [];
      if (images && images.length > 0) {
        try {
          // Upload each image to Cloudinary
          for (const imageUrl of images) {
            const result = await cloudinary.uploader.upload(imageUrl, {
              folder: 'merchants',
              resource_type: 'auto'
            });
            cloudinaryImages.push(result.secure_url);
          }
        } catch (error) {
          throw new AppErrorClass('Failed to upload image to Cloudinary', 400);
        }
      }

      const merchantData = {
        email,
        password,
        name,
        phone,
        businessName,
        businessType,
        address,
        location: location || { type: 'Point', coordinates: [0, 0] },
        images: cloudinaryImages,
        isApproved: false,
        isEmailVerified: false,
        role: 'merchant'
      };

      const merchant = await this.merchantService.registerMerchant(merchantData);
      res.status(201).json({
        status: 'success',
        data: merchant
      });
    } catch (error) {
      next(error);
    }
  };
} 