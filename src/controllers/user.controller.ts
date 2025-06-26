import { Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';
import { AuthRequest, TokenPayload } from '../interfaces/auth.interface';
import { UserRepository } from '../repositories/user.repository';
import { PaymentService } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';

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

  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.userService = new UserService();
    this.paymentService = new PaymentService(
      new PaymentRepository(),
      this.userRepository,
      new DineInSessionRepository()
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

      this.sendSuccess(res, userProfile);
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
   *     description: Update user's name, date of birth, and gender. Phone number and email cannot be updated through this endpoint.
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

      const { name, dob, gender } = req.body;
      
      // Validate gender if provided
      if (gender && !['male', 'female', 'other'].includes(gender)) {
        return this.sendError(res, 'Invalid gender value. Must be one of: male, female, other', 400);
      }

      // Convert dob string to Date object if provided
      const updateData: any = { name, gender };
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

      const updatedUser = await this.userRepository.update(user._id, updateData);
      if (!updatedUser) {
        return this.sendError(res, 'Failed to update profile', 400);
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
        return this.sendError(res, 'Failed to delete profile', 400);
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
      const order = await this.paymentService.createOrder(userId, amount, 'membership_upgrade');

      // Create pending payment record
      await this.paymentService.createPayment({
        userId,
        amount,
        type: 'membership_upgrade',
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
          type: 'membership_upgrade',
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
        const order = await this.paymentService.createOrder(userId, amount, 'membership_upgrade');

        // Create pending payment record
        await this.paymentService.createPayment({
          userId,
          amount,
          type: 'membership_upgrade',
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
      if (!phone) return this.sendError(res, 'Phone number is required', 400);
      const user = await this.userService.findByPhone(phone as string);
      if (!user) return this.sendError(res, 'User not found', 404);
      this.sendSuccess(res, user);
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
      const user = await this.userService.findById(req.user._id);
      if (!user) return this.sendError(res, 'User not found', 404);
      this.sendSuccess(res, { rewardPoints: user.reward_points });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
}

export const userController = new UserController();