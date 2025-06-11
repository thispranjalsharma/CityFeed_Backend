import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../interfaces/auth.interface';
import { UserRepository } from '../repositories/user.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { TokenService } from '../services/token.service';
// import { IUserDocument } from '../interfaces/user.interface';
import { IMerchantDocument } from '../interfaces/merchant.interface';
import path from 'path';
import fs from 'fs';
import https from 'https';
import cloudinary from '../config/cloudinary';
import { AppErrorClass } from '../middleware/error.middleware';
import { v2 as cloudinaryV2 } from 'cloudinary';
import { config } from '../config/config';

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - phone
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *         phone:
 *           type: string
 *           description: User's phone number
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         otp:
 *           type: string
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *         - newPassword
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         otp:
 *           type: string
 *         newPassword:
 *           type: string
 *           format: password
 */

interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export class AuthController extends BaseController {
  private authService: AuthService;
  private userRepository: UserRepository;
  private merchantRepository: MerchantRepository;
  private tokenService: TokenService;

  constructor() {
    super();
    this.authService = new AuthService();
    this.userRepository = new UserRepository();
    this.merchantRepository = new MerchantRepository();
    this.tokenService = new TokenService();

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret
    });
  }

  private async downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const writer = fs.createWriteStream(filepath);
        response.pipe(writer);

        writer.on('finish', () => resolve());
        writer.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Invalid input data
   *       409:
   *         description: User already exists
   */
  registerUser = async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, name, dob, gender, phone, membershipType } = req.body;
      const result = await this.authService.registerUser({
        email,
        password,
        name,
        dob,
        gender,
        phone,
        membershipType
      });
      return this.sendSuccess(res, result, 'User registered successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/auth/register-merchant:
   *   post:
   *     summary: Register a new merchant
   *     tags: [Auth]
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
   *               - location
   *               - images
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
   *               address:
   *                 type: string
   *               location:
   *                 type: string
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: Merchant registered successfully
   *       400:
   *         description: Invalid input data
   */
  registerMerchant = async (req: MulterRequest, res: Response) => {
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
      if (req.files && 'images' in req.files) {
        const files = req.files['images'];
        if (Array.isArray(files) && files.length > 0) {
          // Upload each image to Cloudinary
          const uploadPromises = files.map(async (file) => {
            try {
              // Convert buffer to base64
              const b64 = Buffer.from(file.buffer).toString('base64');
              const dataURI = `data:${file.mimetype};base64,${b64}`;
              
              // Upload to Cloudinary
              const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload(dataURI, {
                  folder: 'merchants',
                  resource_type: 'auto'
                }, (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                });
              });

              return (result as any).secure_url;
            } catch (error) {
              console.error('Error uploading image:', error);
              throw new AppErrorClass('Failed to upload image', 500);
            }
          });

          imageUrls = await Promise.all(uploadPromises);
        }
      }

      // Register merchant with uploaded image URLs
      const result = await this.authService.registerMerchant({
        email,
        password,
        name,
        phone,
        businessName,
        businessType,
        businessDescription,
        address,
        location,
        images: imageUrls
      });

      return this.sendSuccess(res, result, 'Merchant registered successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  login = async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, role } = req.body;
      const result = await this.authService.login(email, password, role);
      return this.sendSuccess(res, result, 'Login successful');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  verifyEmail = async (req: AuthRequest, res: Response) => {
    try {
      const { token } = req.params;
      const { role } = req.body;
      const result = await this.authService.verifyEmail(token, role);
      return this.sendSuccess(res, result, 'Email verified successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ForgotPasswordRequest'
   *     responses:
   *       200:
   *         description: Password reset OTP sent
   *       404:
   *         description: User not found
   */
  forgotPassword = async (req: AuthRequest, res: Response) => {
    try {
      const { email, role } = req.body;
      const result = await this.authService.forgotPassword(email, role);
      return this.sendSuccess(res, result, 'Password reset OTP sent');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Reset password
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ResetPasswordRequest'
   *     responses:
   *       200:
   *         description: Password reset successful
   *       400:
   *         description: Invalid OTP or password
   */
  resetPassword = async (req: AuthRequest, res: Response) => {
    try {
      const { token } = req.params;
      const { password, role } = req.body;
      const result = await this.authService.resetPassword(token, password, role);
      return this.sendSuccess(res, result, 'Password reset successful');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!req.user) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      if (req.user.type === 'user') {
        const user = await this.userRepository.findById(req.user._id);
        if (!user) {
          return this.sendError(res, 'User not found', 404);
        }
        const updatedUser = await this.authService.changeUserPassword(
          user._id.toString(),
          currentPassword,
          newPassword
        );
        return this.sendSuccess(res, {
          user: {
            _id: updatedUser._id,
            email: updatedUser.email,
            name: updatedUser.name,
            phone: updatedUser.phone,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            isEmailVerified: updatedUser.isEmailVerified
          }
        }, 'Password changed successfully');
      } else if (req.user.type === 'merchant') {
        const merchant = await this.merchantRepository.findById(req.user._id);
        if (!merchant) {
          return this.sendError(res, 'Merchant not found', 404);
        }
        const updatedMerchant = await this.authService.changeMerchantPassword(
          merchant._id.toString(),
          currentPassword,
          newPassword
        ) as IMerchantDocument;
        return this.sendSuccess(res, {
          merchant: {
            _id: updatedMerchant._id,
            email: updatedMerchant.email,
            name: updatedMerchant.name,
            phone: updatedMerchant.phone,
            businessName: updatedMerchant.businessName,
            businessType: updatedMerchant.businessType,
            address: updatedMerchant.address,
            role: updatedMerchant.role,
            isApproved: updatedMerchant.isApproved,
            isEmailVerified: updatedMerchant.isEmailVerified
          }
        }, 'Password changed successfully');
      }

      return this.sendError(res, 'Invalid user type');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  logout = async (req: AuthRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string') {
        return this.sendError(res, 'No token provided', 401);
      }
      const token = authHeader.split(' ')[1];
      await this.authService.logout(token);
      return this.sendSuccess(res, null, 'Logout successful');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  public updateMerchant = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const merchantId = req.user?._id;
      if (!merchantId) {
        this.sendError(res, 'Merchant ID not found', 401);
        return;
      }

      const updateData = req.body;
      const updatedMerchant = await this.merchantRepository.update(merchantId.toString(), updateData);

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
} 