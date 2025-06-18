import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import { UserRepository } from '../repositories/user.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { AppErrorClass } from '../utils/appError';
import { IPayment, PaymentServiceResponse, InsufficientCoinsResponse, OTPRequiredResponse, DirectPaymentResponse } from '../interfaces/payment.interface';
import { RewardService } from './reward.service';
import { OTPService } from './otp.service';

dotenv.config();

export class PaymentService {
  private razorpay: Razorpay | null = null;
  private paymentRepository: PaymentRepository;
  private userRepository: UserRepository;
  private dineInSessionRepository: DineInSessionRepository;
  private rewardService: RewardService;
  private otpService: OTPService;

  constructor(
    paymentRepository: PaymentRepository,
    userRepository: UserRepository,
    dineInSessionRepository: DineInSessionRepository
  ) {
    this.paymentRepository = paymentRepository;
    this.userRepository = userRepository;
    this.dineInSessionRepository = dineInSessionRepository;
    this.rewardService = new RewardService();
    this.otpService = new OTPService();
    
    // Initialize Razorpay if key and secret are available
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
    } else {
      this.razorpay = null;
    }
  }

  async createOrder(userId: string, amount: number) {
    if (!this.razorpay) {
      throw new AppErrorClass('Payment service is not configured', 503);
    }

    try {
      const options = {
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId
        }
      };

      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new AppErrorClass('Failed to create payment order', 500);
    }
  }

  async verifyPayment(orderId: string) {
    if (!this.razorpay) {
      throw new AppErrorClass('Payment service is not configured', 503);
    }

    try {
      // Get the order details from Razorpay
      
      // Get the payment details
      const payments = await this.razorpay.orders.fetchPayments(orderId);
      
      // Check if there are any payments
      if (!payments || !payments.items || payments.items.length === 0) {
        throw new AppErrorClass('No payment found for this order. Please complete the payment first.', 400);
      }

      const payment = payments.items[0];
      
      // Check payment status
      if (payment.status !== 'captured') {
        throw new AppErrorClass('Payment is not completed yet. Please wait for the payment to be processed.', 400);
      }

      const amount = Math.round(Number(payment.amount) / 100); // Convert from paise to rupees and round to integer

      // Find the payment record in our database
      const paymentRecord = await this.paymentRepository.findOne({ razorpayOrderId: orderId });
      if (!paymentRecord) {
        throw new AppErrorClass('Payment record not found', 404);
      }

      // Check if payment was already processed
      if (paymentRecord.status === 'completed') {
        throw new AppErrorClass('Payment was already processed', 400);
      }

      // Update payment status in database
      await this.paymentRepository.update(paymentRecord._id.toString(), {
        status: 'completed',
        razorpayPaymentId: payment.id,
        paidAt: new Date()
      });

      // Update user's wallet only for recharge payments
      if (paymentRecord.type === 'recharge') {
        await this.userRepository.update(paymentRecord.userId, { $inc: { coins: amount } });
      } else if (paymentRecord.type === 'membership_upgrade') {
        // For membership upgrades, we don't need to do anything here
        // The membership upgrade verification is handled in the verifyMembershipUpgrade controller
      }

      return {
        amount,
        payment
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass('Payment verification failed. Please try again.', 500);
    }
  }

  async processPayment(userId: string, amount: number, merchantId: string, paymentMethod: 'wallet' | 'razorpay'): Promise<IPayment> {
    try {
      
      // Get user and check coins balance
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }
     

      if (user.coins < amount) {
        throw new AppErrorClass('Insufficient coins', 400);
      }

      // Create payment record first
      const payment = await this.paymentRepository.create({
        userId,
        merchantId,
        amount,
        type: 'dine-in',
        status: 'completed',
        paymentMethod,
        paidAt: new Date()
      });

      // Deduct coins
      await this.userRepository.update(userId, { $inc: { coins: -amount } });
     

      // Add reward points
      try {
       
        await this.rewardService.addRewardPoints(userId, amount);
      } catch (error) {
        console.error('Error adding reward points:', error);
        // Don't throw error here to not affect the payment flow
      }

      return payment;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  async calculateDiscount(userId: string, totalBill: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }

    let discountPercentage = 0;
    switch (user.membershipType) {
      case 'cityfeed_select':
        discountPercentage = 5;
        break;
      case 'cityfeed_edge':
        discountPercentage = 10;
        break;
      case 'cityfeed_prime':
        discountPercentage = 15;
        break;
      default:
        discountPercentage = 0;
    }

    const discountAmount = (totalBill * discountPercentage) / 100;
    const finalAmount = totalBill - discountAmount;

    return {
      discountAmount,
      finalAmount
    };
  }

  async processDineInPayment(data: {
    userId: string;
    merchantId: string;
    offerId: string;
    totalBill: number;
    paymentMethod?: 'wallet' | 'razorpay';
    useRewardPoints?: boolean;
    rewardPointsToUse?: number;
    otp?: string;
  }): Promise<PaymentServiceResponse> {
    try {
      // Calculate discount for both payment methods
      const {  finalAmount } = await this.calculateDiscount(data.userId, data.totalBill);
      const roundedFinalAmount = Math.round(finalAmount);

      // Get user details
      const user = await this.userRepository.findById(data.userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }

      // Handle reward points usage if requested
      let remainingBill = roundedFinalAmount;
      let rewardPointsDeducted = 0;

      if (data.useRewardPoints && data.rewardPointsToUse) {
        // Verify OTP if provided
        if (data.otp) {
          const isValidOTP = await this.otpService.verifyOTP(user.phone, data.otp);
          if (!isValidOTP) {
            throw new AppErrorClass('Invalid OTP', 400);
          }
        } else {
          // Send OTP if not provided
          await this.otpService.sendOTP(user.phone);
          return {
            status: 'otp_required',
            message: 'OTP has been sent to your phone number',
            finalAmount: roundedFinalAmount
          } as OTPRequiredResponse;
        }

        // Use reward points
        const result = await this.rewardService.useRewardPoints(
          data.userId,
          roundedFinalAmount,
          data.rewardPointsToUse
        );
        rewardPointsDeducted = result.rewardPointsDeducted;
        remainingBill = result.remainingBill;
      }

      // Handle payment based on method
      if (data.paymentMethod === 'razorpay') {
        if (!this.razorpay) {
          throw new AppErrorClass('Payment service is not configured', 503);
        }

        // Create Razorpay order for remaining amount
        const order = await this.razorpay.orders.create({
          amount: remainingBill * 100, // Convert to paise
          currency: 'INR',
          receipt: `dine_in_${Date.now()}`,
          notes: {
            userId: data.userId,
            merchantId: data.merchantId,
            offerId: data.offerId,
            type: 'dine_in',
            rewardPointsDeducted: rewardPointsDeducted.toString()
          }
        });

        // Create pending payment record
        const payment = await this.paymentRepository.create({
          userId: data.userId,
          merchantId: data.merchantId,
          offerId: data.offerId,
          amount: remainingBill,
          type: 'dine-in',
          totalBill: roundedFinalAmount,
          status: 'pending',
          paymentMethod: 'razorpay',
          razorpayOrderId: order.id
        });

        return {
          order,
          paymentId: payment._id,
          keyId: process.env.RAZORPAY_KEY_ID || ''
        } as DirectPaymentResponse;
      }

      // Handle wallet payment
      if (user.coins < remainingBill) {
        return {
          status: 'insufficient_coins',
          requiredCoins: remainingBill,
          currentCoins: user.coins,
          finalAmount: roundedFinalAmount,
          _id: null,
          orderDetails: null
        } as InsufficientCoinsResponse;
      }

      // Process payment with coins
      const payment = await this.paymentRepository.processDineInPayment({
        userId: data.userId,
        merchantId: data.merchantId,
        offerId: data.offerId,
        totalBill: roundedFinalAmount,
        status: 'completed',
        paymentMethod: 'wallet'
      });

      // Deduct coins from user's wallet
      await this.userRepository.update(data.userId, { $inc: { coins: -remainingBill } });

      // Add reward points for the payment
      try {
        await this.rewardService.addRewardPoints(data.userId, roundedFinalAmount);
      } catch (error) {
        console.error('Error adding reward points:', error);
      }

      // Update dine-in session status to completed
      const activeSession = await this.dineInSessionRepository.findActiveSession(data.userId, data.merchantId);
      if (activeSession) {
        const sessionId = activeSession._id.toString();
        const paymentId = payment._id.toString();
        
        await this.dineInSessionRepository.update(sessionId, {
          status: 'completed',
          endTime: new Date(),
          totalBill: roundedFinalAmount,
          paymentId
        });
      }

      return payment;
    } catch (error) {
      console.error('Error processing dine-in payment:', error);
      throw new AppErrorClass('Failed to process payment', 500);
    }
  }

  async getTransactionHistory(userId: string) {
    return this.paymentRepository.getTransactionHistory(userId);
  }

  async getDineInHistory(userId: string) {
    return this.paymentRepository.getDineInHistory(userId);
  }

  async getMerchantDineInHistory(merchantId: string) {
    return this.paymentRepository.getMerchantDineInHistory(merchantId);
  }

  async getTransactionById(id: string) {
    return this.paymentRepository.getTransactionById(id);
  }

  async getUserById(userId: string) {
    return this.userRepository.findById(userId);
  }

  async initiateDirectPayment(data: {
    userId: string;
    merchantId: string;
    offerId: string;
    totalBill: number;
  }): Promise<DirectPaymentResponse> {
    try {
      if (!this.razorpay) {
        throw new AppErrorClass('Payment service is not configured', 503);
      }

      // Create Razorpay order
      const order = await this.razorpay.orders.create({
        amount: data.totalBill * 100, // Convert to paise
        currency: 'INR',
        receipt: `direct_${Date.now()}`,
        notes: {
          userId: data.userId,
          merchantId: data.merchantId,
          offerId: data.offerId,
          type: 'direct_payment'
        }
      });

      // Create pending payment record without any wallet interaction
      const paymentRecord = await this.paymentRepository.create({
        userId: data.userId,
        merchantId: data.merchantId,
        offerId: data.offerId,
        amount: data.totalBill,
        type: 'dine-in',
        status: 'pending',
        paymentMethod: 'razorpay',
        razorpayOrderId: order.id,
        createdAt: new Date()
      });

      // Update dine-in session status to pending
      const activeSession = await this.dineInSessionRepository.findActiveSession(data.userId, data.merchantId);
      if (activeSession) {
        const sessionId = activeSession._id.toString();
        const paymentId = paymentRecord._id.toString();
        
        await this.dineInSessionRepository.update(sessionId, {
          status: 'pending',
          totalBill: data.totalBill,
          paymentId
        });
      }

      return {
        order,
        paymentId: paymentRecord._id,
        keyId: process.env.RAZORPAY_KEY_ID || ''
      };
    } catch (error) {
      console.error('Error initiating direct payment:', error);
      throw new AppErrorClass('Failed to initiate payment', 500);
    }
  }

  async verifyDirectPayment(orderId: string) {
    if (!this.razorpay) {
      throw new AppErrorClass('Payment service is not configured', 503);
    }

    try {
      // Get the order details from Razorpay
      await this.razorpay.orders.fetch(orderId);
      
      // Get the payment details
      const payments = await this.razorpay.orders.fetchPayments(orderId);
      
      // Check if there are any payments
      if (!payments || !payments.items || payments.items.length === 0) {
        throw new AppErrorClass('No payment found for this order. Please complete the payment first.', 400);
      }

      const payment = payments.items[0];
      
      // Check payment status
      if (payment.status !== 'captured') {
        throw new AppErrorClass('Payment is not completed yet. Please wait for the payment to be processed.', 400);
      }

      // Find and update the payment record
      const paymentRecord = await this.paymentRepository.findOne({ razorpayOrderId: orderId });
      if (!paymentRecord) {
        throw new AppErrorClass('Payment record not found', 404);
      }

      // Ensure this is a direct Razorpay payment
      if (paymentRecord.paymentMethod !== 'razorpay') {
        throw new AppErrorClass('Invalid payment method for direct payment verification', 400);
      }

      if (paymentRecord.status === 'completed') {
        throw new AppErrorClass('Payment was already processed', 400);
      }

      // Update payment record without any wallet interaction
      const updatedPayment = await this.paymentRepository.update(paymentRecord._id.toString(), {
        status: 'completed',
        razorpayPaymentId: payment.id,
        paidAt: new Date()
      });

      // Update dine-in session status to completed
      const activeSession = await this.dineInSessionRepository.findActiveSession(
        paymentRecord.userId,
        paymentRecord.merchantId
      );
      
      if (activeSession) {
        const sessionId = activeSession._id.toString();
        const paymentId = updatedPayment._id.toString();
        
        await this.dineInSessionRepository.update(sessionId, {
          status: 'completed',
          endTime: new Date(),
          totalBill: paymentRecord.amount,
          paymentId
        });
      }

      return updatedPayment;
    } catch (error) {
      console.error('Error verifying direct payment:', error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass('Failed to verify payment', 500);
    }
  }
  
  async createPayment(paymentData: {
    userId: string;
    amount: number;
    type: 'recharge' | 'dine-in' | 'refund' | 'membership_upgrade';
    paymentMethod: 'wallet' | 'razorpay';
    razorpayOrderId?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
  }) {
    return this.paymentRepository.create(paymentData);
  }

  async getPaymentByOrderId(orderId: string) {
    return this.paymentRepository.findOne({ razorpayOrderId: orderId });
  }

  async createRechargeOrder(userId: string, amount: number) {
    if (!this.razorpay) {
      throw new AppErrorClass('Payment service is not configured', 503);
    }

    try {
      // Create Razorpay order
      const order = await this.razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `recharge_${Date.now()}`,
        notes: {
          userId,
          type: 'wallet_recharge'
        }
      });

      // Create pending payment record
      await this.paymentRepository.create({
        userId,
        amount,
        type: 'recharge',
        status: 'pending',
        paymentMethod: 'razorpay',
        razorpayOrderId: order.id,
        createdAt: new Date()
      });

      return order;
    } catch (error) {
      console.error('Error creating recharge order:', error);
      throw new AppErrorClass('Failed to create recharge order', 500);
    }
  }
} 