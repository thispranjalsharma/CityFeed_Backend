import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentService } from '../services/payment.service';
import { AppErrorClass } from '../utils/appError';
import { AuthRequest } from '../interfaces/auth.interface';
import { PaymentRepository } from '../repositories/payment.repository';
import { UserRepository } from '../repositories/user.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { OutletRepository } from '../repositories/outlet.repository';
import { EventRepository } from '../repositories/event.repository';
import Razorpay from 'razorpay';
import { PreRegistrationPayment } from '../models/preRegistrationPayment.model';
import { logger } from '../utils/logger.util';
import { Ticket } from '../models/ticket.model';
import QRCode from 'qrcode';
import { EmailService } from '../services/email.service';
import { Event } from '../models/event.model';
import { TicketTier } from '../models/ticketTier.model';
import cloudinary from '../config/cloudinary';
import { sendWhatsAppMessage, formatIndianPhoneNumber } from '../utils/whatsapp.util';
import { Order } from '../models/order.model';
import { Payment } from '../models/payment.model';
import { DineInSession } from '../models/dineInSession.model';
import { User } from '../models/user.model';
import { io } from '../server';
import mongoose from 'mongoose';
import { Outlet } from '../models/outlet.model';
import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';
import { OfferService } from '../services/offer.service';
import { config } from '../config/config';

/**
 * @swagger
 * components:
 *   schemas:
 *     DineInPaymentRequest:
 *       type: object
 *       required:
 *         - outletId
 *         - offerId
 *         - totalBill
 *       properties:
 *         outletId:
 *           type: string
 *           description: ID of the outlet
 *         offerId:
 *           type: string
 *           description: ID of the offer
 *         totalBill:
 *           type: number
 *           description: Total bill amount
 *     RechargeRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           description: Amount to recharge in INR
 *           minimum: 1
 *           example: 100
 *     RechargeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             orderId:
 *               type: string
 *               description: Razorpay order ID
 *               example: "order_123456789"
 *             amount:
 *               type: number
 *               description: Amount in paise
 *               example: 10000
 *             currency:
 *               type: string
 *               description: Currency code
 *               example: "INR"
 *             receipt:
 *               type: string
 *               description: Receipt ID
 *               example: "receipt_123456789"
 *     VerifyRechargeRequest:
 *       type: object
 *       required:
 *         - razorpay_order_id
 *         - razorpay_payment_id
 *         - razorpay_signature
 *       properties:
 *         razorpay_order_id:
 *           type: string
 *           description: Razorpay order ID
 *           example: "order_123456789"
 *         razorpay_payment_id:
 *           type: string
 *           description: Razorpay payment ID
 *           example: "pay_123456789"
 *         razorpay_signature:
 *           type: string
 *           description: Razorpay signature for verification
 *           example: "abc123def456"
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         amount:
 *           type: number
 *         type:
 *           type: string
 *         status:
 *           type: string
 *         paymentMethod:
 *           type: string
 *         razorpayOrderId:
 *           type: string
 *         razorpayPaymentId:
 *           type: string
 *         razorpaySignature:
 *           type: string
 *         orderId:
 *           type: string
 *           description: Internal order ID (reference to Order)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const MEMBERSHIP_PRICES: Record<string, number> = {
  cityfeed_select: 499,
  cityfeed_edge: 999,
  cityfeed_prime: 1499,
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// In-memory OTP sent tracking (for dev/testing only)
const otpSentMap: { [phone: string]: number } = {};

export class PaymentController extends BaseController {
  private paymentService: PaymentService;
  private paymentRepository: PaymentRepository;
  private userRepository: UserRepository;
  private dineInSessionRepository: DineInSessionRepository;

  constructor() {
    super();
    this.paymentRepository = new PaymentRepository();
    this.userRepository = new UserRepository();
    this.dineInSessionRepository = new DineInSessionRepository();
    this.paymentService = new PaymentService(
      this.paymentRepository,
      this.userRepository,
      this.dineInSessionRepository,
      new OutletRepository(),
      new EventRepository()
    );
  }

  createOrder = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { amount, currency = 'INR' } = req.body;
      const order = await this.paymentService.createOrder(userId, amount, 'recharge');
      this.sendSuccess(res, order);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  verifyPayment = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { orderId } = req.body;
      const result = await this.paymentService.verifyPayment(orderId);

      this.sendSuccess(res, result, 'Payment verified successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/dine-in:
   *   post:
   *     summary: Process dine-in payment using wallet coins and/or reward points
   *     description: |
   *       Process a dine-in payment using wallet coins and optionally reward points.
   *       If reward points are requested, an OTP will be sent to the user's phone number.
   *       The user must verify the OTP to use reward points.
   *       
   *       Reward Points Usage Limits:
   *       - cityfeed_select: Up to 20% of total bill
   *       - cityfeed_edge: Up to 30% of total bill
   *       - cityfeed_prime: Up to 40% of total bill
   *       
   *       Reward Points Earning:
   *       - cityfeed_select: 2% of total bill
   *       - cityfeed_edge: 3% of total bill
   *       - cityfeed_prime: 5% of total bill
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - outletId
   *               - offerId
   *               - totalBill
   *             properties:
   *               outletId:
   *                 type: string
   *                 description: ID of the outlet
   *               offerId:
   *                 type: string
   *                 description: ID of the offer being used
   *               totalBill:
   *                 type: number
   *                 description: Total bill amount
   *               paymentMethod:
   *                 type: string
   *                 enum: [wallet, razorpay]
   *                 description: Payment method to use
   *               useRewardPoints:
   *                 type: boolean
   *                 description: Whether to use reward points
   *               rewardPointsToUse:
   *                 type: number
   *                 description: Number of reward points to use (required if useRewardPoints is true)
   *               otp:
   *                 type: string
   *                 description: OTP for reward points verification (required if useRewardPoints is true)
   *     responses:
   *       200:
   *         description: Payment processed successfully
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
   *                     amount:
   *                       type: number
   *                     status:
   *                       type: string
   *                     paymentMethod:
   *                       type: string
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Reward points amount is required when using reward points"
   *       401:
   *         description: Unauthorized
   *       402:
   *         description: Insufficient coins
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Insufficient coins"
   *                 data:
   *                   type: object
   *                   properties:
   *                     requiredCoins:
   *                       type: number
   *                     currentCoins:
   *                       type: number
   *                     finalAmount:
   *                       type: number
   *       403:
   *         description: Invalid OTP
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Invalid OTP"
   */
  processDineInPayment = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { 
        outletId, 
        offerId, 
        totalBill, 
        paymentMethod,
        useRewardPoints,
        rewardPointsToUse,
        otp
      } = req.body;

      // Validate reward points usage
      if (useRewardPoints && !rewardPointsToUse) {
        return this.sendError(res, 'Reward points amount is required when using reward points', 400);
      }

      // Process the payment
      const result = await this.paymentService.processDineInPayment({
        userId,
        outletId,
        offerId,
        totalBill,
        paymentMethod,
        useRewardPoints,
        rewardPointsToUse,
        otp
      });

      // Check if result is an OTPRequiredResponse
      if ('status' in result && result.status === 'otp_required') {
        return this.sendSuccess(res, result, 'OTP has been sent to your phone number');
      }

      // Check if result is an InsufficientCoinsResponse
      if ('status' in result && result.status === 'insufficient_coins') {
        return this.sendError(res, 'Insufficient coins', 402);
      }

      this.sendSuccess(res, result, 'Payment processed successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/recharge:
   *   post:
   *     summary: Create wallet recharge order
   *     description: |
   *       Create a new Razorpay order for wallet recharge.
   *       The amount should be in INR (minimum ₹1).
   *       Returns Razorpay order details needed for payment processing.
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RechargeRequest'
   *     responses:
   *       200:
   *         description: Recharge order created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RechargeResponse'
   *       400:
   *         description: Invalid amount
   *       401:
   *         description: Unauthorized - User not authenticated
   *       503:
   *         description: Payment service not configured
   */
  createRechargeOrder = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { amount } = req.body;
      if (!amount || amount < 1) {
        return this.sendError(res, 'Invalid amount. Minimum amount is ₹1', 400);
      }

      const order = await this.paymentService.createRechargeOrder(userId, amount);
      this.sendSuccess(res, order);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/recharge/verify:
   *   post:
   *     summary: Verify wallet recharge payment
   *     description: |
   *       Verify the Razorpay payment and credit the amount to user's wallet.
   *       This endpoint should be called after successful payment on Razorpay.
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VerifyRechargeRequest'
   *     responses:
   *       200:
   *         description: Payment verified and wallet recharged successfully
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
   *                     amount:
   *                       type: number
   *                       description: Amount credited to wallet
   *                       example: 100
   *                     coins:
   *                       type: number
   *                       description: Updated wallet balance
   *                       example: 500
   *       400:
   *         description: Invalid payment signature
   *       401:
   *         description: Unauthorized - User not authenticated
   *       503:
   *         description: Payment service not configured
   */
  verifyRecharge = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        this.sendError(res, 'User not authenticated', 401);
        return;
      }

      const { orderId } = req.body;
      if (!orderId) {
        this.sendError(res, 'Order ID is required', 400);
        return;
      }

      // Verify payment and get result
      const result = await this.paymentService.verifyPayment(orderId);

      // Get updated user data
      const user = await this.paymentService.getUserById(userId);
      if (!user) {
        this.sendError(res, 'User not found', 404);
        return;
      }

      this.sendSuccess(res, {
        amount: result.amount,
        coins: user.coins
      }, 'Wallet recharged successfully');
    } catch (error) {
      logger.error('Error verifying recharge:', error);
      if (error instanceof AppErrorClass) {
        this.sendError(res, error.message, error.statusCode);
        return;
      }
      this.sendError(res, 'Failed to verify payment', 500);
    }
  };

  /**
   * @swagger
   * /api/payments/transactions:
   *   get:
   *     summary: Get user's transaction history
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Transaction history retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getTransactionHistory = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const transactions = await this.paymentService.getTransactionHistory(userId);
      // Enrich dine-in transactions with session details
      const enrichedTransactions = await Promise.all(
        transactions.map(async (txn: any) => {
          let dineInSessionId = txn.dineInSessionId || null;
          // Handle both string and object cases for outletId and offerId
          const txnOutletId = typeof txn.outletId === 'object' && txn.outletId !== null ? txn.outletId._id?.toString() : txn.outletId?.toString();
          const txnOfferId = typeof txn.offerId === 'object' && txn.offerId !== null ? txn.offerId._id?.toString() : txn.offerId?.toString();
          if (txn.type === 'dine-in' && !dineInSessionId) {
            // Try to find the session by userId, outletId, offerId, and paymentId
            const session = await this.dineInSessionRepository.findByUserId(txn.userId);
            const foundSession = session.find((s: any) =>
              s.outletId === txnOutletId &&
              s.offerId === txnOfferId &&
              s.paymentId === txn._id.toString()
            );
            if (foundSession) {
              dineInSessionId = foundSession._id.toString();
            }
          }
          const txnObj = txn.toObject();
          return {
            ...txnObj,
            dineInSessionId
          };
        })
      );
      this.sendSuccess(res, enrichedTransactions);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/dine-in/history:
   *   get:
   *     summary: Get user's dine-in history
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dine-in history retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getDineInHistory = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const history = await this.paymentService.getDineInHistory(userId);
      this.sendSuccess(res, history);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getTransactionById = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { id } = req.params;
      const transaction = await this.paymentService.getTransactionById(id);
      
      if (transaction.userId.toString() !== userId) {
        return this.sendError(res, 'Not authorized to view this transaction', 403);
      }

      let responseObj: any = transaction.toObject();
      if (transaction.type === 'dine-in' && transaction.dineInSessionId) {
        const session = await this.dineInSessionRepository.findById(transaction.dineInSessionId);
        responseObj = {
          ...responseObj,
          dineInSession: session ? session.toObject() : null
        } as any;
      }
      this.sendSuccess(res, responseObj);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  createPayment = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const payment = await this.paymentRepository.create({
        ...req.body,
        userId
      });

      this.sendCreated(res, payment, 'Payment created successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getUserPayments = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const payments = await this.paymentRepository.findByUser(userId);
      this.sendSuccess(res, payments);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getPaymentById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const payment = await this.paymentRepository.findById(id);
      if (!payment) {
        return this.sendError(res, 'Payment not found', 404);
      }

      if (payment.userId.toString() !== userId) {
        return this.sendError(res, 'Not authorized to view this payment', 403);
      }

      this.sendSuccess(res, payment);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  updatePayment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const payment = await this.paymentRepository.findById(id);
      if (!payment) {
        return this.sendError(res, 'Payment not found', 404);
      }

      if (payment.userId.toString() !== userId) {
        return this.sendError(res, 'Not authorized to update this payment', 403);
      }

      const updatedPayment = await this.paymentRepository.update(id, req.body);
      this.sendSuccess(res, updatedPayment);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  deletePayment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const payment = await this.paymentRepository.findById(id);
      if (!payment) {
        return this.sendError(res, 'Payment not found', 404);
      }

      if (payment.userId.toString() !== userId) {
        return this.sendError(res, 'Not authorized to delete this payment', 403);
      }

      await this.paymentRepository.delete(id);
      this.sendSuccess(res, null, 'Payment deleted successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  
  getUserPaymentHistory = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const payments = await this.paymentRepository.findByUser(userId);
      this.sendSuccess(res, payments);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/direct/initiate:
   *   post:
   *     summary: Initiate direct payment using Razorpay
   *     description: |
   *       Initiate a direct payment using Razorpay without using wallet coins.
   *       This endpoint is for direct payments only and does not interact with the user's wallet.
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - outletId
   *               - offerId
   *               - totalBill
   *             properties:
   *               outletId:
   *                 type: string
   *                 description: ID of the outlet
   *               offerId:
   *                 type: string
   *                 description: ID of the offer being used
   *               totalBill:
   *                 type: number
   *                 description: Total bill amount
   *     responses:
   *       200:
   *         description: Payment initiated successfully
   *       401:
   *         description: Unauthorized
   *       503:
   *         description: Payment service not configured
   */
  initiateDirectPayment = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return this.sendError(res, 'User not authenticated', 401);
    }
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }
      // For event payments, require orderType and orderId
      const { orderType, orderId } = req.body;
      if (orderType !== 'event' || !orderId) {
        return this.sendError(res, 'orderType and orderId are required for event direct payment', 400);
      }
      // Fetch the event order
      const order = await Order.findById(orderId);
      if (!order) return this.sendError(res, 'Order not found', 404);
      if (order.user.toString() !== userId) {
        // For guest users, allow if order is pending and user is guest
        if (!(req.user.isGuest && order.status === 'pending')) {
          return this.sendError(res, 'Unauthorized: You can only pay for your own event order.', 403);
        }
      }
      if (order.status === 'paid') return this.sendError(res, 'Order already paid', 400);
      // Calculate total amount
      const amount = (order.tickets && Array.isArray(order.tickets)) ? order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0) : 0;
      // Create Razorpay order
      const razorpayOrder = await this.paymentService.createRazorpayOrder(amount, userId, orderId, 'event');
      // Create pending payment record
      const payment = await Payment.create({
        userId: userId,
        amount: amount,
        type: 'event',
        status: 'pending',
        paymentMethod: 'razorpay',
        orderId: order._id, // <-- Ensure this is included
        razorpayOrderId: razorpayOrder.id
      });
      return this.sendSuccess(res, { order, payment, amount, razorpayOrder }, 'Event direct payment initiated. Complete payment via Razorpay.');
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? (error as any).message
          : JSON.stringify(error);
      console.error('Direct payment initiation error:', errorMsg, error);
      this.sendError(res, errorMsg, 400);
    }
  };

  /**
   * @swagger
   * /api/payments/direct/verify:
   *   post:
   *     summary: Verify direct payment
   *     description: |
   *       Verify the Razorpay payment for a direct payment.
   *       This endpoint should be called after successful payment on Razorpay.
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - orderId
   *             properties:
   *               orderId:
   *                 type: string
   *                 description: Razorpay order ID
   *                 example: "order_123456789"
   *     responses:
   *       200:
   *         description: Payment verified successfully
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
   *                   example: "Payment verified successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     status:
   *                       type: string
   *                       example: "completed"
   *                     amount:
   *                       type: number
   *                       example: 100
   *       400:
   *         description: Payment verification failed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "No payment found for this order. Please complete the payment first."
   *       401:
   *         description: Unauthorized - User not authenticated
   *       404:
   *         description: Payment record not found
   *       503:
   *         description: Payment service not configured
   */
  verifyDirectPayment = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return this.sendError(res, 'User not authenticated', 401);
    }
    try {
      const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
      if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return this.sendError(res, 'orderId, razorpayPaymentId, razorpayOrderId, and razorpaySignature are required', 400);
      }
      // Fetch the payment record
      const payment = await Payment.findOne({ orderId, razorpayOrderId });
      if (!payment) {
        return this.sendError(res, 'No payment found for this order. Please complete the payment first.', 404);
      }
      // Verify Razorpay signature
      const isValid = await this.paymentService.verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) {
        return this.sendError(res, 'Invalid payment signature', 400);
      }
      // Mark payment and order as paid
      payment.status = 'completed';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      await payment.save();
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'paid';
        await order.save();
        
        // Add reward coins for the final amount (single addition like dine-in)
        const user = await this.userRepository.findById(order.user.toString());
        if (user) {
          const amount = order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0);
          logger.info(`Adding reward coins for Razorpay event payment: userId=${order.user}, amount=${amount}`);
          await this.paymentService.addRewardCoinsToUser(order.user.toString(), amount);
        }
        
        // Referral reward: check if this is the user's first completed event payment
        const userOrders = await Order.find({ user: order.user, status: 'paid' });
        if (userOrders.length === 1) {
          // First completed event payment
          if (user && user.referredBy) {
            // Find the referrer by referralCode
            const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
            if (referrer) {
              // Give 250 coins to the referrer for first event payment
              await this.userRepository.update(referrer._id.toString(), { $inc: { coins: 250 } });
            }
          }
        }
        // Update soldCount for each ticket tier
        let hasTiers = false;
        for (const ticket of order.tickets) {
          if (ticket.ticketTierId) {
            hasTiers = true;
            await TicketTier.findByIdAndUpdate(
              ticket.ticketTierId,
              { $inc: { soldCount: ticket.quantity } }
            );
          }
        }
        // If no ticket tiers, update totalSoldCount on Event
        if (!hasTiers) {
          await Event.findByIdAndUpdate(
            order.event,
            { $inc: { totalSoldCount: order.tickets.reduce((sum, t) => sum + t.quantity, 0) } }
          );
        }
        // Emit availableSeats update via websocket
        const allTiers = await TicketTier.find({ event: order.event });
        let availableSeats = 0;
        if (allTiers.length > 0) {
          availableSeats = allTiers.reduce((sum, tier) => sum + ((tier.quantity || 0) - (tier.soldCount || 0)), 0);
        } else {
          const eventDoc = await Event.findById(order.event);
          availableSeats = eventDoc?.venue?.capacity || 0;
        }
        io.to(`event_${order.event}`).emit('eventSeatsUpdate', { eventId: order.event, availableSeats });
      }
      // Issue tickets, send emails, etc. (reuse existing logic if needed)
      return this.sendSuccess(res, { status: 'completed', amount: payment.amount }, 'Payment verified successfully');
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? (error as any).message
          : JSON.stringify(error);
      console.error('Direct payment verification error:', errorMsg, error);
      this.sendError(res, errorMsg, 400);
    }
  };

  /**
   * @swagger
   * /api/payments:
   *   post:
   *     summary: Process payment for any order type (event, dine-in, etc.)
   *     description: |
   *       Unified payment endpoint for all order types (event, dine-in, etc.) using wallet coins and/or reward points.
   *       For dine-in, this is equivalent to /api/payments/dine-in. For event, it processes event order payment.
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - orderType
   *               - orderId
   *               - paymentMethod
   *             properties:
   *               orderType:
   *                 type: string
   *                 enum: [event, dine-in]
   *                 example: event
   *               orderId:
   *                 type: string
   *                 example: 64e1c2f1a2b3c4d5e6f7a8b9
   *               paymentMethod:
   *                 type: string
   *                 enum: [wallet, rewardPoints]
   *                 example: wallet
   *               rewardPointsToUse:
   *                 type: number
   *                 description: Number of reward points to use (optional, for rewardPoints method)
   *               otp:
   *                 type: string
   *                 description: OTP for reward points verification (optional)
   *     responses:
   *       200:
   *         description: Payment processed successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       402:
   *         description: Insufficient balance
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Order not found
   */
  processUnifiedPayment = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }
      const { orderType, orderId, paymentMethod, rewardPointsToUse, otp } = req.body;
      if (!orderType || !orderId || !paymentMethod) {
        return this.sendError(res, 'orderType, orderId, and paymentMethod are required', 400);
      }
      if (orderType === 'dine-in') {
        // Fetch the session by orderId
        const session = await DineInSession.findById(orderId);
        if (!session) return this.sendError(res, 'Dine-in session not found', 404);
        // Set required fields for processDineInPayment
        req.body.outletId = session.outletId;
        req.body.offerId = session.offerId;
        req.body.totalBill = session.totalBill;
        return this.processDineInPayment(req, res);
      } else if (orderType === 'event') {
        // For event, process event order payment
        const order = await Order.findById(orderId);
        if (!order) return this.sendError(res, 'Order not found', 404);
        if (order.user.toString() !== userId) {
          // For guest users, allow if order is pending and user is guest
          if (!(req.user.isGuest && order.status === 'pending')) {
            return this.sendError(res, 'Unauthorized: You can only pay for your own event order.', 403);
          }
        }
        // Prevent multiple payments for the same orderId
        if (order && order.status === 'paid') {
          return this.sendError(res, 'Order already paid', 400);
        }
        const user = await User.findById(userId);
        if (!user) return this.sendError(res, 'User not found', 404);
        // GUEST USER RESTRICTIONS
        if (user.isGuest || user.role === 'guest_event') {
          // Only allow Razorpay
          if (paymentMethod !== 'razorpay') {
            return this.sendError(res, 'Guest users can only pay via Razorpay', 400);
          }
          // No discounts, no reward points, no wallet
          if (req.body.useRewardPoints || req.body.rewardPointsToUse) {
            return this.sendError(res, 'Guest users cannot use reward points', 400);
          }
          if (paymentMethod === 'wallet') {
            return this.sendError(res, 'Guest users cannot pay with wallet', 400);
          }
          // No membership discount
          const amount = (order.tickets && Array.isArray(order.tickets)) ? order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0) : 0;
          // Create Razorpay order for full amount
          const razorpayOrder = await this.paymentService.createRazorpayOrder(amount, userId, orderId, 'event');
          // Create pending payment record
          const payment = await Payment.create({
            userId: userId,
            amount: amount,
            type: 'event',
            status: 'pending',
            paymentMethod: 'razorpay',
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id
          });
          return this.sendSuccess(res, { order, payment, amount, razorpayOrder }, 'Guest event payment initiated. Complete payment via Razorpay.');
        }
        let amount = 0;
        if (order.tickets && Array.isArray(order.tickets)) {
          amount = order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0);
        }
        // Apply membership discount (now returns reward points to add)
        // For events, pass the eventId to get dynamic discount
        const { discountAmount, finalAmount, rewardPointsToAdd } = await this.paymentService.calculateDiscount(userId, amount, undefined, order.event?.toString());

        // Reward points and OTP logic for event (mirroring dine-in)
        const useRewardPoints = req.body.useRewardPoints;
        const rewardPointsToUse = req.body.rewardPointsToUse;
        const otp = req.body.otp;
        let remainingBill = finalAmount;
        let rewardPointsDeducted = 0;

        if (useRewardPoints && rewardPointsToUse) {
          // OTP verification
          if (otp) {
            const isValidOTP = await this.paymentService.verifyOTP(user.phone, otp);
            if (!isValidOTP) {
              return this.sendError(res, 'Invalid OTP', 400);
            }
            delete otpSentMap[user.phone]; // Invalidate OTP after use
          } else {
            await this.paymentService.sendOTP(user.phone);
            return this.sendSuccess(res, { status: 'otp_required', message: 'OTP has been sent to your phone number', finalAmount }, 'OTP required');
          }
          // Use reward points with limit enforcement
          try {
            const result = await this.paymentService.useRewardPoints(userId, finalAmount, rewardPointsToUse);
            rewardPointsDeducted = result.rewardPointsDeducted;
            remainingBill = result.remainingBill;
          } catch (err) {
            return this.sendError(res, err.message || 'Failed to use reward points', 400);
          }
        }

        if (paymentMethod === 'wallet') {
          if (req.body.coinsToUse && req.body.coinsToUse > 0) {
            if (!otp) {
              await this.paymentService.sendOTP(user.phone);
              return this.sendSuccess(res, { status: 'otp_required', message: 'OTP has been sent to your phone number', finalAmount }, 'OTP required');
            } else {
              const isValidOTP = await this.paymentService.verifyOTP(user.phone, otp);
              if (!isValidOTP) {
                return this.sendError(res, 'Invalid OTP', 400);
              }
              delete otpSentMap[user.phone]; // Invalidate OTP after use
            }
          }
          if (user.coins < finalAmount) return this.sendError(res, 'Insufficient wallet coins', 402);
          user.coins -= finalAmount;
          order.status = 'paid';
          await user.save();
          await order.save();
          // Add reward coins after successful event payment (discount amount as reward)
          logger.info(`Adding reward coins for event payment: userId=${userId}, rewardPointsToAdd=${rewardPointsToAdd}`);
          await this.paymentService.addRewardCoinsToUser(userId, rewardPointsToAdd);
          
          // Referral reward: check if this is the user's first completed event payment
          const userOrders = await Order.find({ user: userId, status: 'paid' });
          if (userOrders.length === 1) {
            // First completed event payment
            const user = await this.userRepository.findById(userId);
            if (user && user.referredBy) {
              // Find the referrer by referralCode
              const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
              if (referrer) {
                // Give 250 coins to the referrer for first event payment
                await this.userRepository.update(referrer._id.toString(), { $inc: { coins: 250 } });
              }
            }
          }
          const payment = await Payment.create({
            userId: userId,
            amount: finalAmount,
            type: 'event',
            status: 'completed',
            paymentMethod: paymentMethod, // If not in enum, update schema
            orderId: order._id,
            rewardPointsDeducted
          });
          // Only generate tickets for event payments
          if (orderType === 'event' && order.status === 'paid') {
            const tickets = [];
            // Get event details once
            const eventDoc = await Event.findById(order.event);
            for (const ticket of order.tickets) {
              // Get ticket tier name once per ticket type
              const ticketTier = await TicketTier.findById(ticket.ticketTierId);
              // Generate a new ObjectId for the ticket
              const tempTicketId = new mongoose.Types.ObjectId();
              // Build QR code payload with human-readable info and quantity
              const qrPayload =
                '==============================\n' +
                '  🎟️  CityFeed Event Ticket  🎟️\n' +
                '==============================\n' +
                `Event: ${eventDoc?.name || ''}\n` +
                `Date: ${eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : ''}\n` +
                `Venue: ${eventDoc?.venue?.name || ''}\n` +
                `Ticket Type: ${ticketTier ? ticketTier.name : ''}\n` +
                `Admits: ${ticket.quantity}\n` +
                `Ticket ID: ${tempTicketId}\n` +
                `Status: Active\n` +
                '------------------------------\n' +
                'Show this QR code at entry.\n' +
                'Enjoy the event!\n' +
                '==============================';
              const qrBuffer = await QRCode.toBuffer(qrPayload);
              // Upload to Cloudinary
              const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  { resource_type: 'image', folder: 'tickets' },
                  (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                  }
                );
                stream.end(qrBuffer);
              });
              const qrCodeUrl = (uploadResult as any).secure_url;
              // Create the ticket document with qrCodeUrl and quantity
              const ticketDoc = await Ticket.create({
                _id: tempTicketId,
                orderId: order._id,
                userId: userId,
                eventId: order.event,
                ticketTierId: ticket.ticketTierId,
                qrCodeUrl,
                quantity: ticket.quantity,
                status: 'active',
                issuedAt: new Date()
              });
              tickets.push({
                _id: ticketDoc._id,
                ticketTierId: ticket.ticketTierId,
                ticketTierName: ticketTier ? ticketTier.name : '',
                qrCodeUrl,
                quantity: ticket.quantity,
                status: ticketDoc.status,
                issuedAt: ticketDoc.issuedAt
              });
            }
            // After creating tickets, update soldCount for each ticket tier
            for (const ticket of order.tickets) {
              if (ticket.ticketTierId) {
                await TicketTier.findByIdAndUpdate(
                  ticket.ticketTierId,
                  { $inc: { soldCount: ticket.quantity } }
                );
              }
            }
            // For general admission (no ticket tiers), increment totalSoldCount on the Event
            if (!order.tickets.some(t => t.ticketTierId)) {
              await Event.findByIdAndUpdate(
                order.event,
                { $inc: { totalSoldCount: order.tickets.reduce((sum, t) => sum + t.quantity, 0) } }
              );
            }
            // Send ticket email
            const emailService = new EmailService();
            await emailService.sendTicketEmail({
              to: user.email,
              event: {
                name: eventDoc?.name || '',
                date: eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : '',
                venue: eventDoc?.venue?.name || ''
              },
              tickets: tickets.map(t => ({ qrCodeUrl: t.qrCodeUrl, ticketTierName: t.ticketTierName, quantity: t.quantity })),
              userName: user.name || '',
              startTime: eventDoc?.startTime || '',
              endTime: eventDoc?.endTime || ''
            });
            // Send WhatsApp message with ticket details and QR code
            if (user.phone) {
              const formattedPhone = formatIndianPhoneNumber(user.phone);
              const waMessage = `🎟️ CityFeed Event Ticket 🎟️\nEvent: ${eventDoc?.name}\nDate: ${eventDoc?.date?.toISOString().split('T')[0]}\nVenue: ${eventDoc?.venue?.name}\nShow this QR code at entry. Enjoy the event!`;
              for (const t of tickets) {
                // Add debug log before sending
                console.log(`Sending WhatsApp to: ${formattedPhone}, QR: ${t.qrCodeUrl}`);
                await sendWhatsAppMessage(
                  formattedPhone,
                  `${waMessage}\nTicket Type: ${t.ticketTierName}\nAdmits: ${t.quantity}`,
                  t.qrCodeUrl
                );
              }
            }
            // Add tickets to the response
            return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, rewardPointsDeducted, tickets }, 'Payment successful');
          }
          return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, rewardPointsDeducted }, 'Payment successful');
        } else if (paymentMethod === 'rewardPoints') {
          // Only allow if the full amount is covered by reward points
          if (remainingBill > 0) return this.sendError(res, 'Not enough reward points to cover the full amount', 400);
          order.status = 'paid';
          await user.save();
          await order.save();
          
          // Referral reward: check if this is the user's first completed event payment
          const userOrders = await Order.find({ user: userId, status: 'paid' });
          if (userOrders.length === 1) {
            // First completed event payment
            const user = await this.userRepository.findById(userId);
            if (user && user.referredBy) {
              // Find the referrer by referralCode
              const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
              if (referrer) {
                // Give 250 coins to the referrer for first event payment
                await this.userRepository.update(referrer._id.toString(), { $inc: { coins: 250 } });
              }
            }
          }
          
          const payment = await Payment.create({
            userId: userId,
            amount: finalAmount,
            type: 'event',
            status: 'completed',
            paymentMethod: paymentMethod, // If not in enum, update schema
            orderId: order._id,
            rewardPointsDeducted
          });
          return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, rewardPointsDeducted }, 'Payment successful');
        } else {
          // Hybrid payment: coins + Razorpay
          if (paymentMethod === 'razorpay' && req.body.coinsToUse && req.body.coinsToUse > 0) {
            // 1. OTP check for coins
            if (!otp) {
              await this.paymentService.sendOTP(user.phone);
              return this.sendSuccess(res, { status: 'otp_required', message: 'OTP has been sent to your phone number', finalAmount }, 'OTP required');
            } else {
              const isValidOTP = await this.paymentService.verifyOTP(user.phone, otp);
              if (!isValidOTP) {
                return this.sendError(res, 'Invalid OTP', 400);
              }
              delete otpSentMap[user.phone]; // Invalidate OTP after use
            }
            // 2. Deduct coins
            if (user.coins < req.body.coinsToUse) return this.sendError(res, 'Insufficient wallet coins', 402);
            user.coins -= req.body.coinsToUse;
            await user.save();
            // Add reward coins for the coins portion (discount amount as reward)
            logger.info(`Adding reward coins for coins portion: userId=${userId}, rewardPointsToAdd=${rewardPointsToAdd}`);
            await this.paymentService.addRewardCoinsToUser(userId, rewardPointsToAdd);
            // 3. Calculate remaining amount
            const remainingAmount = finalAmount - req.body.coinsToUse;
            if (remainingAmount <= 0) {
              // All paid by coins, mark as paid
              if (order.status === 'paid') {
                return this.sendError(res, 'Order already paid', 400);
              }
              order.status = 'paid';
              await order.save();
              // Add reward coins for the final amount (discount amount as reward)
              logger.info(`Adding reward coins for hybrid event payment: userId=${userId}, rewardPointsToAdd=${rewardPointsToAdd}`);
              await this.paymentService.addRewardCoinsToUser(userId, rewardPointsToAdd);
              
              // Referral reward: check if this is the user's first completed event payment
              const userOrders = await Order.find({ user: userId, status: 'paid' });
              if (userOrders.length === 1) {
                // First completed event payment
                const user = await this.userRepository.findById(userId);
                if (user && user.referredBy) {
                  // Find the referrer by referralCode
                  const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
                  if (referrer) {
                    // Give 250 coins to the referrer for first event payment
                    await this.userRepository.update(referrer._id.toString(), { $inc: { coins: 250 } });
                  }
                }
              }
              const payment = await Payment.create({
                userId: userId,
                amount: finalAmount,
                type: 'event',
                status: 'completed',
                paymentMethod: 'wallet',
                orderId: order._id,
                rewardPointsDeducted
              });
              // Only generate tickets for event payments
              if (orderType === 'event' && order.status === 'paid') {
                const tickets = [];
                const eventDoc = await Event.findById(order.event);
                for (const ticket of order.tickets) {
                  const ticketTier = await TicketTier.findById(ticket.ticketTierId);
                  const tempTicketId = new mongoose.Types.ObjectId();
                  const qrPayload =
                    '==============================\n' +
                    '  🎟️  CityFeed Event Ticket  🎟️\n' +
                    '==============================\n' +
                    `Event: ${eventDoc?.name || ''}\n` +
                    `Date: ${eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : ''}\n` +
                    `Venue: ${eventDoc?.venue?.name || ''}\n` +
                    `Ticket Type: ${ticketTier ? ticketTier.name : ''}\n` +
                    `Admits: ${ticket.quantity}\n` +
                    `Status: Active\n` +
                    '------------------------------\n' +
                    'Show this QR code at entry.\n' +
                    'Enjoy the event!\n' +
                    '==============================';
                  const qrBuffer = await QRCode.toBuffer(qrPayload);
                  const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                      { resource_type: 'image', folder: 'tickets' },
                      (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                      }
                    );
                    stream.end(qrBuffer);
                  });
                  const qrCodeUrl = (uploadResult as any).secure_url;
                  const ticketDoc = await Ticket.create({
                    _id: tempTicketId,
                    orderId: order._id,
                    userId: userId,
                    eventId: order.event,
                    ticketTierId: ticket.ticketTierId,
                    qrCodeUrl,
                    quantity: ticket.quantity,
                    status: 'active',
                    issuedAt: new Date()
                  });
                  tickets.push({
                    _id: ticketDoc._id,
                    ticketTierId: ticket.ticketTierId,
                    ticketTierName: ticketTier ? ticketTier.name : '',
                    qrCodeUrl,
                    quantity: ticket.quantity,
                    status: ticketDoc.status,
                    issuedAt: ticketDoc.issuedAt
                  });
                }
                for (const ticket of order.tickets) {
                  if (ticket.ticketTierId) {
                    await TicketTier.findByIdAndUpdate(
                      ticket.ticketTierId,
                      { $inc: { soldCount: ticket.quantity } }
                    );
                  }
                }
                if (!order.tickets.some(t => t.ticketTierId)) {
                  await Event.findByIdAndUpdate(
                    order.event,
                    { $inc: { totalSoldCount: order.tickets.reduce((sum, t) => sum + t.quantity, 0) } }
                  );
                }
                const emailService = new EmailService();
                await emailService.sendTicketEmail({
                  to: user.email,
                  event: {
                    name: eventDoc?.name || '',
                    date: eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : '',
                    venue: eventDoc?.venue?.name || ''
                  },
                  tickets: tickets.map(t => ({ qrCodeUrl: t.qrCodeUrl, ticketTierName: t.ticketTierName, quantity: t.quantity })),
                  userName: user.name || '',
                  startTime: eventDoc?.startTime || '',
                  endTime: eventDoc?.endTime || ''
                });
                if (user.phone) {
                  const formattedPhone = formatIndianPhoneNumber(user.phone);
                  const waMessage = `🎟️ CityFeed Event Ticket 🎟️\nEvent: ${eventDoc?.name}\nDate: ${eventDoc?.date?.toISOString().split('T')[0]}\nVenue: ${eventDoc?.venue?.name}\nShow this QR code at entry. Enjoy the event!`;
                  for (const t of tickets) {
                    console.log(`Sending WhatsApp to: ${formattedPhone}, QR: ${t.qrCodeUrl}`);
                    await sendWhatsAppMessage(
                      formattedPhone,
                      `${waMessage}\nTicket Type: ${t.ticketTierName}\nAdmits: ${t.quantity}`,
                      t.qrCodeUrl
                    );
                  }
                }
                return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, rewardPointsDeducted, tickets }, 'Payment successful');
              }
              return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, rewardPointsDeducted }, 'Payment successful');
            } else {
              // Create Razorpay order for remaining amount
              const razorpayOrder = await this.paymentService.createRazorpayOrder(remainingAmount, userId, orderId, 'event');
              const payment = await Payment.create({
                userId: userId,
                amount: remainingAmount,
                type: 'event',
                status: 'pending',
                paymentMethod: 'razorpay',
                orderId: order._id
              });
              return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, razorpayOrder }, 'Hybrid payment: coins deducted, pay remaining via Razorpay.');
            }
          }
        } // <-- close hybrid payment if block
        return this.sendError(res, 'Invalid payment method', 400);
      } else {
        return this.sendError(res, 'Invalid order type', 400);
      }
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public initiateMembershipPayment = async (req: Request, res: Response) => {
    try {
      const { email, membershipType } = req.body;
      if (!email || !membershipType || !MEMBERSHIP_PRICES[membershipType]) {
        return res.status(400).json({ message: 'Invalid email or membership type' });
      }
      const amount = MEMBERSHIP_PRICES[membershipType] * 100; // paise
      const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `membership_${Date.now()}`,
        notes: { email, membershipType },
        payment_capture: true,
      });
      await PreRegistrationPayment.create({
        email,
        membershipType,
        amount: MEMBERSHIP_PRICES[membershipType],
        razorpayOrderId: order.id,
        status: 'pending',
      });
      res.json({ orderId: order.id, amount, currency: 'INR', key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
      logger.error('initiateMembershipPayment error:', error);
      res.status(500).json({ message: 'Failed to initiate payment' });
    }
  };

  public verifyMembershipPayment = async (req: Request, res: Response) => {
    try {
      const { orderId, paymentId } = req.body;
      if (!orderId || !paymentId) {
        return res.status(400).json({ message: 'Order ID and Payment ID are required' });
      }
      // Fetch payment from Razorpay
      const payment = await razorpay.payments.fetch(paymentId);
      if (payment.order_id !== orderId || payment.status !== 'captured') {
        return res.status(400).json({ message: 'Payment not successful' });
      }
      // Mark pre-registration payment as success
      await PreRegistrationPayment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { status: 'success' }
      );
      res.json({ success: true });
    } catch (error) {
      logger.error('verifyMembershipPayment error:', error);
      res.status(500).json({ message: 'Failed to verify payment' });
    }
  };

  /**
   * @swagger
   * /api/payments/outlet/:outletId/history:
   *   get:
   *     summary: Get outlet's dine-in payment history
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: outletId
   *         required: true
   *         schema:
   *           type: string
   *         description: Outlet ID
   *     responses:
   *       200:
   *         description: Outlet's dine-in payment history retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getOutletDineInHistory = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return this.sendError(res, 'User not authenticated', 401);
    }
    try {
      const outletId = req.params.outletId;
      if (!outletId) {
        return this.sendError(res, 'Outlet ID is required', 400);
      }
      const history = await this.paymentService.getOutletDineInHistory(outletId);
      this.sendSuccess(res, history);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public merchantDineInPayment = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();
    let transactionFinished = false;
    let payment = null;
    let allowedDiscount = 0;
    let user = null;
    let billAmount, outletId;
    try {
      session.startTransaction();
      const startTime = Date.now();
      logger.info(`[merchantDineInPayment] Start: ${startTime}`);
      logger.info(`[merchantDineInPayment] Step: Parse body - ${Date.now() - startTime}ms`);
      const { phone, outletId: outletIdRaw, billAmount: billAmountRaw, coinsToUse, cashAmount, otp, paymentMethod, maxDiscountPercentage } = req.body;
      billAmount = billAmountRaw;
      outletId = outletIdRaw;
      if (!phone || !outletId || !billAmount) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'phone, outletId, and billAmount are required', 400);
      }
      logger.info(`[merchantDineInPayment] Step: Fetch user - ${Date.now() - startTime}ms`);
      user = await this.paymentService.getUserByPhone(phone);
      if (!user) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'User not found', 404);
      }
      logger.info(`[merchantDineInPayment] Step: Fetch offers - ${Date.now() - startTime}ms`);
      const offerService = new OfferService();
      const activeOffers = await offerService.getOffersByOutlet(outletId);
      const now = new Date();
      const validOffers = activeOffers.filter(offer => offer.isActive && new Date(offer.validFrom) <= now && new Date(offer.validTo) >= now);
      if (!validOffers.length) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'No active offers found for this outlet', 400);
      }
      logger.info(`[merchantDineInPayment] Step: Offer validation - ${Date.now() - startTime}ms`);
      const maxOfferDiscount = Math.max(...validOffers.map(o => o.discountPercentage));
      if (maxOfferDiscount !== maxDiscountPercentage) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'Something went wrong. Discount mismatch.', 400);
      }
      const membershipType = user.membershipType;
      if (membershipType === 'cityfeed_prime') {
        allowedDiscount = Math.round(maxOfferDiscount * (config.merchantDiscountPercentages.cityfeed_prime / 100));
      } else if (membershipType === 'cityfeed_edge') {
        allowedDiscount = Math.round(maxOfferDiscount * (config.merchantDiscountPercentages.cityfeed_edge / 100));
      } else if (membershipType === 'cityfeed_select') {
        allowedDiscount = Math.round(maxOfferDiscount * (config.merchantDiscountPercentages.cityfeed_select / 100));
      } else {
        allowedDiscount = 0;
      }
      logger.info(`[merchantDineInPayment] Step: Membership/discount logic - ${Date.now() - startTime}ms`);
      const outlet = await Outlet.findById(outletId);
      if (!outlet) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'Outlet not found', 404);
      }
      const merchantId = req.user?._id?.toString();
      const isSuperAdmin = req.user?.role === 'super_admin';
      const isOutletAdmin = req.user?.role === 'outlet_admin';
      let allowed = false;
      if (isSuperAdmin && outlet.createdBy?.toString() === merchantId) {
        allowed = true;
      } else if (isOutletAdmin && outlet.assignedAdmin?.toString() === merchantId) {
        allowed = true;
      } else {
        const assignment = await OutletRoleAssignment.findOne({ outlet: outletId, isDeleted: { $ne: true }, email: req.user.email });
        if (assignment) allowed = true;
      }
      if (!allowed) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'You are not authorized to process payment for this outlet.', 403);
      }
      logger.info(`[merchantDineInPayment] Step: Merchant permission check - ${Date.now() - startTime}ms`);
      if (coinsToUse && coinsToUse > 0) {
        if (user.coins < coinsToUse) {
          await session.abortTransaction();
          transactionFinished = true;
          return this.sendError(res, 'Insufficient coins', 402);
        }
      }
      if (coinsToUse && coinsToUse > 0) {
        if (!otp) {
          await this.paymentService.sendOTP(user.phone);
          otpSentMap[user.phone] = Date.now();
          await session.abortTransaction();
          transactionFinished = true;
          return res.status(200).json({
            success: true,
            data: {
              status: 'otp_required',
              message: 'OTP sent to user phone',
              user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                coins: user.coins,
                membershipType: user.membershipType,
                isActive: user.isActive
              }
            }
          });
        } else {
          if (!otpSentMap[user.phone]) {
            await session.abortTransaction();
            transactionFinished = true;
            return this.sendError(res, 'OTP not requested for this phone number. Please initiate payment first.', 400);
          }
          const isValidOTP = await this.paymentService.verifyOTP(user.phone, otp);
          if (!isValidOTP) {
            delete otpSentMap[user.phone];
            await session.abortTransaction();
            transactionFinished = true;
            return this.sendError(res, 'Invalid OTP', 400);
          }
          delete otpSentMap[user.phone];
        }
      }
      logger.info(`[merchantDineInPayment] Step: OTP logic - ${Date.now() - startTime}ms`);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const alreadyPaid = await this.paymentService.hasExistingMerchantDineInPayment(user._id.toString(), outletId, billAmount, fiveMinutesAgo);
      if (alreadyPaid) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendSuccess(res, { status: 'already_paid', message: 'Payment already completed for this user and bill.' });
      }
      if (coinsToUse && coinsToUse > 0) {
        user.coins -= coinsToUse;
        await user.save({ session });
      }
      logger.info(`[merchantDineInPayment] Step: Coin deduction - ${Date.now() - startTime}ms`);
      payment = await this.paymentService.recordMerchantDineInPayment({
        userId: user._id.toString(),
        outletId,
        billAmount,
        coinsUsed: coinsToUse || 0,
        cashAmount: cashAmount || 0,
        merchantId: req.user?._id || null,
        paymentMethod: paymentMethod || null,
        session
      });
      if (!payment) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'Failed to record payment', 500);
      }
      logger.info(`[merchantDineInPayment] Step: Payment record - ${Date.now() - startTime}ms`);
      await session.commitTransaction();
      transactionFinished = true;
      logger.info(`[merchantDineInPayment] End: ${Date.now() - startTime}ms`);
    } catch (error) {
      if (!transactionFinished) {
        try { await session.abortTransaction(); transactionFinished = true; } catch (e) {}
      }
      logger.error('merchantDineInPayment error:', error);
      this.handleError(res, error as Error);
      return;
    } finally {
      session.endSession();
    }
    // Reward logic OUTSIDE transaction
    try {
      const { rewardPointsToAdd } = await this.paymentService.calculateDiscount(
        user._id.toString(),
        billAmount,
        outletId,
        undefined,
        allowedDiscount
      );
      await this.paymentService.addRewardCoinsToUser(user._id.toString(), rewardPointsToAdd);
      logger.info(`[merchantDineInPayment] Step: Reward logic (outside txn)`);
    } catch (rewardError) {
      logger.error('Error in reward logic (outside txn):', rewardError);
    }
    return this.sendSuccess(res, { status: 'success', message: 'Payment processed successfully', payment });
  };
} 