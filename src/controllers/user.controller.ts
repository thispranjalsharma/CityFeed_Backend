import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';
import { AuthRequest, TokenPayload } from '../interfaces/auth.interface';
import { UserRepository } from '../repositories/user.repository';
import { Types } from 'mongoose';
import { PaymentService } from '../services/payment.service';
import { AppErrorClass } from '../middleware/error.middleware';
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
 *         phone:
 *           type: string
 *           description: User's phone number
 *         address:
 *           type: string
 *           description: User's address
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
   *                       enum: [user, merchant, admin]
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
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateProfileRequest'
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
   *                       enum: [user, merchant, admin]
   *                       example: "user"
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

      const { name, phone, address } = req.body;
      const updatedUser = await this.userRepository.update(user._id, { name, phone, address });
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
   * /api/users/merchants:
   *   get:
   *     summary: Get user's merchants
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User's merchants retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getUserMerchants = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const merchants = await this.userService.getUserMerchants(userId);
      this.sendSuccess(res, merchants);
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
      const membershipTiers = ['cityfeed_club', 'cityfeed_edge', 'cityfeed_prime'];
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
      const order = await this.paymentService.createOrder(userId, amount);

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

  verifyMembershipUpgrade = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { orderId } = req.body;

      // Verify payment
      const paymentResult = await this.paymentService.verifyPayment(orderId);

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
      let newMembershipType = user.membershipType;
      if (payment.amount === 500) {
        newMembershipType = 'cityfeed_edge';
      } else if (payment.amount === 1000) {
        newMembershipType = 'cityfeed_prime';
      }

      // Update user's membership type
      await this.userService.update(userId, {
        membershipType: newMembershipType
      });

      this.sendSuccess(res, {
        message: 'Membership upgraded successfully',
        newMembershipType
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
}