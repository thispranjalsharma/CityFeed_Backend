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

  async verifyPayment(paymentId: string, orderId: string, signature: string) {
    if (!this.razorpay) {
      throw new AppErrorClass('Payment service is not configured', 503);
    }

    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body.toString())
        .digest('hex');

      if (expectedSignature === signature) {
        return await this.razorpay.payments.fetch(paymentId);
      } else {
        throw new AppErrorClass('Invalid payment signature', 400);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw new AppErrorClass('Payment verification failed', 500);
    }
  }

  async processPayment(userId: string, paymentId: string, orderId: string, signature: string) {
    const payment = await this.verifyPayment(paymentId, orderId, signature);
    const amount = Number(payment.amount) / 100; // Convert from paise to rupees

    // Update user's coin balance
    await this.userRepository.update(userId, { $inc: { coins: amount } });

    return payment;
  }

  async calculateDiscount(userId: string, totalBill: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }

    let discountPercentage = 0;
    switch (user.membershipType) {
      case 'bronze':
        discountPercentage = 5;
        break;
      case 'silver':
        discountPercentage = 10;
        break;
      case 'gold':
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
} 