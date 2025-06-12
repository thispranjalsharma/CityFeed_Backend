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
        category: merchant.category,
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
   *                 example: "John Doe"
   *               phone:
   *                 type: string
   *                 example: "+1234567890"
   *               businessName:
   *                 type: string
   *                 example: "My Restaurant"
   *               businessType:
   *                 type: string
   *                 enum: [cafe, restaurant]
   *                 example: "restaurant"
   *                 description: Type of business
   *               businessDescription:
   *                 type: string
   *                 example: "A great place to eat"
   *                 description: Description of the business
   *               category:
   *                 type: string
   *                 enum: [veg, non-veg, both]
   *                 example: ""
   *                 description: Type of food served by the merchant (required, no default value)
   *               address:
   *                 type: string
   *                 example: "123 Main St"
   *               location:
   *                 type: object
   *                 properties:
   *                   type:
   *                     type: string
   *                     enum: [Point]
   *                     default: Point
   *                   coordinates:
   *                     type: array
   *                     items:
   *                       type: number
   *                     minItems: 2
   *                     maxItems: 2
   *                     description: [longitude, latitude]
   *                     example: [0, 0]
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: []
   *     responses:
   *       200:
   *         description: Profile updated successfully
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
   *                       example: "507f1f77bcf86cd799439011"
   *                     email:
   *                       type: string
   *                       example: "merchant@example.com"
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     phone:
   *                       type: string
   *                       example: "+1234567890"
   *                     businessName:
   *                       type: string
   *                       example: "My Restaurant"
   *                     businessType:
   *                       type: string
   *                       example: "restaurant"
   *                     businessDescription:
   *                       type: string
   *                       example: "A great place to eat"
   *                     category:
   *                       type: string
   *                       enum: [veg, non-veg, both]
   *                       example: ""
   *                       description: Type of food served by the merchant (required, no default value)
   *                     address:
   *                       type: string
   *                       example: "123 Main St"
   *                     location:
   *                       type: object
   *                       properties:
   *                         type:
   *                           type: string
   *                           example: "Point"
   *                         coordinates:
   *                           type: array
   *                           items:
   *                             type: number
   *                           example: [0, 0]
   *                     images:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: []
   *                     role:
   *                       type: string
   *                       example: "merchant"
   *                     isApproved:
   *                       type: boolean
   *                       example: false
   *                     isEmailVerified:
   *                       type: boolean
   *                       example: false
   *                 message:
   *                   type: string
   *                   example: "Profile updated successfully"
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
        category: updatedMerchant.category,
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

  /**
   * @swagger
   * /api/merchants/register:
   *   post:
   *     tags: [Merchants]
   *     summary: Register a new merchant
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
   *               - category
   *               - address
   *               - location
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 format: password
   *               name:
   *                 type: string
   *               phone:
   *                 type: string
   *               businessName:
   *                 type: string
   *               businessType:
   *                 type: string
   *                 enum: [cafe, restaurant, bar, shop, service, other]
   *               businessDescription:
   *                 type: string
   *               category:
   *                 type: string
   *                 enum: [veg, non-veg, both]
   *                 description: Type of food served by the merchant
   *                 example: both
   *               address:
   *                 type: string
   *               location:
   *                 type: object
   *                 properties:
   *                   type:
   *                     type: string
   *                     enum: [Point]
   *                     default: Point
   *                   coordinates:
   *                     type: array
   *                     items:
   *                       type: number
   *                     minItems: 2
   *                     maxItems: 2
   *                     description: [longitude, latitude]
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       201:
   *         description: Merchant registered successfully
   *       400:
   *         description: Invalid input data
   *       409:
   *         description: Email already exists
   */
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
        category,
        address,
        location
      } = req.body;

      // Validate required fields
      if (!email || !password || !name || !phone || !businessName || !businessType || !businessDescription || !category || !address || !location) {
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
        category,
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