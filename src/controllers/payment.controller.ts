import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentService } from '../services/payment.service';
import { AppErrorClass } from '../utils/appError';
import { AuthRequest } from '../interfaces/auth.interface';
import { PaymentRepository } from '../repositories/payment.repository';
import { UserRepository } from '../repositories/user.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
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
      this.dineInSessionRepository
    );
  }

  // Refactored methods from arrow functions to class methods
  async createOrder(req: AuthRequest, res: Response) {
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
  }

  async verifyPayment(req: AuthRequest, res: Response) {
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
  }

  /**
   * @swagger
   * /api/payments/dinein:
   *   post:
   *     summary: Process dine-in payment using coins
   *     description: |
   *       Process a dine-in payment using wallet coins.
   *       If coins are used, an OTP will be sent to the user's phone number for verification.
   *     tags: [Payments]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               coinsToUse:
   *                 type: number
   *                 description: Number of coins to use
   *               otp:
   *                 type: string
   *                 description: OTP for verification (required if using coins)
   *     responses:
   *       200:
   *         description: Payment processed successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       402:
   *         description: Insufficient coins
   *       404:
   *         description: User not found
   */
  async processDineInPayment(req: AuthRequest, res: Response) {
    return this.sendError(res, 'This feature is now handled by the merchant. Please contact the outlet admin or staff for payment.', 403);
    // Disabled: old user-initiated dine-in payment logic below
    // try {
    //   const userId = req.user?._id?.toString();
    //   if (!userId) {
    //     return this.sendError(res, 'User not authenticated', 401);
    //   }

    //   const {
    //     outletId,
    //     offerId,
    //     totalBill,
    //     paymentMethod,
    //     coinsToUse,
    //     otp
    //   } = req.body;

    //   // Process the payment
    //   const result = await this.paymentService.processDineInPayment({
    //     userId: req.user?._id.toString(),
    //     outletId,
    //     offerId,
    //     totalBill,
    //     paymentMethod,
    //     coinsToUse,
    //     otp
    //   });

    //   // Check if result is an OTPRequiredResponse
    //   if ('status' in result && result.status === 'otp_required') {
    //     return this.sendSuccess(res, result, 'OTP has been sent to your phone number');
    //   }

    //   // Check if result is an InsufficientCoinsResponse
    //   if ('status' in result && result.status === 'insufficient_coins') {
    //     return this.sendError(res, 'Insufficient coins', 402);
    //   }

    //   this.sendSuccess(res, result, 'Payment processed successfully');
    // } catch (error) {
    //   this.handleError(res, error as Error);
    // }
  }

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
  async createRechargeOrder(req: AuthRequest, res: Response) {
    return this.sendError(res, 'This feature is now handled by the merchant. Please contact the outlet admin or staff for payment.', 403);
    // Disabled: old recharge logic below
    // try {
    //   const userId = req.user?._id?.toString();
    //   if (!userId) {
    //     return this.sendError(res, 'User not authenticated', 401);
    //   }

    //   const { amount } = req.body;
    //   if (!amount || amount < 1) {
    //     return this.sendError(res, 'Invalid amount. Minimum amount is ₹1', 400);
    //   }

    //   const order = await this.paymentService.createRechargeOrder(userId, amount);
    //   this.sendSuccess(res, order);
    // } catch (error) {
    //   this.handleError(res, error as Error);
    // }
  }

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
  async verifyRecharge(req: AuthRequest, res: Response) {
    return this.sendError(res, 'This feature is now handled by the merchant. Please contact the outlet admin or staff for payment.', 403);
    // Disabled: old verify recharge logic below
    // try {
    //   const userId = req.user?._id?.toString();
    //   if (!userId) {
    //     this.sendError(res, 'User not authenticated', 401);
    //     return;
    //   }

    //   const { orderId } = req.body;
    //   if (!orderId) {
    //     this.sendError(res, 'Order ID is required', 400);
    //     return;
    //   }

    //   // Verify payment and get result
    //   const result = await this.paymentService.verifyPayment(orderId);

    //   // Get updated user data
    //   const user = await this.paymentService.getUserById(userId);
    //   if (!user) {
    //     this.sendError(res, 'User not found', 404);
    //     return;
    //   }

    //   this.sendSuccess(res, {
    //     amount: result.amount,
    //     coins: user.coins
    //   }, 'Wallet recharged successfully');
    // } catch (error) {
    //   logger.error('Error verifying recharge:', error);
    //   if (error instanceof AppErrorClass) {
    //     this.sendError(res, error.message, error.statusCode);
    //     return;
    //   }
    //   this.sendError(res, 'Failed to verify payment', 500);
    // }
  }

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
  async getTransactionHistory(req: AuthRequest, res: Response) {
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
  }

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
  async getDineInHistory(req: AuthRequest, res: Response) {
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
  }

  async getTransactionById(req: AuthRequest, res: Response) {
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
  }

  async createPayment(req: AuthRequest, res: Response) {
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
  }

  async getUserPayments(req: AuthRequest, res: Response) {
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
  }

  async getPaymentById(req: AuthRequest, res: Response) {
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
  }

  async updatePayment(req: AuthRequest, res: Response) {
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
  }

  async deletePayment(req: AuthRequest, res: Response) {
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
  }

  
  async getUserPaymentHistory(req: AuthRequest, res: Response) {
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
  }

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
  async initiateDirectPayment(req: AuthRequest, res: Response) {
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
      const { Order } = require('../models/order.model');
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
      let amount = 0;
      if (order.totalAmount) {
        amount = order.totalAmount;
      } else if (order.tickets && Array.isArray(order.tickets)) {
        amount = order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0);
      }
      // Create Razorpay order
      const razorpayOrder = await this.paymentService.createRazorpayOrder(amount, userId, orderId, 'event');
      // Create pending payment record
      const { Payment } = require('../models/payment.model');
      const payment = await Payment.create({
        userId: userId,
        amount: amount,
        type: 'event',
        status: 'pending',
        paymentMethod: 'razorpay',
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id
      });
      return this.sendSuccess(res, { order, payment, amount, razorpayOrder }, 'Event direct payment initiated. Complete payment via Razorpay.');
    } catch (error) {
      let errorMsg = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? (error as any).message
          : JSON.stringify(error);
      console.error('Direct payment initiation error:', errorMsg, error);
      this.sendError(res, errorMsg, 400);
    }
  }

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
  async verifyDirectPayment(req: AuthRequest, res: Response) {
    if (!req.user) {
      return this.sendError(res, 'User not authenticated', 401);
    }
    try {
      const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
      if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return this.sendError(res, 'orderId, razorpayPaymentId, razorpayOrderId, and razorpaySignature are required', 400);
      }
      // Fetch the payment record
      const { Payment } = require('../models/payment.model');
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
      const { Order } = require('../models/order.model');
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'paid';
        await order.save();
      }
      // Issue tickets, send emails, etc. (reuse existing logic if needed)
      return this.sendSuccess(res, { status: 'completed', amount: payment.amount }, 'Payment verified successfully');
    } catch (error) {
      if (error instanceof AppErrorClass) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      let errorMsg = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? (error as any).message
          : JSON.stringify(error);
      console.error('Direct payment verification error:', errorMsg, error);
      this.sendError(res, errorMsg, 400);
    }
  }

  async processUnifiedPayment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }
      const { orderType, orderId, paymentMethod, coinsToUse, otp } = req.body;
      if (!orderType || !orderId || !paymentMethod) {
        return this.sendError(res, 'orderType, orderId, and paymentMethod are required', 400);
      }
      if (orderType === 'dine-in') {
        // Fetch the session by orderId
        const { DineInSession } = require('../models/dineInSession.model');
        const session = await DineInSession.findById(orderId);
        if (!session) return this.sendError(res, 'Dine-in session not found', 404);
        // Set required fields for processDineInPayment
        req.body.outletId = session.outletId;
        req.body.offerId = session.offerId;
        req.body.totalBill = session.totalBill;
        return this.processDineInPayment(req, res);
      } else if (orderType === 'event') {
        // For event, process event order payment
        const { Order } = require('../models/order.model');
        const { User } = require('../models/user.model');
        const { Payment } = require('../models/payment.model');
        const order = await Order.findById(orderId);
        if (!order) return this.sendError(res, 'Order not found', 404);
        if (order.user.toString() !== userId) {
          // For guest users, allow if order is pending and user is guest
          if (!(req.user.isGuest && order.status === 'pending')) {
            return this.sendError(res, 'Unauthorized: You can only pay for your own event order.', 403);
          }
        }
        if (order.status === 'paid') return this.sendError(res, 'Order already paid', 400);
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
          const amount = order.totalAmount || (order.tickets && Array.isArray(order.tickets) ? order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0) : 0);
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
        if (order.totalAmount) {
          amount = order.totalAmount;
        } else if (order.tickets && Array.isArray(order.tickets)) {
          amount = order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0);
        }
        // Apply membership discount
        const { discountAmount, finalAmount } = await this.paymentService.calculateDiscount(userId, amount);

        // Reward points and OTP logic for event (mirroring dine-in)
        let remainingBill = finalAmount;
        let coinsDeducted = 0;
        let razorpayOrder = null;
        let payment = null;
        if (coinsToUse && coinsToUse > 0) {
          // OTP verification
          if (otp) {
            const isValidOTP = await this.paymentService.verifyOTP(user.phone, otp);
            if (!isValidOTP) {
              return this.sendError(res, 'Invalid OTP', 400);
            }
          } else {
            await this.paymentService.sendOTP(user.phone);
            return this.sendSuccess(res, { status: 'otp_required', message: 'OTP has been sent to your phone number', finalAmount }, 'OTP required');
          }
          // Use coins with limit enforcement
          try {
            const result = await this.paymentService.useCoins(userId, finalAmount, coinsToUse);
            coinsDeducted = result.coinsDeducted;
            remainingBill = result.remainingBill;
          } catch (err) {
            return this.sendError(res, err.message || 'Failed to use coins', 400);
          }
        } else {
          remainingBill = finalAmount;
        }
        // Hybrid payment: coins + Razorpay
        if (paymentMethod === 'razorpay') {
          if (remainingBill > 0) {
            razorpayOrder = await this.paymentService.createRazorpayOrder(remainingBill, userId, orderId, 'event');
            // Create pending payment record
            payment = await Payment.create({
              userId: userId,
              amount: remainingBill,
              type: 'event',
              status: 'pending',
              paymentMethod: 'razorpay',
              orderId: order._id,
              razorpayOrderId: razorpayOrder.id,
              coinsDeducted
            });
            return this.sendSuccess(res, { order, payment, coinsDeducted, amount: remainingBill, razorpayOrder }, 'Hybrid event payment initiated. Complete payment via Razorpay.');
          } else {
            // All paid by coins
            order.status = 'paid';
            await order.save();
            payment = await Payment.create({
              userId: userId,
              amount: 0,
              type: 'event',
              status: 'completed',
              paymentMethod: 'wallet',
              orderId: order._id,
              coinsDeducted
            });
            return this.sendSuccess(res, { order, payment, coinsDeducted, amount: 0 }, 'Event payment completed fully with coins.');
          }
        }

        if (paymentMethod === 'wallet') {
          if (user.coins < finalAmount) return this.sendError(res, 'Insufficient wallet coins', 402);
          user.coins -= finalAmount;
          order.status = 'paid';
          await user.save();
          await order.save();
          const payment = await Payment.create({
            userId: userId,
            amount: finalAmount,
            type: 'event',
            status: 'completed',
            paymentMethod: paymentMethod, // If not in enum, update schema
            orderId: order._id,
            coinsDeducted
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
              const tempTicketId = new (require('mongoose')).Types.ObjectId();
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
              tickets: tickets.map(t => ({ qrCodeUrl: t.qrCodeUrl, ticketTierName: t.ticketTierName, quantity: t.quantity }))
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
            return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, coinsDeducted, tickets }, 'Payment successful');
          }
          return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, coinsDeducted }, 'Payment successful');
        } else if (paymentMethod === 'rewardPoints') {
          // Only allow if the full amount is covered by reward points
          if (remainingBill > 0) return this.sendError(res, 'Not enough reward points to cover the full amount', 400);
          order.status = 'paid';
          await user.save();
          await order.save();
          const payment = await Payment.create({
            userId: userId,
            amount: finalAmount,
            type: 'event',
            status: 'completed',
            paymentMethod: paymentMethod, // If not in enum, update schema
            orderId: order._id,
            coinsDeducted
          });
          return this.sendSuccess(res, { order, payment, discountAmount, finalAmount, coinsDeducted }, 'Payment successful');
        } else {
          return this.sendError(res, 'Invalid payment method', 400);
        }
      } else {
        return this.sendError(res, 'Invalid order type', 400);
      }
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  async initiateMembershipPayment(req: Request, res: Response) {
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
  }

  async verifyMembershipPayment(req: Request, res: Response) {
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
  }

  async getOutletDineInHistory(req: AuthRequest, res: Response) {
    if (!req.user) {
      return this.sendError(res, 'User not authenticated', 401);
    }
    try {
      const outletId = req.params.outletId;
      if (!outletId) {
        return this.sendError(res, 'Outlet ID is required', 400);
      }
      // Check if merchant is allowed to process payment for this outlet
      const { Outlet } = require('../models/outlet.model');
      const { OutletRoleAssignment } = require('../models/outletRoleAssignment.model');
      const outlet = await Outlet.findById(outletId);
      if (!outlet) {
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
        // Check for employee/role assignment
        const assignment = await OutletRoleAssignment.findOne({ outlet: outletId, isDeleted: { $ne: true }, email: req.user.email });
        if (assignment) allowed = true;
      }
      if (!allowed) {
        return this.sendError(res, 'You are not authorized to view payment history for this outlet.', 403);
      }
      const history = await this.paymentService.getOutletDineInHistory(outletId);
      this.sendSuccess(res, history);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  async merchantDineInPayment(req: AuthRequest, res: Response) {
    try {
      const { phone, outletId, billAmount, coinsToUse, cashAmount, otp, resendOtp } = req.body;
      if (!phone || !outletId || !billAmount) {
        return this.sendError(res, 'phone, outletId, and billAmount are required', 400);
      }
      // Fetch user by phone
      const user = await this.paymentService.getUserByPhone(phone);
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }
      // Step 1: If coinsToUse > 0, verify user has enough coins
      if (coinsToUse && coinsToUse > 0) {
        if (user.coins < coinsToUse) {
          return this.sendError(res, 'Insufficient coins', 402);
        }
      }
      // Step 2: OTP verification for coins usage
      if (coinsToUse && coinsToUse > 0) {
        if (resendOtp) {
          await this.paymentService.sendOTP(user.phone);
          return this.sendSuccess(res, { status: 'otp_required', message: 'OTP resent to user phone', user });
        }
        if (!otp) {
          // Send OTP to user
          await this.paymentService.sendOTP(user.phone);
          return this.sendSuccess(res, { status: 'otp_required', message: 'OTP sent to user phone', user });
        } else {
          // Verify OTP
          const isValidOTP = await this.paymentService.verifyOTP(user.phone, otp);
          if (!isValidOTP) {
            return this.sendError(res, 'Invalid OTP', 400);
          }
        }
      }
      // Step 3: Deduct coins and record payment
      if (coinsToUse && coinsToUse > 0) {
        await this.paymentService.deductCoins(user._id.toString(), coinsToUse);
      }
      // Record payment (add a new method for merchant payment in paymentService)
      await this.paymentService.recordMerchantDineInPayment({
        userId: user._id.toString(),
        outletId,
        billAmount,
        coinsUsed: coinsToUse || 0,
        cashAmount: cashAmount || 0,
        merchantId: req.user?._id || null
      });
      this.sendSuccess(res, { status: 'success', message: 'Payment processed successfully' });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }
} 