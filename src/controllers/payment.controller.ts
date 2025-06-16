import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { PaymentService } from '../services/payment.service';
import { AppErrorClass } from '../middleware/error.middleware';
import { AuthRequest } from '../interfaces/auth.interface';
import { PaymentRepository } from '../repositories/payment.repository';
import { UserRepository } from '../repositories/user.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';

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
   *     summary: Process dine-in payment using wallet coins
   *     description: |
   *       Process a dine-in payment using wallet coins.
   *       This endpoint is ONLY for wallet payments using coins.
   *       For direct Razorpay payments (without using coins), use the /api/payments/direct/initiate endpoint.
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

      const { merchantId, offerId, totalBill, paymentMethod } = req.body;
      
      // Strictly enforce wallet payments only
      if (paymentMethod && paymentMethod !== 'wallet') {
        return this.sendError(res, 'This endpoint is only for wallet payments. Use /api/payments/direct/initiate for Razorpay payments.', 400);
      }

      // Process the payment
      const payment = await this.paymentService.processPayment(userId, totalBill, merchantId, 'wallet');

      // Update dine-in session status to completed
      const activeSession = await this.dineInSessionRepository.findActiveSession(userId, merchantId);
      if (activeSession) {
        const sessionId = activeSession._id.toString();
        const paymentId = payment._id.toString();
        
        await this.dineInSessionRepository.update(sessionId, {
          status: 'completed',
          endTime: new Date(),
          totalBill,
          paymentId
        });
      }

      this.sendCreated(res, payment, 'Payment processed successfully');
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
      console.error('Error verifying recharge:', error);
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

      if (req.user?.role !== 'merchant') {
        return this.sendError(res, 'Only merchants can access this endpoint', 403);
      }

      const history = await this.paymentService.getMerchantDineInHistory(merchantId);
      if (!history) {
        return this.sendSuccess(res, [], 'No dine-in history found');
      }

      this.sendSuccess(res, history);
    } catch (error) {
      console.error('Error in getMerchantDineInHistory:', error);
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
   *               - merchantId
   *               - offerId
   *               - totalBill
   *             properties:
   *               merchantId:
   *                 type: string
   *                 description: ID of the merchant
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
    // Temporarily disabled direct payment feature
    return this.sendError(res, 'Direct payment feature is currently disabled', 503);
    
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, 'User not authenticated', 401);
      }

      // Ensure this is a direct payment
      if (req.body.paymentMethod && req.body.paymentMethod !== 'razorpay') {
        return this.sendError(res, 'This endpoint is only for direct Razorpay payments. Use /api/payments/dine-in for wallet payments.', 400);
      }

      const result = await this.paymentService.initiateDirectPayment({
        userId,
        ...req.body
      });

      this.sendSuccess(res, result, 'Payment initiated successfully');
    } catch (error) {
      this.handleError(res, error as Error);
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
    // Temporarily disabled direct payment feature
    return this.sendError(res, 'Direct payment feature is currently disabled', 503);
    
    try {
      const { orderId } = req.body;
      const result = await this.paymentService.verifyDirectPayment(orderId);
      this.sendSuccess(res, result, 'Payment verified successfully');
    } catch (error) {
      if (error instanceof AppErrorClass) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      this.handleError(res, error as Error);
    }
  };
} 