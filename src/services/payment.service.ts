import Razorpay from 'razorpay';
import { UserRepository } from '../repositories/user.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { AppErrorClass } from '../middleware/error.middleware';
import { IUserDocument } from '../interfaces/user.interface';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export class PaymentService {
  private userRepository: UserRepository;
  private paymentRepository: PaymentRepository;
  private razorpay: Razorpay | null;

  constructor() {
    this.userRepository = new UserRepository();
    this.paymentRepository = new PaymentRepository();
    
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn('Razorpay credentials not found. Payment features will be disabled.');
      this.razorpay = null;
    } else {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
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
      const order = await this.razorpay.orders.fetch(orderId);
      
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

      const amount = Number(payment.amount) / 100; // Convert from paise to rupees

      // Update user's coin balance
      const userId = order.notes?.userId?.toString();
      if (!userId) {
        throw new AppErrorClass('User ID not found in order notes', 400);
      }

      // Check if payment was already processed
      const existingPayment = await this.paymentRepository.findOne({ razorpayOrderId: orderId });
      if (existingPayment && existingPayment.status === 'completed') {
        throw new AppErrorClass('Payment was already processed', 400);
      }

      // Update payment status in database
      await this.paymentRepository.verifyPayment(orderId);

      // Update user's wallet
      await this.userRepository.update(userId, { $inc: { coins: amount } });

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

  async processPayment(userId: string, orderId: string) {
    const result = await this.verifyPayment(orderId);
    return result;
  }

  async calculateDiscount(userId: string, totalBill: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }

    let discountPercentage = 0;
    switch (user.membershipType) {
      case 'cityfeed_club':
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
  }) {
    return this.paymentRepository.processDineInPayment(data);
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
  }) {
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

      // Create pending payment record
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

      return {
        order,
        paymentId: paymentRecord._id
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
      const order = await this.razorpay.orders.fetch(orderId);
      
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

      if (paymentRecord.status === 'completed') {
        throw new AppErrorClass('Payment was already processed', 400);
      }

      // Update payment record
      const updatedPayment = await this.paymentRepository.update(paymentRecord._id.toString(), {
        status: 'completed',
        razorpayPaymentId: payment.id,
        paidAt: new Date()
      });

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
} 