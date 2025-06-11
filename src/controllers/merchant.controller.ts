import { Response, Request, NextFunction } from 'express';
import { BaseController } from './base.controller';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AuthRequest } from '../interfaces/auth.interface';
import { MerchantService } from '../services/merchant.service';
import { AppErrorClass } from '../middleware/error.middleware';
import cloudinary from '../config/cloudinary';
import jwt from 'jsonwebtoken';
import { v2 as cloudinaryV2 } from 'cloudinary';

interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

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
        businessDescription: merchant.businessDescription,
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
        businessDescription: updatedMerchant.businessDescription,
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

  public registerMerchant = async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      const {
        email,
        password,
        name,
        phone,
        businessName,
        businessType,
        businessDescription,
        address,
        location
      } = req.body;

      // Validate required fields
      if (!email || !password || !name || !phone || !businessName || !businessType || !businessDescription || !address || !location) {
        throw new AppErrorClass('All fields are required', 400);
      }

      // Handle image uploads
      let imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        // Upload each image to Cloudinary
        const uploadPromises = req.files.map(async (file) => {
          // Convert buffer to base64
          const b64 = Buffer.from(file.buffer).toString('base64');
          const dataURI = `data:${file.mimetype};base64,${b64}`;
          
          // Upload to Cloudinary
          const result = await cloudinaryV2.uploader.upload(dataURI, {
            folder: 'merchants',
            resource_type: 'auto'
          });
          
          return result.secure_url;
        });

        // Wait for all uploads to complete
        imageUrls = await Promise.all(uploadPromises);
      }

      // Create merchant data object
      const merchantData = {
        email,
        password,
        name,
        phone,
        businessName,
        businessType,
        businessDescription,
        address,
        location,
        images: imageUrls,
        role: 'merchant',
        isApproved: false,
        isEmailVerified: false
      };

      // Create merchant
      const merchant = await this.merchantService.createMerchant(merchantData);

      // Generate JWT token
      const token = jwt.sign(
        { 
          _id: merchant._id,
          email: merchant.email,
          role: merchant.role,
          type: 'merchant'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Send success response
      res.status(201).json({
        success: true,
        data: {
          merchant,
          token
        },
        message: 'Merchant registered successfully'
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
} 