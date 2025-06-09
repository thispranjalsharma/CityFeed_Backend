import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentService } from '../services/payment.service';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../interfaces/auth.interface';
import { PaymentRepository } from '../repositories/payment.repository';

/**
 * @swagger
 * components:
 *   schemas:
 *     DineInPaymentRequest:
 *       type: object
 *       required:
 *         - merchantId
 *         - offerId
 *         - totalBill
 *       properties:
 *         merchantId:
 *           type: string
 *           description: ID of the merchant
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
 *           description: Amount to recharge
 *     VerifyRechargeRequest:
 *       type: object
 *       required:
 *         - paymentId
 *         - razorpay_order_id
 *         - razorpay_payment_id
 *         - razorpay_signature
 *       properties:
 *         paymentId:
 *           type: string
 *           description: ID of the payment
 *         razorpay_order_id:
 *           type: string
 *           description: Razorpay order ID
 *         razorpay_payment_id:
 *           type: string
 *           description: Razorpay payment ID
 *         razorpay_signature:
 *           type: string
 *           description: Razorpay signature
 */

export class PaymentController extends BaseController {
  private paymentService: PaymentService;
  private paymentRepository: PaymentRepository;

  constructor() {
    super();
    this.paymentService = new PaymentService();
    this.paymentRepository = new PaymentRepository();
  }

  createOrder = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { amount, currency = 'INR' } = req.body;
      const order = await this.paymentService.createOrder(userId, amount);
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

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const result = await this.paymentService.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      this.sendSuccess(res, result, 'Payment verified successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/dine-in:
   *   post:
   *     summary: Process dine-in payment
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DineInPaymentRequest'
   *     responses:
   *       200:
   *         description: Payment processed successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   *       402:
   *         description: Insufficient coins
   */
  processDineInPayment = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { merchantId, offerId, totalBill } = req.body;
      const result = await this.paymentService.processDineInPayment({
        userId,
        merchantId,
        offerId,
        totalBill
      });

      if (result.status === 'insufficient_coins') {
        return this.sendSuccess(res, {
          status: 'insufficient_coins',
          message: 'Insufficient coins. Please recharge your wallet.',
          requiredCoins: result.requiredCoins,
          currentCoins: result.currentCoins,
          finalAmount: result.finalAmount,
          paymentId: result._id,
          orderDetails: result.orderDetails
        });
      }

      this.sendCreated(res, result, 'Payment processed successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/recharge:
   *   post:
   *     summary: Create recharge order
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
   *       400:
   *         description: Invalid amount
   *       401:
   *         description: Unauthorized
   */
  createRechargeOrder = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return this.sendError(res, 'Invalid amount', 400);
      }

      // Create a pending payment record
      const payment = await this.paymentRepository.create({
        userId,
        amount,
        type: 'recharge',
        status: 'pending'
      });

      // Create Razorpay order
      const order = await this.paymentService.createOrder(userId, amount);

      this.sendSuccess(res, {
        paymentId: payment._id,
        orderDetails: order
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/verify:
   *   post:
   *     summary: Verify recharge payment
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
   *         description: Payment verified and processed successfully
   *       400:
   *         description: Invalid payment data
   *       401:
   *         description: Unauthorized
   */
  verifyRecharge = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      // Verify the payment
      const payment = await this.paymentService.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      // Process the payment and add coins
      const transaction = await this.paymentService.processPayment(
        userId,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
      );

      // Update payment status
      await this.paymentRepository.update(paymentId, {
        status: 'completed',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date()
      });

      this.sendSuccess(res, {
        status: 'success',
        message: 'Wallet recharged successfully',
        transaction
      });
    } catch (error) {
      this.handleError(res, error as Error);
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
      this.sendSuccess(res, transactions);
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

  getMerchantDineInHistory = async (req: AuthRequest, res: Response) => {
    try {
      const merchantId = req.user?._id?.toString();
      if (!merchantId) {
        return this.sendError(res, 'Merchant not authenticated', 401);
      }

      const history = await this.paymentService.getMerchantDineInHistory(merchantId);
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

      this.sendSuccess(res, transaction);
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

  getMerchantPayments = async (req: AuthRequest, res: Response) => {
    try {
      const merchantId = req.user?._id?.toString();
      if (!merchantId) {
        return this.sendError(res, 'Merchant not authenticated', 401);
      }

      const payments = await this.paymentRepository.findByMerchant(merchantId);
      this.sendSuccess(res, payments);
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
} 