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
import { RewardHistoryRepository } from '../repositories/rewardHistory.repository';
import Razorpay from 'razorpay';
import { PreRegistrationPayment } from '../models/preRegistrationPayment.model';
import { logger } from '../utils/logger.util';
import { config } from '../config/config';
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

import { io, activeBookingSessions } from '../server';
import mongoose from 'mongoose';
import { Outlet } from '../models/outlet.model';
import { Staff } from '../models/staff.model';
import { OfferService } from '../services/offer.service';
import { generateDineInSummaryPDF } from '../utils/pdf.util';
import { performanceMonitor } from '../utils/performance.util';
import { updateTicketTierSoldCount, updateEventTotalSoldCount } from '../utils/ticketTier.util';

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
 *           enum: [recharge, dine-in, refund, membership_purchase, event]
 *           description: Payment type - membership_purchase for registration payments
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         paymentMethod:
 *           type: string
 *           enum: [wallet, razorpay, upi, cash, card]
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
  private rewardHistoryRepository: RewardHistoryRepository;

  constructor() {
    super();
    this.paymentRepository = new PaymentRepository();
    this.userRepository = new UserRepository();
    this.dineInSessionRepository = new DineInSessionRepository();
    this.rewardHistoryRepository = new RewardHistoryRepository();
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

      const { amount } = req.body;
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
   *       If reward points are requested, an OTP will be sent to the user's phone number and email.
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

      // Get payment transactions
      const transactions = await this.paymentService.getTransactionHistory(userId);
      
      // Get reward history transactions
      const rewardTransactions = await this.rewardHistoryRepository.find({ userId });
      
      // Combine and sort all transactions by date
      const allTransactions = [
        ...transactions.map((txn: any) => ({
          ...txn.toObject(),
          transactionType: 'payment',
          originalType: txn.type
        })),
        ...rewardTransactions.map((reward: any) => ({
          _id: reward._id,
          userId: reward.userId,
          type: 'reward',
          amount: reward.amount,
          transactionType: reward.transactionType,
          sourceType: reward.sourceType,
          description: reward.description,
          balanceBefore: reward.balanceBefore,
          balanceAfter: reward.balanceAfter,
          createdAt: reward.createdAt,
          updatedAt: reward.updatedAt,
          originalType: 'reward'
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // Enrich transactions with additional details
      const enrichedTransactions = await Promise.all(
        allTransactions.map(async (txn: any) => {
          let dineInSessionId = txn.dineInSessionId || null;
          
          // Only process payment transactions for dine-in enrichment
          if (txn.transactionType === 'payment') {
            // Handle both string and object cases for outletId and offerId
            const txnOutletId = typeof txn.outletId === 'object' && txn.outletId !== null ? txn.outletId._id?.toString() : txn.outletId?.toString();
            const txnOfferId = typeof txn.offerId === 'object' && txn.offerId !== null ? txn.offerId._id?.toString() : txn.offerId?.toString();
            if (txn.originalType === 'dine-in' && !dineInSessionId) {
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
          }

          // Get reward details and additional dine-in information
          let rewardDetails = null;
          let dineInDetails = null;
          
          // Handle reward transactions
          if (txn.transactionType === 'reward') {
            rewardDetails = [{
              transactionType: txn.transactionType,
              amount: txn.amount,
              description: txn.description,
              balanceAfter: txn.balanceAfter,
              balanceBefore: txn.balanceBefore,
              createdAt: txn.createdAt
            }];
          }
          
          // Handle dine-in payment transactions
          if (txn.transactionType === 'payment' && txn.originalType === 'dine-in') {
            try {
              // Get reward history
              const rewardHistory = await this.rewardHistoryRepository.find({
                userId: userId,
                sourceId: txn._id.toString(),
                sourceType: 'dine-in'
              });
              
              if (rewardHistory && rewardHistory.length > 0) {
                rewardDetails = rewardHistory.map((reward: any) => ({
                  transactionType: reward.transactionType,
                  amount: reward.amount,
                  description: reward.description,
                  balanceAfter: reward.balanceAfter,
                  balanceBefore: reward.balanceBefore,
                  createdAt: reward.createdAt
                }));
              }

              // Get dine-in session details for additional information
              let dineInSession = null;
              if (txn.dineInSessionId) {
                dineInSession = await this.dineInSessionRepository.findById(txn.dineInSessionId);
              } else if (dineInSessionId) {
                dineInSession = await this.dineInSessionRepository.findById(dineInSessionId);
              }

              if (dineInSession) {
                const user = await this.userRepository.findById(userId);
                const currentCoins = user?.coins || 0;
                
                // Calculate the additional dine-in fields
                const totalCoins = currentCoins + (txn.coinsUsed || 0); // Coins before dine-in
                const totalBill = dineInSession.totalBill || txn.amount; // Original bill amount
                const coinsAfterDineIn = currentCoins; // Current coins (after dine-in payment, before rewards)
                
                // Calculate final coins with rewards
                let finalCoinsWithRewards = currentCoins;
                if (rewardDetails && rewardDetails.length > 0) {
                  // Find the earned reward from this dine-in transaction
                  const earnedReward = rewardDetails.find((reward: any) => 
                    reward.transactionType === 'earned'
                  );
                  if (earnedReward && earnedReward.amount) {
                    // Calculate final coins by adding the reward amount to coins after dine-in
                    // This shows what the user's coins would be after earning rewards from this dine-in
                    finalCoinsWithRewards = coinsAfterDineIn + earnedReward.amount;
                  }
                }

                dineInDetails = {
                  totalCoins,
                  totalBill,
                  coinsAfterDineIn,
                  finalCoinsWithRewards
                };
              }
            } catch (error) {
              // Log error but don't fail the transaction
              console.error('Error fetching dine-in details:', error);
            }
          }

          // Get additional details for event transactions
          let eventDetails = null;
          let ticketDetails = null;
          
          // Check if this is an event payment transaction
          const isEventPayment = txn.transactionType === 'payment' && (txn.type === 'event' || txn.originalType === 'event') && txn.orderId;
          
          if (isEventPayment) {
            logger.info(`🎫 Processing event transaction: ${txn._id}`);
            logger.info(`🔍 Transaction fields:`, {
              type: txn.type,
              originalType: txn.originalType,
              transactionType: txn.transactionType,
              orderId: txn.orderId,
              sourceType: txn.sourceType,
              description: txn.description
            });
            
            try {
              // Get order details to calculate original amount
              const orderId = txn.orderId;
              logger.info(`🔍 Fetching order with ID: ${orderId}`);
              const order = await this.paymentService.getOrderById(orderId.toString());
              logger.info(`📋 Order found:`, order ? 'Yes' : 'No');
              if (order) {
                logger.info(`🔍 Order structure:`, {
                  _id: order._id,
                  status: order.status,
                  tickets: order.tickets ? order.tickets.length : 'No tickets array'
                });
                const originalAmount = order.tickets.reduce((sum: number, ticket: any) => 
                  sum + (ticket.priceAtPurchase * ticket.quantity), 0
                );
                
                // Calculate discount based on user membership
                const user = await this.userRepository.findById(userId);
                if (user) {
                  let discountPercentage = 0;
                  switch (user.membershipType) {
                    case 'cityfeed_select':
                      discountPercentage = 5 * 0.3; // 5% max, 30% of max
                      break;
                    case 'cityfeed_edge':
                      discountPercentage = 10 * 0.6; // 10% max, 60% of max
                      break;
                    case 'cityfeed_prime':
                      discountPercentage = 15; // 15% max, 100% of max
                      break;
                    default:
                      discountPercentage = 0;
                  }
                  
                  const discountAmount = Math.round((originalAmount * discountPercentage) / 100);
                  const finalAmount = originalAmount - discountAmount;
                  
                  // Calculate balance information for event transactions
                  let balanceBefore = 0;
                  let balanceAfter = 0;
                  
                  // For wallet payments, calculate balance changes
                  if (txn.paymentMethod === 'wallet') {
                    balanceBefore = (user.coins || 0) + txn.amount; // Add back the amount paid to get balance before
                    balanceAfter = user.coins || 0; // Current balance is after the payment
                  } else if (txn.paymentMethod === 'razorpay') {
                    // For Razorpay payments, user balance remains the same
                    balanceBefore = user.coins || 0;
                    balanceAfter = user.coins || 0;
                  } else if (txn.paymentMethod === 'upi' || txn.paymentMethod === 'cash' || txn.paymentMethod === 'card') {
                    // For other payment methods, user balance remains the same
                    balanceBefore = user.coins || 0;
                    balanceAfter = user.coins || 0;
                  } else {
                    // For null/undefined payment methods, assume no balance change
                    balanceBefore = user.coins || 0;
                    balanceAfter = user.coins || 0;
                  }
                  
                  eventDetails = {
                    originalAmount,
                    discountAmount,
                    finalAmount,
                    discountPercentage: Math.round(discountPercentage * 100) / 100,
                    membershipType: user.membershipType,
                    balanceBefore,
                    balanceAfter
                  };
                }

                // Fetch ticket details for event transactions
                try {
                  logger.info(`🔍 Fetching tickets for order: ${order._id} (type: ${typeof order._id})`);
                  const Ticket = (await import('../models/ticket.model')).Ticket;
                  
                  // Try both ObjectId and string versions of orderId
                  let tickets = await Ticket.find({ orderId: order._id }).populate('ticketTierId');
                  
                  // If no tickets found, try with string version
                  if (!tickets || tickets.length === 0) {
                    logger.info(`🔄 Trying with string orderId: ${order._id.toString()}`);
                    tickets = await Ticket.find({ orderId: order._id.toString() }).populate('ticketTierId');
                  }
                  
                  logger.info(`📋 Found ${tickets.length} tickets for order ${order._id}`);
                  
                  if (tickets && tickets.length > 0) {
                    ticketDetails = tickets.map((ticket: any) => ({
                      _id: ticket._id,
                      ticketTierName: ticket.ticketTierId ? ticket.ticketTierId.name : 'General Admission',
                      quantity: ticket.quantity,
                      status: ticket.status,
                      qrCodeUrl: ticket.qrCodeUrl,
                      issuedAt: ticket.issuedAt,
                      scannedAt: ticket.scannedAt
                    }));
                    logger.info(`✅ Populated ticketDetails:`, ticketDetails);
                  } else {
                    logger.info(`⚠️ No tickets found for order ${order._id}`);
                    // Let's also check if there are any tickets at all in the collection
                    const totalTickets = await Ticket.countDocuments();
                    logger.info(`📊 Total tickets in collection: ${totalTickets}`);
                    if (totalTickets > 0) {
                      const sampleTicket = await Ticket.findOne();
                      logger.info(`🔍 Sample ticket structure:`, {
                        orderId: sampleTicket?.orderId,
                        orderIdType: typeof sampleTicket?.orderId,
                        userId: sampleTicket?.userId,
                        eventId: sampleTicket?.eventId
                      });
                    }
                    ticketDetails = null;
                  }
                } catch (ticketError) {
                  // Log error but don't fail the transaction
                  logger.error('❌ Error fetching ticket details:', ticketError);
                  ticketDetails = null;
                }
              }
            } catch (error) {
              // Log error but don't fail the transaction
              logger.error('Error fetching event details:', error);
            }
          }

          // Handle different transaction types
          if (txn.transactionType === 'payment') {
            const txnObj = txn.toObject ? txn.toObject() : txn;
            return {
              ...txnObj,
              dineInSessionId,
              rewardDetails,
              eventDetails,
              dineInDetails,
              ticketDetails
            };
          } else {
            // Reward transaction
            return {
              ...txn,
              dineInSessionId,
              rewardDetails,
              eventDetails,
              dineInDetails,
              ticketDetails
            };
          }
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
      // console.error('Direct payment initiation error:', errorMsg, error);
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
        // Validate sale dates - check if booking is currently allowed
        const event = await Event.findById(order.event);
        if (event) {
          const now = new Date();
          
          if (event.saleStart && now < event.saleStart) {
            const saleStartDate = new Date(event.saleStart);
            const formattedDate = saleStartDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return this.sendError(res, `Booking has not started yet. You can book tickets starting from ${formattedDate}.`, 400);
          }
          
          if (event.saleEnd && now > event.saleEnd) {
            const saleEndDate = new Date(event.saleEnd);
            const formattedDate = saleEndDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return this.sendError(res, `Booking has ended. Ticket sales closed on ${formattedDate}.`, 400);
          }
        }

        // Validate ticket availability before marking order as paid
        if (order.tickets && Array.isArray(order.tickets) && order.tickets.length > 0) {
          // Check if any tickets have ticketTierId
          const hasTicketTiers = order.tickets.some(t => t.ticketTierId);
          
          if (hasTicketTiers) {
            const ticketTierIds = order.tickets.map(t => t.ticketTierId).filter(id => id);
            const tiers = await TicketTier.find({ _id: { $in: ticketTierIds }, event: order.event });
            
            for (const ticket of order.tickets) {
              if (ticket.ticketTierId) {
                const tier = tiers.find(tt => tt._id.toString() === ticket.ticketTierId.toString());
                if (tier) {
                  const available = tier.quantity - (tier.soldCount || 0);
                  if (available <= 0) {
                    return this.sendError(res, `Tickets are no longer available for ${tier.name}. Please try a different ticket type or contact support.`, 400);
                  }
                  if (ticket.quantity > available) {
                    return this.sendError(res, `Only ${available} tickets available for ${tier.name}, but you ordered ${ticket.quantity}. Please reduce quantity or try a different ticket type.`, 400);
                  }
                }
              }
            }
          } else {
            // For general admission (no ticket tiers), check event capacity
            const event = await Event.findById(order.event);
            if (event && event.venue && event.venue.capacity) {
              const totalSoldCount = event.totalSoldCount || 0;
              const totalOrderedQuantity = order.tickets.reduce((sum, t) => sum + (t.quantity || 0), 0);
              const available = event.venue.capacity - totalSoldCount;
              
              if (available <= 0) {
                return this.sendError(res, 'Event is sold out. No tickets available.', 400);
              }
              if (totalOrderedQuantity > available) {
                return this.sendError(res, `Only ${available} tickets available, but you ordered ${totalOrderedQuantity}. Please reduce quantity or contact support.`, 400);
              }
            }
          }
        }
        
        order.status = 'paid';
        await order.save();
        
        // No reward coins for event ticket bookings - rewards only for dine-in
        const user = await this.userRepository.findById(order.user.toString());
        const amount = order.tickets.reduce((sum, t) => sum + (t.priceAtPurchase * t.quantity), 0);
        
        if (user) {
          logger.info(`Event ticket booking completed: userId=${order.user}, amount=${amount} - No rewards awarded (rewards only for dine-in)`);
        }
        
        // Referral reward: check if this is the user's first completed event payment
        const userOrders = await Order.find({ user: order.user, status: 'paid' });
        if (userOrders.length === 1) {
          // First completed event payment
          if (user && user.referredBy) {
            // Check if event payment amount meets minimum requirement for referral reward
            if (amount >= config.referralReward.minEventAmount) {
              // Find the referrer by referralCode
              const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
              if (referrer) {
                // Give referral reward coins using amount from config
                await this.paymentService.addRewardCoinsToUser(
                  referrer._id.toString(),
                  config.referralReward.amount,
                  'referral',
                  payment._id.toString(),
                  undefined,
                  order.event?.toString(),
                  `Referral reward: ${user.name} completed their first event payment (₹${amount})`,
                  user._id.toString() // referred user ID
                );
                logger.info(`Referral reward given: ${config.referralReward.amount} coins to referrer ${referrer._id} for user ${user._id} first event payment with amount ₹${amount}`);
              }
            } else {
              logger.info(`Referral reward not given: Event payment amount ₹${amount} is below minimum ₹${config.referralReward.minEventAmount} for user ${user._id} first event payment`);
            }
          }
        }
        // Update soldCount for each ticket tier
        let hasTiers = false;
        for (const ticket of order.tickets) {
          if (ticket.ticketTierId) {
            hasTiers = true;
            await updateTicketTierSoldCount(ticket.ticketTierId.toString(), ticket.quantity, order.event.toString());
          }
        }
        // If no ticket tiers, update totalSoldCount on Event separately
        if (!hasTiers) {
          await updateEventTotalSoldCount(order.event.toString(), order.tickets.reduce((sum, t) => sum + t.quantity, 0));
        }
        // Complete any active WebSocket booking sessions for this order
        const orderUserSessions = Array.from(activeBookingSessions.entries())
          .filter(([_sessionId, session]) => 
            session.userId === order.user.toString() && 
            session.eventId === order.event.toString()
          );
        
        for (const [_sessionId] of orderUserSessions) {
          activeBookingSessions.delete(_sessionId);
          logger.info(`Completed WebSocket booking session after payment: ${_sessionId}`);
        }

        // Emit comprehensive real-time updates with booking session data
        const allTiers = await TicketTier.find({ event: order.event });
        let totalAvailableSeats = 0;
        const availabilityUpdates = [];
        
        if (allTiers.length > 0) {
          totalAvailableSeats = allTiers.reduce((sum, tier) => {
            const activeSessionsForTier = Array.from(activeBookingSessions.values())
              .filter(session => session.tierId === tier._id.toString() && session.eventId === order.event.toString());
            
            const reservedQuantity = activeSessionsForTier.reduce((sum, session) => sum + session.quantity, 0);
            const actuallyAvailable = (tier.quantity || 0) - (tier.soldCount || 0) - reservedQuantity;
            
            availabilityUpdates.push({
              tierId: tier._id,
              name: tier.name,
              available: Math.max(0, actuallyAvailable),
              reserved: reservedQuantity
            });
            
            return sum + Math.max(0, actuallyAvailable);
          }, 0);
        } else {
          const eventDoc = await Event.findById(order.event);
          const activeSessionsForEvent = Array.from(activeBookingSessions.values())
            .filter(session => session.eventId === order.event.toString() && !session.tierId);
          
          const reservedQuantity = activeSessionsForEvent.reduce((sum, session) => sum + session.quantity, 0);
          totalAvailableSeats = (eventDoc?.venue?.capacity || 0) - (eventDoc?.totalSoldCount || 0) - reservedQuantity;
        }

        io.to(`event_${order.event}`).emit('eventSeatsUpdate', { 
          eventId: order.event, 
          availableSeats: Math.max(0, totalAvailableSeats),
          tiersAvailable: availabilityUpdates,
          message: 'Payment completed successfully'
        });

        // Generate tickets and send notifications (email + WhatsApp) if not already issued
        try {
          const existingTickets = await Ticket.find({ orderId: order._id });
          let tickets: Array<{ _id: any, ticketTierId: any, ticketTierName: string, qrCodeUrl: string, quantity: number, status?: string, issuedAt?: Date }> = [];
          const userDoc = await this.userRepository.findById(order.user.toString());
          const eventDoc = await Event.findById(order.event);

          if (!existingTickets || existingTickets.length === 0) {
            for (const ticket of order.tickets) {
              const ticketTier = ticket.ticketTierId ? await TicketTier.findById(ticket.ticketTierId) : null;
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
                `Ticket ID: ${tempTicketId}\n` +
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
                userId: order.user,
                eventId: order.event,
                ticketTierId: ticket.ticketTierId,
                qrCodeUrl,
                quantity: ticket.quantity,
                status: 'active',
                issuedAt: new Date()
              });
              tickets.push({
                _id: tempTicketId,
                ticketTierId: ticket.ticketTierId,
                ticketTierName: ticketTier ? ticketTier.name : '',
                qrCodeUrl,
                quantity: ticket.quantity,
                status: ticketDoc.status,
                issuedAt: ticketDoc.issuedAt
              });
            }
          } else {
            // Use already issued tickets
            const populated = await Ticket.find({ orderId: order._id }).populate('ticketTierId');
            tickets = populated.map((t: any) => ({
              _id: t._id,
              ticketTierId: t.ticketTierId?._id || t.ticketTierId,
              ticketTierName: t.ticketTierId?.name || '',
              qrCodeUrl: t.qrCodeUrl,
              quantity: t.quantity,
              status: t.status,
              issuedAt: t.issuedAt
            }));
          }

          // Send ticket email (optional for guest, but consistent)
          if (userDoc?.email) {
            const emailService = EmailService.getInstance();
            await emailService.sendTicketEmail({
              to: userDoc.email,
              event: {
                name: eventDoc?.name || '',
                date: eventDoc?.date ? eventDoc.date.toISOString().split('T')[0] : '',
                venue: eventDoc?.venue?.name || ''
              },
              tickets: tickets.map(t => ({ qrCodeUrl: t.qrCodeUrl, ticketTierName: t.ticketTierName, quantity: t.quantity })),
              userName: userDoc.name || '',
              startTime: eventDoc?.startTime || '',
              endTime: eventDoc?.endTime || ''
            });
          }

          // Send WhatsApp with QR code to guest user's phone
          if (userDoc?.phone) {
            const formattedPhone = formatIndianPhoneNumber(userDoc.phone);
            const waMessage = `🎟️ CityFeed Event Ticket 🎟️\nEvent: ${eventDoc?.name}\nDate: ${eventDoc?.date?.toISOString().split('T')[0]}\nVenue: ${eventDoc?.venue?.name}\nShow this QR code at entry. Enjoy the event!`;
            for (const t of tickets) {
              await sendWhatsAppMessage(
                formattedPhone,
                `${waMessage}\nTicket Type: ${t.ticketTierName}\nAdmits: ${t.quantity}`,
                t.qrCodeUrl
              );
            }
          }
        } catch (notifyErr) {
          logger.error('Failed to issue/send tickets after verification:', notifyErr);
        }
      }
      // Issue tickets, send emails, etc. (reuse existing logic if needed)
      return this.sendSuccess(res, { status: 'completed', amount: payment.amount }, 'Payment verified successfully');
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? (error as any).message
          : JSON.stringify(error);
      // console.error('Direct payment verification error:', errorMsg, error);
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
      const { orderType, orderId, paymentMethod } = req.body;
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

        // Validate sale dates - check if booking is currently allowed
        const event = await Event.findById(order.event);
        if (event) {
          const now = new Date();
          
          if (event.saleStart && now < event.saleStart) {
            const saleStartDate = new Date(event.saleStart);
            const formattedDate = saleStartDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return this.sendError(res, `Booking has not started yet. You can book tickets starting from ${formattedDate}.`, 400);
          }
          
          if (event.saleEnd && now > event.saleEnd) {
            const saleEndDate = new Date(event.saleEnd);
            const formattedDate = saleEndDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return this.sendError(res, `Booking has ended. Ticket sales closed on ${formattedDate}.`, 400);
          }
        }

        // Validate ticket availability before processing payment
        if (order.tickets && Array.isArray(order.tickets) && order.tickets.length > 0) {
          // Check if any tickets have ticketTierId
          const hasTicketTiers = order.tickets.some(t => t.ticketTierId);
          
          if (hasTicketTiers) {
            const ticketTierIds = order.tickets.map(t => t.ticketTierId).filter(id => id);
            const tiers = await TicketTier.find({ _id: { $in: ticketTierIds }, event: order.event });
            
            for (const ticket of order.tickets) {
              if (ticket.ticketTierId) {
                const tier = tiers.find(tt => tt._id.toString() === ticket.ticketTierId.toString());
                if (tier) {
                  const available = tier.quantity - (tier.soldCount || 0);
                  if (available <= 0) {
                    return this.sendError(res, `Tickets are no longer available for ${tier.name}. Please try a different ticket type or contact support.`, 400);
                  }
                  if (ticket.quantity > available) {
                    return this.sendError(res, `Only ${available} tickets available for ${tier.name}, but you ordered ${ticket.quantity}. Please reduce quantity or try a different ticket type.`, 400);
                  }
                }
              }
            }
          } else {
            // For general admission (no ticket tiers), check event capacity
            const event = await Event.findById(order.event);
            if (event && event.venue && event.venue.capacity) {
              const totalSoldCount = event.totalSoldCount || 0;
              const totalOrderedQuantity = order.tickets.reduce((sum, t) => sum + (t.quantity || 0), 0);
              const available = event.venue.capacity - totalSoldCount;
              
              if (available <= 0) {
                return this.sendError(res, 'Event is sold out. No tickets available.', 400);
              }
              if (totalOrderedQuantity > available) {
                return this.sendError(res, `Only ${available} tickets available, but you ordered ${totalOrderedQuantity}. Please reduce quantity or contact support.`, 400);
              }
            }
          }
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
        // Apply membership discount (compute discounted payable for wallet flow)
        // For events, pass the eventId to get dynamic discount
        const discountResult = await this.paymentService.calculateDiscount(
          userId,
          amount,
          undefined,
          order.event?.toString()
        );
        const membershipDiscount = Math.round(discountResult?.discountAmount || 0);
        const finalAmount = Math.max(0, Math.round(amount - membershipDiscount));
        const discountAmount = membershipDiscount;

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
          const payment = await Payment.create({
            userId: userId,
            amount: finalAmount,
            type: 'event',
            status: 'completed',
            paymentMethod: paymentMethod, // If not in enum, update schema
            orderId: order._id,
            rewardPointsDeducted
          });
          
          // No reward coins for event ticket bookings - rewards only for dine-in
          logger.info(`Event ticket booking completed: userId=${userId}, amount=${finalAmount} - No rewards awarded (rewards only for dine-in)`);
          
          // Referral reward: check if this is the user's first completed event payment
          const userOrders = await Order.find({ user: userId, status: 'paid' });
          if (userOrders.length === 1) {
            // First completed event payment
            const user = await this.userRepository.findById(userId);
            if (user && user.referredBy) {
              // Check if event payment amount meets minimum requirement for referral reward
              if (finalAmount >= config.referralReward.minEventAmount) {
                // Find the referrer by referralCode
                const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
                if (referrer) {
                  // Give referral reward coins using amount from config
                  await this.paymentService.addRewardCoinsToUser(
                    referrer._id.toString(),
                    config.referralReward.amount,
                    'referral',
                    payment._id.toString(),
                    undefined,
                    order.event?.toString(),
                    `Referral reward: ${user.name} completed their first event payment (₹${finalAmount})`,
                    user._id.toString() // referred user ID
                  );
                  logger.info(`Referral reward given: ${config.referralReward.amount} coins to referrer ${referrer._id} for user ${user._id} first event payment with amount ₹${finalAmount}`);
                }
              } else {
                logger.info(`Referral reward not given: Event payment amount ₹${finalAmount} is below minimum ₹${config.referralReward.minEventAmount} for user ${user._id} first event payment`);
              }
            }
          }
          
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
                await updateTicketTierSoldCount(ticket.ticketTierId.toString(), ticket.quantity, order.event.toString());
              }
            }
            // For general admission (no ticket tiers), increment totalSoldCount on the Event separately
            if (!order.tickets.some(t => t.ticketTierId)) {
              await updateEventTotalSoldCount(order.event.toString(), order.tickets.reduce((sum, t) => sum + t.quantity, 0));
            }
            // Send ticket email
            try {
              const emailService = EmailService.getInstance();
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
              logger.info(`Ticket email sent successfully to ${user.email} for order ${order._id}`);
            } catch (error) {
              logger.error(`Failed to send ticket email to ${user.email} for order ${order._id}:`, error);
              // Don't block the payment response - email failure shouldn't affect payment success
            }
            // Send WhatsApp message with ticket details and QR code
            if (user.phone) {
              try {
                const formattedPhone = formatIndianPhoneNumber(user.phone);
                const waMessage = `🎟️ CityFeed Event Ticket 🎟️\nEvent: ${eventDoc?.name}\nDate: ${eventDoc?.date?.toISOString().split('T')[0]}\nVenue: ${eventDoc?.venue?.name}\nShow this QR code at entry. Enjoy the event!`;
                for (const t of tickets) {
                  // Add debug log before sending
                  await sendWhatsAppMessage(
                    formattedPhone,
                    `${waMessage}\nTicket Type: ${t.ticketTierName}\nAdmits: ${t.quantity}`,
                    t.qrCodeUrl
                  );
                }
                logger.info(`WhatsApp message sent successfully to ${user.phone} for order ${order._id}`);
              } catch (error) {
                logger.error(`Failed to send WhatsApp message to ${user.phone} for order ${order._id}:`, error);
                // Don't block the payment response - WhatsApp failure shouldn't affect payment success
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
          
          const payment = await Payment.create({
            userId: userId,
            amount: finalAmount,
            type: 'event',
            status: 'completed',
            paymentMethod: paymentMethod, // If not in enum, update schema
            orderId: order._id,
            rewardPointsDeducted
          });
          
          // Referral reward: check if this is the user's first completed event payment
          const userOrders = await Order.find({ user: userId, status: 'paid' });
          if (userOrders.length === 1) {
            // First completed event payment
            const user = await this.userRepository.findById(userId);
            if (user && user.referredBy) {
              // Check if event payment amount meets minimum requirement for referral reward
              if (finalAmount >= config.referralReward.minEventAmount) {
                // Find the referrer by referralCode
                const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
                if (referrer) {
                  // Give referral reward coins using amount from config
                  await this.paymentService.addRewardCoinsToUser(
                    referrer._id.toString(),
                    config.referralReward.amount,
                    'referral',
                    payment._id.toString(),
                    undefined,
                    order.event?.toString(),
                    `Referral reward: ${user.name} completed their first event payment (₹${finalAmount})`,
                    user._id.toString() // referred user ID
                  );
                  logger.info(`Referral reward given: ${config.referralReward.amount} coins to referrer ${referrer._id} for user ${user._id} first event payment with amount ₹${finalAmount}`);
                }
              } else {
                logger.info(`Referral reward not given: Event payment amount ₹${finalAmount} is below minimum ₹${config.referralReward.minEventAmount} for user ${user._id} first event payment`);
              }
            }
          }
          
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
            // Create a payment record for the coins portion
            await Payment.create({
              userId: userId,
              amount: req.body.coinsToUse,
              type: 'event',
              status: 'completed',
              paymentMethod: 'wallet',
              orderId: order._id,
              coinsUsed: req.body.coinsToUse
            });
            
            // No reward coins for event ticket bookings - rewards only for dine-in
            logger.info(`Event ticket booking (coins portion): userId=${userId}, amount=${req.body.coinsToUse} - No rewards awarded (rewards only for dine-in)`);
            // 3. Calculate remaining amount
            const remainingAmount = finalAmount - req.body.coinsToUse;
            if (remainingAmount <= 0) {
              // All paid by coins, mark as paid
              if (order.status === 'paid') {
                return this.sendError(res, 'Order already paid', 400);
              }
              order.status = 'paid';
              await order.save();
              // No reward coins for event ticket bookings - rewards only for dine-in
              logger.info(`Event ticket booking (hybrid full): userId=${userId}, amount=${finalAmount} - No rewards awarded (rewards only for dine-in)`);
              
              const payment = await Payment.create({
                userId: userId,
                amount: finalAmount,
                type: 'event',
                status: 'completed',
                paymentMethod: 'wallet',
                orderId: order._id,
                rewardPointsDeducted
              });
              
              // Referral reward: check if this is the user's first completed event payment
              const userOrders = await Order.find({ user: userId, status: 'paid' });
              if (userOrders.length === 1) {
                // First completed event payment
                const user = await this.userRepository.findById(userId);
                if (user && user.referredBy) {
                  // Check if event payment amount meets minimum requirement for referral reward
                  if (finalAmount >= config.referralReward.minEventAmount) {
                    // Find the referrer by referralCode
                    const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
                    if (referrer) {
                      // Give referral reward coins using amount from config
                      await this.paymentService.addRewardCoinsToUser(
                        referrer._id.toString(),
                        config.referralReward.amount,
                        'referral',
                        payment._id.toString(),
                        undefined,
                        order.event?.toString(),
                        `Referral reward: ${user.name} completed their first event payment (₹${finalAmount})`
                      );
                      logger.info(`Referral reward given: ${config.referralReward.amount} coins to referrer ${referrer._id} for user ${user._id} first event payment with amount ₹${finalAmount}`);
                    }
                  } else {
                    logger.info(`Referral reward not given: Event payment amount ₹${finalAmount} is below minimum ₹${config.referralReward.minEventAmount} for user ${user._id} first event payment`);
                  }
                }
              }
              
              // Continue with the rest of the payment flow
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
                    `Ticket ID: ${tempTicketId}\n` +
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
                    await updateTicketTierSoldCount(ticket.ticketTierId.toString(), ticket.quantity, order.event.toString());
                  }
                }
                // For general admission (no ticket tiers), increment totalSoldCount on the Event separately
                if (!order.tickets.some(t => t.ticketTierId)) {
                  await updateEventTotalSoldCount(order.event.toString(), order.tickets.reduce((sum, t) => sum + t.quantity, 0));
                }
                // Send ticket email
                try {
                  const emailService = EmailService.getInstance();
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
                  logger.info(`Ticket email sent successfully to ${user.email} for order ${order._id}`);
                } catch (error) {
                  logger.error(`Failed to send ticket email to ${user.email} for order ${order._id}:`, error);
                  // Don't block the payment response - email failure shouldn't affect payment success
                }
                // Send WhatsApp message
                if (user.phone) {
                  try {
                    const formattedPhone = formatIndianPhoneNumber(user.phone);
                    const waMessage = `🎟️ CityFeed Event Ticket 🎟️\nEvent: ${eventDoc?.name}\nDate: ${eventDoc?.date?.toISOString().split('T')[0]}\nVenue: ${eventDoc?.venue?.name}\nShow this QR code at entry. Enjoy the event!`;
                    for (const t of tickets) {
                      await sendWhatsAppMessage(
                        formattedPhone,
                        `${waMessage}\nTicket Type: ${t.ticketTierName}\nAdmits: ${t.quantity}`,
                        t.qrCodeUrl
                      );
                    }
                    logger.info(`WhatsApp message sent successfully to ${user.phone} for order ${order._id}`);
                  } catch (error) {
                    logger.error(`Failed to send WhatsApp message to ${user.phone} for order ${order._id}:`, error);
                    // Don't block the payment response - WhatsApp failure shouldn't affect payment success
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

  /**
   * @swagger
   * /api/payments/scan-qr:
   *   post:
   *     summary: Scan QR code to get user details for payment
   *     description: |
   *       Scan a user's QR code to fetch their details for payment processing.
   *       This endpoint is used by merchants to verify user identity before processing payment.
   *       QR codes are generated during user registration and contain user membership information.
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
   *               - qrCodeData
   *             properties:
   *               qrCodeData:
   *                 type: string
   *                 description: QR code data string scanned from user's QR code
   *                 example: "==============================\n  🪪 CityFeed Membership QR  🪪\n==============================\nName: John Doe\nEmail: john@example.com\nPhone: 9876543210\nMembership: cityfeed_prime\nExpiry: 2025-01-01\n------------------------------\nShow this QR code for membership verification.\n=============================="
   *     responses:
   *       200:
   *         description: User details retrieved successfully
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
   *                       properties:
   *                         _id:
   *                           type: string
   *                           example: "64e1c2f1a2b3c4d5e6f7a8b9"
   *                         name:
   *                           type: string
   *                           example: "John Doe"
   *                         phone:
   *                           type: string
   *                           example: "9876543210"
   *                         coins:
   *                           type: number
   *                           example: 500
   *                         membershipType:
   *                           type: string
   *                           example: "cityfeed_prime"
   *                         isActive:
   *                           type: boolean
   *                           example: true
   *       400:
   *         description: Invalid QR code data
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  public scanQRCode = async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return this.sendError(res, 'User ID is required', 400);
      }

      // Log the userId for debugging
      logger.info('User ID received:', userId);

      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Verify that the user is active
      if (!user.isActive) {
        return this.sendError(res, 'User account is not active', 400);
      }

      // Return complete user details for payment processing (same as getUserByPhone)
      this.sendSuccess(res, user);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/payments/get-qr-data:
   *   get:
   *     summary: Get QR code data for a user (for testing purposes)
   *     description: |
   *       Get the QR code data for a specific user. This is for testing purposes
   *       to get the QR code text that should be scanned by merchants.
   *     tags: [Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to get QR code data for
   *     responses:
   *       200:
   *         description: QR code data retrieved successfully
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
   *                     qrCodeData:
   *                       type: string
   *                       description: QR code text data
   *                     qrCodeUrl:
   *                       type: string
   *                       description: QR code image URL
   *       400:
   *         description: User ID is required
   *       404:
   *         description: User not found
   */
  public getQRCodeData = async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return this.sendError(res, 'User ID is required', 400);
      }

      const user = await this.userRepository.findById(userId.toString());
      
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Generate the same QR code data that was created during registration
      const qrCodeData = 
        '==============================\n' +
        '  🪪 CityFeed Membership QR  🪪\n' +
        '==============================\n' +
        `User ID: ${user._id}\n` +
        `Name: ${user.name}\n` +
        `Email: ${user.email}\n` +
        `Phone: ${user.phone}\n` +
        `Membership: ${user.membershipType}\n` +
        `Expiry: ${user.membershipExpiryDate ? user.membershipExpiryDate.toISOString().split('T')[0] : ''}\n` +
        '------------------------------\n' +
        'Show this QR code for membership verification.\n' +
        '==============================';

      this.sendSuccess(res, {
        qrCodeData,
        qrCodeUrl: user.qrCodeUrl
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public merchantDineInPayment = async (req: AuthRequest, res: Response) => {
    const endTimer = performanceMonitor.startTimer('merchantDineInPayment');
    const session = await mongoose.startSession();
    let transactionFinished = false;
    let payment = null;
    let allowedDiscount = 0;
    let user = null;
    let billAmount, outletId;
    let outlet = null;
    let rewardPointsToAdd = 0;
    let dineInSessionId = null;
    let validOffers = [];
    
    try {
      session.startTransaction();
      const startTime = Date.now();
      logger.info(`[merchantDineInPayment] Start: ${startTime}`);
      
      const { phone, qrCodeData, userId, outletId: outletIdRaw, billAmount: billAmountRaw, coinsToUse, cashAmount, otp, paymentMethod, maxDiscountPercentage } = req.body;
      billAmount = billAmountRaw;
      outletId = outletIdRaw;
      
      // Validate required fields
      if ((!phone && !qrCodeData && !userId) || !outletId || !billAmount) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'Either phone, qrCodeData, or userId, outletId, and billAmount are required', 400);
      }
      
      logger.info(`[merchantDineInPayment] Step: Parallel data fetching - ${Date.now() - startTime}ms`);
      
      // Parallel data fetching for better performance
      const [userResult, outletResult, activeOffers] = await Promise.all([
        // Fetch user
        (async () => {
          if (userId) {
            return await this.userRepository.findById(userId);
          } else if (qrCodeData) {
            return await this.paymentService.getUserByQRCode(qrCodeData);
          } else {
            return await this.paymentService.getUserByPhone(phone);
          }
        })(),
        // Fetch outlet with staff assignments
        Outlet.findById(outletId).populate('assignedAdmin', 'email').lean(),
                 // Fetch only active offers for the outlet
         (async () => {
           const offerService = new OfferService();
           return await offerService.getActiveOffersByOutlet(outletId);
         })()
      ]);
      
      user = userResult;
      outlet = outletResult;
      validOffers = activeOffers;
      
      if (!user) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'User not found', 404);
      }
      
      if (!outlet) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'Outlet not found', 404);
      }
      
      if (!validOffers.length) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'No active offers found for this outlet', 400);
      }
      
      logger.info(`[merchantDineInPayment] Step: Validation checks - ${Date.now() - startTime}ms`);
      
      // Validate discount percentage
      const maxOfferDiscount = Math.max(...validOffers.map(o => o.discountPercentage));
      if (maxOfferDiscount !== maxDiscountPercentage) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'Something went wrong. Discount mismatch.', 400);
      }
      
      // Calculate allowed discount based on membership
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
      
      // Check merchant permissions (optimized)
      const merchantId = req.user?._id?.toString();
      const isSuperAdmin = req.user?.role === 'super_admin';
      const isOutletAdmin = req.user?.role === 'outlet_admin';
      let allowed = false;
      
      if (isSuperAdmin && outlet.createdBy?.toString() === merchantId) {
        allowed = true;
      } else if (isOutletAdmin && outlet.assignedAdmin?._id?.toString() === merchantId) {
        allowed = true;
      } else {
        // Check for employee/staff assignment using direct query
        const assignment = await Staff.findOne({ 
          outlet: outletId, 
          isDeleted: { $ne: true }, 
          email: req.user.email 
        }).select('_id').lean();
        if (assignment) allowed = true;
      }
      
      if (!allowed) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendError(res, 'You are not authorized to process payment for this outlet.', 403);
      }
      
      logger.info(`[merchantDineInPayment] Step: Payment validation - ${Date.now() - startTime}ms`);
      
      // Validate coin usage
      if (coinsToUse && coinsToUse > 0) {
        if (user.coins < coinsToUse) {
          await session.abortTransaction();
          transactionFinished = true;
          return this.sendError(res, 'Insufficient coins', 402);
        }
      }
      
      // Handle OTP for coin usage
      if (coinsToUse && coinsToUse > 0) {
        if (!otp) {
          await this.paymentService.sendOTPToPhoneAndEmail(user.phone, user.email);
          otpSentMap[user.phone] = Date.now();
          await session.abortTransaction();
          transactionFinished = true;
          return res.status(200).json({
            success: true,
            data: {
              status: 'otp_required',
              message: 'OTP sent to user phone and email',
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
      
      logger.info(`[merchantDineInPayment] Step: Duplicate check - ${Date.now() - startTime}ms`);
      
      // Check for existing payment (optimized query)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const alreadyPaid = await this.paymentService.hasExistingMerchantDineInPayment(user._id.toString(), outletId, billAmount, fiveMinutesAgo);
      if (alreadyPaid) {
        await session.abortTransaction();
        transactionFinished = true;
        return this.sendSuccess(res, { status: 'already_paid', message: 'Payment already completed for this user and bill.' });
      }
      
      // Deduct coins if needed
      if (coinsToUse && coinsToUse > 0) {
        user.coins -= coinsToUse;
        await user.save({ session });
      }
      
      logger.info(`[merchantDineInPayment] Step: Record payment - ${Date.now() - startTime}ms`);
      
      // Record payment
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
      
      // Create DineInSession
      const dineInSession = await DineInSession.create([{
        userId: user._id.toString(),
        outletId,
        offerId: validOffers[0]?._id?.toString() || null,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        totalBill: billAmount,
        paymentId: payment._id.toString()
      }], { session });
      
      dineInSessionId = dineInSession[0]._id.toString();
      
      // Update payment with dineInSessionId
      payment.dineInSessionId = dineInSessionId;
      await payment.save({ session });
      
      logger.info(`[merchantDineInPayment] Step: Commit transaction - ${Date.now() - startTime}ms`);
      
      await session.commitTransaction();
      transactionFinished = true;
      logger.info(`[merchantDineInPayment] Transaction completed: ${Date.now() - startTime}ms`);
      
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
    
    // Process rewards and send email in background (non-blocking)
    setImmediate(async () => {
      try {
        // Reward logic
        const rewardResult = await this.paymentService.calculateDiscount(
          user._id.toString(),
          billAmount,
          outletId,
          undefined,
          allowedDiscount
        );
        rewardPointsToAdd = rewardResult.rewardPointsToAdd;
        await this.paymentService.addRewardCoinsToUser(
          user._id.toString(), 
          rewardPointsToAdd,
          'dine-in',
          payment._id.toString(),
          outletId,
          undefined,
          `Earned ${rewardPointsToAdd} reward points from dine-in at ${outlet?.businessName || 'outlet'}`
        );
        
        // Referral reward logic
        const userDineIns = await DineInSession.find({ userId: user._id.toString() });
        const completedDineIns = userDineIns.filter(s => s.status === 'completed');
        if (completedDineIns.length === 1) {
          if (user.referredBy && billAmount >= config.referralReward.minDineInAmount) {
            const referrer = await this.userRepository.findOne({ referralCode: user.referredBy });
            if (referrer) {
              await this.paymentService.addRewardCoinsToUser(
                referrer._id.toString(),
                config.referralReward.amount,
                'referral',
                payment._id.toString(),
                outletId,
                undefined,
                `Referral reward: ${user.name} completed their first dine-in (₹${billAmount}) at ${outlet?.businessName || 'outlet'}`,
                user._id.toString()
              );
            }
          }
        }
        
        // Send email (non-blocking)
        try {
          const emailService = EmailService.getInstance();
          const reviewLink = `${config.frontendUrl}/review?dineInSessionId=${dineInSessionId}`;
          const pdfBuffer = await generateDineInSummaryPDF({
            userName: user.name,
            billAmount,
            coinsUsed: payment.coinsUsed || 0,
            cashAmount: payment.cashAmount || 0,
            nonCoinPaymentMethod: payment.nonCoinPaymentMethod || null,
            rewardEarned: rewardPointsToAdd || 0,
            outletName: outlet?.businessName || '',
            outletAddress: outlet?.address || '',
            dineInDate: payment.createdAt || new Date()
          });
          await emailService.sendDineInSummaryEmail({
            to: user.email,
            userName: user.name,
            billAmount,
            coinsUsed: payment.coinsUsed || 0,
            cashAmount: payment.cashAmount || 0,
            nonCoinPaymentMethod: payment.nonCoinPaymentMethod || null,
            rewardEarned: rewardPointsToAdd || 0,
            outletName: outlet?.businessName || '',
            outletAddress: outlet?.address || '',
            reviewLink,
            pdfBuffer
          });
          logger.info(`Dine-in summary email sent successfully to ${user.email} for payment ${payment._id}`);
        } catch (error) {
          logger.error(`Failed to send dine-in summary email to ${user.email} for payment ${payment._id}:`, error);
          // Don't block the payment response - email failure shouldn't affect payment success
        }
        
        logger.info(`[merchantDineInPayment] Background tasks completed for payment ${payment._id}`);
      } catch (backgroundError) {
        logger.error('Error in background tasks:', backgroundError);
      }
    });
    
    endTimer();
    return this.sendSuccess(res, { status: 'success', message: 'Payment processed successfully', payment });
  };
} 