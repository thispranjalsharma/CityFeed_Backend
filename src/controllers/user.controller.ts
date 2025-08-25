import { Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';
import { AuthRequest, TokenPayload } from '../interfaces/auth.interface';
import { UserRepository } from '../repositories/user.repository';
import { PaymentService } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { OutletRepository } from '../repositories/outlet.repository';
import { EventRepository } from '../repositories/event.repository';
import { RewardService } from '../services/reward.service';
import { Staff } from '../models/staff.model';
import { User } from '../models/user.model';
import { logger } from '../utils/logger.util';
import { EmailService } from '../services/email.service';
import { Request } from 'express';
import { Ticket } from '../models/ticket.model';
import mongoose from 'mongoose';


/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *         dob:
 *           type: string
 *           format: date
 *           description: User's date of birth (YYYY-MM-DD)
 *           example: "1990-01-01"
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: User's gender
 *           example: "male"
 *     AddCoinsRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           description: Amount of coins to add
 *     DeductCoinsRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           description: Amount of coins to deduct
 */

export class UserController extends BaseController {
  private userRepository: UserRepository;
  private userService: UserService;
  private paymentService: PaymentService;
  private rewardService: RewardService;
  private emailService = new EmailService();

  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.rewardService = new RewardService();
    this.userService = new UserService();
    this.paymentService = new PaymentService(
      new PaymentRepository(),
      this.userRepository,
      new DineInSessionRepository(),
      new OutletRepository(),
      new EventRepository()
    );
  }

  /**
   * @swagger
   * /api/users/profile:
   *   get:
   *     tags: [Users]
   *     summary: Get user profile
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
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
   *                       example: "60d21b4667d0d8992e610c85"
   *                     email:
   *                       type: string
   *                       example: "user@example.com"
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     role:
   *                       type: string
   *                       example: "user"
   *                     type:
   *                       type: string
   *                       enum: [user]
   *                       example: "user"
   *                     isActive:
   *                       type: boolean
   *                       example: true
   *                     isEmailVerified:
   *                       type: boolean
   *                       example: true
   *                     isPhoneVerified:
   *                       type: boolean
   *                       example: false
   *       401:
   *         description: Unauthorized - No token provided
   *       404:
   *         description: User not found
   */
  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, 'User not found', 404);
      }

      const userProfile = await this.userRepository.findById(user._id);
      if (!userProfile) {
        return this.sendError(res, 'User profile not found', 404);
      }

      // Include referralCode and qrCodeUrl in the response
      const profileData = userProfile.toObject();
      profileData.referralCode = userProfile.referralCode;
      profileData.qrCodeUrl = userProfile.qrCodeUrl;
      this.sendSuccess(res, profileData);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/profile:
   *   put:
   *     tags: [Users]
   *     summary: Update user profile
   *     description: Update user's profile including name, email, date of birth, gender, phone number, address, and membership type. Email and phone number must be unique across all users.
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
   *                 description: User's full name
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address (must be unique)
   *                 example: "user@example.com"
   *               dob:
   *                 type: string
   *                 format: date
   *                 description: User's date of birth (YYYY-MM-DD)
   *                 example: "1990-01-01"
   *               gender:
   *                 type: string
   *                 enum: [male, female, other]
   *                 description: User's gender
   *                 example: "male"
   *               phone:
   *                 type: string
   *                 description: User's phone number (10 digits, must be unique)
   *                 example: "1234567890"
   *               address:
   *                 type: string
   *                 description: User's address
   *               membershipType:
   *                 type: string
   *                 enum: [cityfeed_select, cityfeed_edge, cityfeed_prime]
   *                 description: User's membership type
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
   *                 message:
   *                   type: string
   *                   example: "Profile updated successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                       example: "60d21b4667d0d8992e610c85"
   *                     name:
   *                       type: string
   *                       example: "John Doe"
   *                     dob:
   *                       type: string
   *                       format: date
   *                       example: "1990-01-01"
   *                     gender:
   *                       type: string
   *                       enum: [male, female, other]
   *                       example: "male"
   *                     address:
   *                       type: string
   *                       example: "123 Main St"
   *                     membershipType:
   *                       type: string
   *                       enum: [cityfeed_select, cityfeed_edge, cityfeed_prime]
   *                       example: "cityfeed_select"
   *       400:
   *         description: Bad request - Invalid update data
   *       401:
   *         description: Unauthorized - No token provided
   *       404:
   *         description: User not found
   */
  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, 'User not found', 404);
      }

      const { name, dob, gender, phone, address, membershipType, email } = req.body;
      
      // Validate gender if provided
      if (gender && !['male', 'female', 'other'].includes(gender)) {
        return this.sendError(res, 'Invalid gender value. Must be one of: male, female, other', 400);
      }

      // Validate membership type if provided
      if (membershipType && !['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'].includes(membershipType)) {
        return this.sendError(res, 'Invalid membership type. Must be one of: cityfeed_select, cityfeed_edge, cityfeed_prime', 400);
      }

      // Get current user data for comparison
      const currentUser = await this.userRepository.findById(user._id);
      if (!currentUser) {
        return this.sendError(res, 'User not found', 404);
      }

      // Validate and check email uniqueness if provided
      if (email) {
        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase();
        
        // Check if email is different from current user's email
        if (currentUser.email !== normalizedEmail) {
          // Check if email is already taken by another verified user
          const existingVerifiedUser = await this.userService.findVerifiedUserByEmail(normalizedEmail);
          if (existingVerifiedUser) {
            return this.sendError(res, 'Email address is already registered with a verified account', 400);
          }
        }
      }

      // Validate and check phone uniqueness if provided
      if (phone) {
        // Check if phone is different from current user's phone
        if (currentUser.phone !== phone) {
          // Check if phone is already taken by another user
          const existingUserWithPhone = await this.userRepository.findByPhone(phone);
          if (existingUserWithPhone) {
            return this.sendError(res, 'Phone number is already registered with another account', 400);
          }
        }
      }

      // Convert dob string to Date object if provided
      const updateData: any = { name, gender, phone, address, membershipType };
      
      // Add email to updateData if provided (normalized)
      if (email) {
        updateData.email = email.toLowerCase();
        
        // If user is updating to a new email, reset email verification status
        // because they need to verify the new email
        if (currentUser.email !== updateData.email) {
          updateData.isEmailVerified = false;
        }
      }
      if (dob) {
        try {
          updateData.dob = new Date(dob);
          if (isNaN(updateData.dob.getTime())) {
            return this.sendError(res, 'Invalid date of birth format', 400);
          }
        } catch (error) {
          return this.sendError(res, 'Invalid date of birth format', 400);
        }
      }

      // Remove undefined values from updateData
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Check if any QR-relevant fields are being updated
      const qrFields = ['name', 'email', 'phone', 'membershipType'];
      let shouldUpdateQR = false;
      for (const field of qrFields) {
        if (req.body[field]) {
          const newValue = field === 'email' ? req.body[field].toLowerCase() : req.body[field];
          if (newValue !== currentUser[field]) {
            shouldUpdateQR = true;
            break;
          }
        }
      }

      const updatedUser = await this.userRepository.update(user._id, updateData);
      if (!updatedUser) {
        return this.sendError(res, 'Failed to update profile', 400);
      }

      // If relevant fields changed, regenerate QR code
      if (shouldUpdateQR) {
        const QRCode = (await import('qrcode')).default;
        const cloudinary = (await import('../config/cloudinary')).default;
        const qrPayload =
          '==============================\n' +
          '  🪪 CityFeed Membership QR  🪪\n' +
          '==============================\n' +
          `Name: ${updatedUser.name}\n` +
          `Email: ${updatedUser.email}\n` +
          `Phone: ${updatedUser.phone}\n` +
          `Membership: ${updatedUser.membershipType}\n` +
          `Expiry: ${updatedUser.membershipExpiryDate ? updatedUser.membershipExpiryDate.toISOString().split('T')[0] : ''}\n` +
          '------------------------------\n' +
          'Show this QR code for membership verification.\n' +
          '==============================';
        const qrBuffer = await QRCode.toBuffer(qrPayload);
        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'user_qr' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(qrBuffer);
        });
        const qrCodeUrl = (uploadResult as any).secure_url;
        updatedUser.qrCodeUrl = qrCodeUrl;
        await updatedUser.save();
      }

      this.sendSuccess(res, updatedUser, 'Profile updated successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/profile:
   *   delete:
   *     tags: [Users]
   *     summary: Delete user profile
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Profile deleted successfully"
   *       401:
   *         description: Unauthorized - No token provided
   *       404:
   *         description: User not found
   */
  deleteProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, 'User not found', 404);
      }

      const deleted = await this.userRepository.delete(user._id);
      if (!deleted) {
        return this.sendError(res, 'User not found', 404);
      }

      this.sendSuccess(res, { message: 'Profile deleted successfully' });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/offers:
   *   get:
   *     summary: Get user's offers
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User's offers retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getUserOffers = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const offers = await this.userService.getUserOffers(userId);
      this.sendSuccess(res, offers);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/transactions:
   *   get:
   *     summary: Get user's transactions
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User's transactions retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getUserTransactions = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const transactions = await this.userService.getUserTransactions(userId);
      this.sendSuccess(res, transactions);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };


  /**
   * @swagger
   * /api/users/coins:
   *   get:
   *     summary: Get user's coin balance
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User's coin balance retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getUserCoins = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const coins = await this.userService.getUserCoins(userId);
      this.sendSuccess(res, { coins });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/coins/add:
   *   post:
   *     summary: Add coins to user's wallet
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AddCoinsRequest'
   *     responses:
   *       200:
   *         description: Coins added successfully
   *       400:
   *         description: Invalid amount
   *       401:
   *         description: Unauthorized
   */
  addCoins = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return this.sendError(res, 'Invalid amount', 400);
      }

      const result = await this.userService.addCoins(userId, amount);
      this.sendSuccess(res, result, 'Coins added successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/coins/deduct:
   *   post:
   *     summary: Deduct coins from user's wallet
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DeductCoinsRequest'
   *     responses:
   *       200:
   *         description: Coins deducted successfully
   *       400:
   *         description: Invalid amount or insufficient balance
   *       401:
   *         description: Unauthorized
   */
  deductCoins = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return this.sendError(res, 'Invalid amount', 400);
      }

      const result = await this.userService.deductCoins(userId, amount);
      this.sendSuccess(res, result, 'Coins deducted successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  initiateMembershipUpgrade = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { targetMembershipType } = req.body;

      // Get current user
      const user = await this.userService.findById(userId);
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Check if user is already at or above the target tier
      const membershipTiers = ['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'];
      const currentTierIndex = membershipTiers.indexOf(user.membershipType);
      const targetTierIndex = membershipTiers.indexOf(targetMembershipType);

      if (currentTierIndex >= targetTierIndex) {
        return this.sendError(res, 'Cannot upgrade to same or lower tier', 400);
      }

      // Calculate upgrade cost
      const upgradeCosts = {
        cityfeed_edge: 500, // ₹500 for cityfeed_edge
        cityfeed_prime: 1000   // ₹1000 for cityfeed_prime
      };

      const amount = upgradeCosts[targetMembershipType as keyof typeof upgradeCosts];

      // Create Razorpay order
      const order = await this.paymentService.createOrder(userId, amount, 'membership_purchase');

      // Create pending payment record
      await this.paymentService.createPayment({
        userId,
        amount,
        type: 'membership_purchase',
        paymentMethod: 'razorpay',
        razorpayOrderId: order.id,
        status: 'pending'
      });

      this.sendSuccess(res, {
        order,
        targetMembershipType,
        amount
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * Upgrade user membership
   */
  upgradeMembership = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { targetMembershipType, paymentMethod } = req.body;

      // Get current user
      const user = await this.userService.findById(userId);
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Check if user is already at or above the target tier
      const membershipTiers = ['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'] as const;
      const currentTierIndex = membershipTiers.indexOf(user.membershipType);
      const targetTierIndex = membershipTiers.indexOf(targetMembershipType as typeof membershipTiers[number]);

      if (currentTierIndex >= targetTierIndex) {
        return this.sendError(res, 'Cannot upgrade to same or lower tier', 400);
      }

      // Define membership prices
      const membershipPrices = {
        cityfeed_select: 499,
        cityfeed_edge: 999,
        cityfeed_prime: 1499
      } as const;

      // Calculate upgrade cost
      const amount = membershipPrices[targetMembershipType as keyof typeof membershipPrices];

      if (paymentMethod === 'wallet') {
        // Check if user has enough coins
        if (user.coins < amount) {
          return this.sendError(res, 'Insufficient coins in wallet', 400);
        }

        // Create payment record
        await this.paymentService.createPayment({
          userId,
          amount,
          type: 'membership_purchase',
          paymentMethod: 'wallet',
          status: 'completed'
        });

        // Deduct coins from user's wallet
        await this.userService.update(userId, { coins: user.coins - amount });

        // Update membership type and expiry date
        const membershipExpiryDate = new Date();
        membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

        await this.userService.update(userId, {
          membershipType: targetMembershipType as typeof membershipTiers[number],
          membershipExpiryDate
        });

        return this.sendSuccess(res, {
          message: 'Membership upgraded successfully',
          newMembershipType: targetMembershipType,
          expiryDate: membershipExpiryDate
        });
      } else {
        // Handle Razorpay payment
        const order = await this.paymentService.createOrder(userId, amount, 'membership_purchase');

        // Create pending payment record
        await this.paymentService.createPayment({
          userId,
          amount,
          type: 'membership_purchase',
          paymentMethod: 'razorpay',
          razorpayOrderId: order.id,
          status: 'pending'
        });

        return this.sendSuccess(res, {
          order,
          targetMembershipType,
          amount
        });
      }
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * Verify membership upgrade payment
   */
  verifyMembershipUpgrade = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { orderId } = req.body;

      // Verify payment
      await this.paymentService.verifyPayment(orderId);

      // Get the payment record
      const payment = await this.paymentService.getPaymentByOrderId(orderId);
      if (!payment) {
        return this.sendError(res, 'Payment record not found', 404);
      }

      // Get user's current membership type
      const user = await this.userService.findById(userId);
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Determine new membership type based on payment amount
      const membershipPrices = {
        499: 'cityfeed_select',
        999: 'cityfeed_edge',
        1499: 'cityfeed_prime'
      } as const;

      const newMembershipType = membershipPrices[payment.amount as keyof typeof membershipPrices];
      if (!newMembershipType) {
        return this.sendError(res, 'Invalid payment amount for membership upgrade', 400);
      }

      // Update membership type and expiry date
      const membershipExpiryDate = new Date();
      membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

      await this.userService.update(userId, {
        membershipType: newMembershipType,
        membershipExpiryDate
      });

      return this.sendSuccess(res, {
        message: 'Membership upgraded successfully',
        newMembershipType,
        expiryDate: membershipExpiryDate
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getUserByPhone = async (req: AuthRequest, res: Response) => {
    try {
      const { phone } = req.query;
      if (!phone) return this.sendError(res, 'Phone number or email is required', 400);
      const user = await this.userService.findByPhoneOrEmail(phone as string);
      if (!user) return this.sendError(res, 'User not found', 404);
      
      // Remove sensitive fields from the response
      const sanitizedUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        phone: user.phone,
        membershipType: user.membershipType,
        membershipExpiryDate: user.membershipExpiryDate,
        role: user.role,
        coins: user.coins,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isGuest: user.isGuest,
        profilePicture: user.profilePicture,
        address: user.address,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      };
      
      this.sendSuccess(res, sanitizedUser);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMyWalletBalance = async (req: AuthRequest, res: Response) => {
    try {
      const user = await this.userService.findById(req.user._id);
      if (!user) return this.sendError(res, 'User not found', 404);
      this.sendSuccess(res, { balance: user.coins });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMyRewardPoints = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, 'User not found', 404);
      }

      const userProfile = await this.userRepository.findById(user._id);
      if (!userProfile) {
        return this.sendError(res, 'User profile not found', 404);
      }

      this.sendSuccess(res, { coins: userProfile.coins || 0 });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/user/reward-history:
   *   get:
   *     summary: Get reward points history for the authenticated user
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: transactionType
   *         schema:
   *           type: string
   *           enum: [earned, redeemed, refund, adjustment]
   *         description: Filter by transaction type
   *       - in: query
   *         name: sourceType
   *         schema:
   *           type: string
   *           enum: [dine-in, event, referral, membership, adjustment, refund]
   *         description: Filter by source type
   *     responses:
   *       200:
   *         description: Reward points history retrieved successfully
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
   *                     history:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           transactionType:
   *                             type: string
   *                             enum: [earned, redeemed, refund, adjustment]
   *                           amount:
   *                             type: number
   *                           sourceType:
   *                             type: string
   *                             enum: [dine-in, event, referral, membership, adjustment, refund]
   *                           description:
   *                             type: string
   *                           balanceAfter:
   *                             type: number
   *                           balanceBefore:
   *                             type: number
   *                           outletId:
   *                             type: object
    *                           eventId:
 *                             type: object
 *                           referredUserId:
 *                             type: object
 *                             description: Details of the referred user (only present for referral rewards)
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                     totalCount:
   *                       type: number
   *                     totalPages:
   *                       type: number
   *                     currentPage:
   *                       type: number
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  getMyRewardHistory = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, 'User not found', 404);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const transactionType = req.query.transactionType as 'earned' | 'redeemed' | 'refund' | 'adjustment' | undefined;
      const sourceType = req.query.sourceType as 'dine-in' | 'event' | 'referral' | 'membership' | 'adjustment' | 'refund' | undefined;

      const result = await this.rewardService.getRewardHistory(
        user._id,
        page,
        limit,
        transactionType,
        sourceType
      );

      this.sendSuccess(res, result);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/user/reward-summary:
   *   get:
   *     summary: Get reward points summary for the authenticated user
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reward points summary retrieved successfully
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
   *                     totalEarned:
   *                       type: number
   *                       description: Total reward points earned
   *                     totalRedeemed:
   *                       type: number
   *                       description: Total reward points redeemed
   *                     currentBalance:
   *                       type: number
   *                       description: Current reward points balance
   *                     transactionCount:
   *                       type: number
   *                       description: Total number of transactions
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  getMyRewardSummary = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, 'User not found', 404);
      }

      const summary = await this.rewardService.getRewardSummary(user._id);
      this.sendSuccess(res, summary);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  sendReferralEmail = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, 'User not found', 404);
      }
      const { friendEmail } = req.body;
      if (!friendEmail) {
        return this.sendError(res, 'Friend email is required', 400);
      }
      const userProfile = await this.userRepository.findById(user._id);
      if (!userProfile) {
        return this.sendError(res, 'User profile not found', 404);
      }
      const referralCode = userProfile.referralCode;
      const subject = `${userProfile.name} invited you to join CityFeed Club!`;
      const message = `Hi!\n\n${userProfile.name} has invited you to join CityFeed Club. Use their referral code: ${referralCode} when you sign up to get rewards!\n\nSign up here: <your-app-link>`;
      await this.emailService.sendMail({
        from: process.env.SMTP_USER || 'noreply@cityfeed.club',
        to: friendEmail,
        subject,
        text: message
      });
      this.sendSuccess(res, { message: 'Referral email sent successfully' });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  async getUserById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return this.sendError(res, 'User ID not found', 400);
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      return this.sendSuccess(res, user, 'User profile retrieved successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  }

  async checkEmailAvailability(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return this.sendError(res, 'Email is required', 400);
      }

      const normalizedEmail = email.toLowerCase();
      const existingVerifiedUser = await this.userService.findVerifiedUserByEmail(normalizedEmail);
      const isAvailable = !existingVerifiedUser;

      let message = '';
      if (isAvailable) {
        // Check if there are any unverified users with this email
        const existingUnverifiedUser = await this.userService.findByEmail(normalizedEmail);
        if (existingUnverifiedUser && !existingUnverifiedUser.isEmailVerified) {
          message = 'Email is available (previous unverified registration will be replaced)';
        } else {
          message = 'Email is available';
        }
      } else {
        message = 'Email is already registered with a verified account';
      }

      return this.sendSuccess(res, { 
        email: normalizedEmail, 
        isAvailable,
        message
      }, 'Email availability checked successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  }

  async checkPhoneAvailability(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return this.sendError(res, 'Phone number is required', 400);
      }

      const existingUser = await this.userService.findByPhone(phone);
      const isAvailable = !existingUser;

      return this.sendSuccess(res, { 
        phone, 
        isAvailable,
        message: isAvailable ? 'Phone number is available' : 'Phone number is already registered'
      }, 'Phone number availability checked successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  }



  /**
   * @swagger
   * /api/users/{userId}:
   *   put:
   *     tags: [Users]
   *     summary: Update employee details (Super Admin/Outlet Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the employee to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: Employee's name
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Employee's email
   *               phone:
   *                 type: string
   *                 description: Employee's phone number
   *               role:
   *                 type: string
   *                 enum: [employee, outlet_admin]
   *                 description: Employee's role
   *               isActive:
   *                 type: boolean
   *                 description: Whether the employee is active
   *     responses:
   *       200:
   *         description: Employee updated successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Only super admin or outlet admin can update employees
   *       404:
   *         description: Employee not found
   */
  updateEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;
      const { userId } = req.params;
      const updateData = req.body;

      logger.debug('UpdateEmployee: userId param:', userId);

      // Check if current user is super admin or outlet admin
      if (!['super_admin', 'outlet_admin'].includes(currentUser.role)) {
        return this.sendError(res, 'Only super admin or outlet admin can update employees', 403);
      }

      // Only allow updating fields that exist in Staff
      const allowedFields = ['name', 'email', 'phone', 'role', 'responsibilities', 'isEmailVerified'];
      const updates: any = {};
      for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
          updates[key] = updateData[key];
        }
      }
      // Normalize email and name if present
      if (updates.email) updates.email = updates.email.toLowerCase();
      if (updates.name) updates.name = updates.name.toLowerCase();

      // Update the employee assignment in Staff
      const updatedAssignment = await Staff.findByIdAndUpdate(userId, updates, { new: true });
      if (!updatedAssignment) {
        return this.sendError(res, 'Employee assignment not found', 404);
      }

      this.sendSuccess(res, updatedAssignment, 'Employee updated successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/{userId}:
   *   delete:
   *     tags: [Users]
   *     summary: Delete employee (Super Admin/Outlet Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the employee to delete
   *     responses:
   *       200:
   *         description: Employee deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Only super admin or outlet admin can delete employees
   *       404:
   *         description: Employee not found
   */
  deleteEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;
      const { userId } = req.params;

      logger.debug('DeleteEmployee: userId param:', userId);

      // Check if current user is super admin or outlet admin
      if (!['super_admin', 'outlet_admin'].includes(currentUser.role)) {
        return this.sendError(res, 'Only super admin or outlet admin can delete employees', 403);
      }

      // Soft delete the employee assignment in Staff
      const deletedAssignment = await Staff.findByIdAndUpdate(
        userId,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!deletedAssignment) {
        return this.sendError(res, 'Employee assignment not found', 404);
      }

      this.sendSuccess(res, deletedAssignment, 'Employee assignment deleted (soft) successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/users/booked-tickets:
   *   get:
   *     tags: [Users]
   *     summary: Get authenticated user's booked tickets with filtering options
   *     description: Retrieve the authenticated user's booked tickets with date and status filtering. By default, fetches tickets from 3 months ago to present. Only returns tickets belonging to the authenticated user.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering tickets (YYYY-MM-DD format)
   *         example: "2024-01-01"
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering tickets (YYYY-MM-DD format)
   *         example: "2024-12-31"
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, used, invalidated, refunded]
   *         description: Filter tickets by status
   *         example: "active"
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of tickets per page
   *     responses:
   *       200:
   *         description: Booked tickets retrieved successfully
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
   *                     user:
   *                       type: object
   *                       nullable: true
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                         email:
   *                           type: string
   *                         phone:
   *                           type: string
   *                         membershipType:
   *                           type: string
   *                         profilePicture:
   *                           type: string
   *                           nullable: true
   *                       description: User data (only included once since all tickets belong to the same user)
   *                     tickets:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           ticketId:
   *                             type: string
   *                           orderId:
   *                             type: string
   *                           status:
   *                             type: string
   *                           quantity:
   *                             type: integer
   *                           issuedAt:
   *                             type: string
   *                             format: date-time
   *                           scannedAt:
   *                             type: string
   *                             format: date-time
   *                             nullable: true
   *                           qrCodeUrl:
   *                             type: string
   *                           totalPrice:
   *                             type: number
   *                             description: Total price for this ticket (price * quantity)
   *                           event:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                               name:
   *                                 type: string
   *                               date:
   *                                 type: string
   *                                 format: date-time
   *                               startTime:
   *                                 type: string
   *                               endTime:
   *                                 type: string
   *                               venue:
   *                                 type: object
   *                                 properties:
   *                                   name:
   *                                     type: string
   *                                   address:
   *                                     type: string
   *                                   capacity:
   *                                     type: integer
   *                           ticketTier:
   *                             type: object
   *                             nullable: true
   *                             properties:
   *                               id:
   *                                 type: string
   *                               name:
   *                                 type: string
   *                               price:
   *                                 type: number
   *                               description:
   *                                 type: string
   *                           scannedBy:
   *                             type: object
   *                             nullable: true
   *                             properties:
   *                               id:
   *                                 type: string
   *                               name:
   *                                 type: string
   *                               email:
   *                                 type: string
   *                     statistics:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: integer
   *                         active:
   *                           type: integer
   *                         used:
   *                           type: integer
   *                         invalidated:
   *                           type: integer
   *                         refunded:
   *                           type: integer
   *                         totalQuantity:
   *                           type: integer
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalTickets:
   *                           type: integer
   *                           description: Total number of tickets
   *                         totalValue:
   *                           type: number
   *                           description: Total value of all tickets
   *                         activeTickets:
   *                           type: integer
   *                           description: Number of active tickets
   *                         upcomingEvents:
   *                           type: integer
   *                           description: Number of tickets for upcoming events
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: integer
   *                         page:
   *                           type: integer
   *                         limit:
   *                           type: integer
   *                         totalPages:
   *                           type: integer
   *                         hasNextPage:
   *                           type: boolean
   *                         hasPrevPage:
   *                           type: boolean
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async getBookedTickets(req: AuthRequest, res: Response) {
    try {
      const {
        startDate,
        endDate,
        status,
        page = 1,
        limit = 10
      } = req.query;

      // Get the authenticated user's ID
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Calculate default date range (3 months ago to now)
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Parse dates
      const startDateFilter = startDate ? new Date(startDate as string) : threeMonthsAgo;
      const endDateFilter = endDate ? new Date(endDate as string) : now;

      // Validate dates
      if (isNaN(startDateFilter.getTime()) || isNaN(endDateFilter.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format.'
        });
      }

      if (startDateFilter > endDateFilter) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be after end date.'
        });
      }

      // Build query - filter by authenticated user's ID
      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        issuedAt: {
          $gte: startDateFilter,
          $lte: endDateFilter
        }
      };

      // Add status filter if provided
      if (status && ['active', 'used', 'invalidated', 'refunded'].includes(status as string)) {
        query.status = status;
      }

      // Calculate pagination
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const limitNum = parseInt(limit as string);

      // Get tickets with populated data
      const tickets = await Ticket.find(query)
        .populate({
          path: 'eventId',
          select: 'name date startEventDate endEventDate startTime endTime venue description coverImages type status'
        })
        .populate({
          path: 'ticketTierId',
          select: 'name price description order'
        })
        .populate({
          path: 'userId',
          select: 'name email phone membershipType profilePicture address'
        })
        .populate({
          path: 'scannedBy',
          select: 'name email'
        })
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const totalTickets = await Ticket.countDocuments(query);

      // Calculate statistics
      const stats = await Ticket.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);

      const statistics = {
        total: 0,
        active: 0,
        used: 0,
        invalidated: 0,
        refunded: 0,
        totalQuantity: 0
      };

      stats.forEach(stat => {
        statistics[stat._id as keyof typeof statistics] = stat.count;
        statistics.totalQuantity += stat.totalQuantity;
      });

      statistics.total = totalTickets;

      // Get user data once (since all tickets belong to the same user)
      const user = tickets[0]?.userId as any;
      const userData = user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        membershipType: user.membershipType,
        profilePicture: user.profilePicture
      } : null;

      // Format response with optimized structure (without repeating user data)
      const formattedTickets = tickets.map(ticket => {
        const event = ticket.eventId as any;
        const ticketTier = ticket.ticketTierId as any;
        const scannedBy = ticket.scannedBy as any;

        // Calculate total price for the ticket
        const totalPrice = ticketTier ? ticketTier.price * ticket.quantity : 0;

        // Determine event date (prefer startEventDate over date)
        const eventDate = event?.startEventDate || event?.date;

        return {
          ticketId: ticket._id,
          orderId: ticket.orderId,
          status: ticket.status,
          quantity: ticket.quantity,
          totalPrice,
          issuedAt: ticket.issuedAt,
          scannedAt: ticket.scannedAt,
          qrCodeUrl: ticket.qrCodeUrl,
          event: event ? {
            id: event._id,
            name: event.name,
            date: eventDate,
            startTime: event.startTime,
            endTime: event.endTime,
            status: event.status,
            venue: event.venue ? {
              name: event.venue.name,
              address: event.venue.address,
              capacity: event.venue.capacity,
              location: event.venue.location
            } : null,
            description: event.description,
            coverImage: event.coverImages?.[0] || null, // Return first image only
            type: event.type
          } : null,
          ticketTier: ticketTier ? {
            id: ticketTier._id,
            name: ticketTier.name,
            price: ticketTier.price,
            description: ticketTier.description,
            order: ticketTier.order
          } : null,
          scannedBy: scannedBy ? {
            id: scannedBy._id,
            name: scannedBy.name,
            email: scannedBy.email
          } : null
        };
      });

      const totalPages = Math.ceil(totalTickets / limitNum);

      return res.status(200).json({
        success: true,
        message: 'Tickets retrieved successfully',
        data: {
          user: userData, // User data at top level (only once)
          tickets: formattedTickets,
          summary: {
            totalTickets: totalTickets,
            totalValue: formattedTickets.reduce((sum, ticket) => sum + (ticket.totalPrice || 0), 0),
            activeTickets: statistics.active,
            upcomingEvents: formattedTickets.filter(ticket => 
              ticket.event?.date && new Date(ticket.event.date) > new Date()
            ).length
          },
          statistics,
          pagination: {
            total: totalTickets,
            page: parseInt(page as string),
            limit: limitNum,
            totalPages,
            hasNextPage: parseInt(page as string) < totalPages,
            hasPrevPage: parseInt(page as string) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error in getBookedTickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const activateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User activated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const userController = new UserController();