import { Payment } from '../models/payment.model';
import { IPayment } from '../interfaces/payment.interface';
import { AppErrorClass } from '../middleware/error.middleware';
import { FilterQuery } from 'mongoose';

export class PaymentRepository {
  
  async create(data: Partial<IPayment>) {
    const payment = new Payment(data);
    return payment.save();
  }

  async update(id: string, data: Partial<IPayment>) {
    return Payment.findByIdAndUpdate(id, data, { new: true });
  }

  async findById(id: string) {
    try {
      const payment = await Payment.findById(id);
      if (!payment) {
        throw new AppErrorClass('Payment not found', 404);
      }
      return payment;
    } catch (error) {
      throw new AppErrorClass('Failed to find payment', 500);
    }
  }

  async findByUser(userId: string) {
    try {
      const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
      return payments;
    } catch (error) {
      throw new AppErrorClass('Failed to find user payments', 500);
    }
  }

  async findByMerchant(merchantId: string) {
    try {
      const payments = await Payment.find({ merchantId }).sort({ createdAt: -1 });
      return payments;
    } catch (error) {
      throw new AppErrorClass('Failed to find merchant payments', 500);
    }
  }

  async delete(id: string) {
    try {
      const payment = await Payment.findByIdAndDelete(id);
      if (!payment) {
        throw new AppErrorClass('Payment not found', 404);
      }
      return payment;
    } catch (error) {
      throw new AppErrorClass('Failed to delete payment', 500);
    }
  }

  async createOrder(userId: string, amount: number) {
    try {
      const order = await Payment.create({
        userId,
        amount,
        status: 'pending'
      });
      return order;
    } catch (error) {
      throw new AppErrorClass('Failed to create order', 500);
    }
  }

  async verifyPayment(orderId: string) {
    try {
      const payment = await Payment.findOneAndUpdate(
        { _id: orderId },
        {
          status: 'completed',
          paidAt: new Date()
        },
        { new: true }
      );

      if (!payment) {
        throw new AppErrorClass('Order not found', 404);
      }

      return payment;
    } catch (error) {
      throw new AppErrorClass('Failed to verify payment', 500);
    }
  }

  async processDineInPayment(data: {
    userId: string;
    merchantId: string;
    offerId: string;
    totalBill: number;
    status?: 'pending' | 'completed';
    paymentMethod?: 'wallet' | 'razorpay';
    razorpayOrderId?: string;
  }) {
    try {
      const payment = await Payment.create({
        userId: data.userId,
        merchantId: data.merchantId,
        offerId: data.offerId,
        amount: data.totalBill,
        type: 'dine-in',
        status: data.status || 'completed',
        paymentMethod: data.paymentMethod || 'wallet',
        razorpayOrderId: data.razorpayOrderId,
        paidAt: data.status === 'completed' ? new Date() : undefined
      });

      return payment;
    } catch (error) {
      console.error('Error processing dine-in payment:', error);
      throw new AppErrorClass('Failed to process dine-in payment', 500);
    }
  }

  async getTransactionHistory(userId: string) {
    try {
      const transactions = await Payment.find({ userId })
        .populate({
          path: 'merchantId',
          select: 'name businessName'
        })
        .sort({ createdAt: -1 });
      return transactions;
    } catch (error) {
      throw new AppErrorClass('Failed to get transaction history', 500);
    }
  }

  async getDineInHistory(userId: string) {
    try {
      const sessions = await Payment.find({
        userId,
        type: 'dine-in'
      })
        .populate({
          path: 'merchantId',
          select: 'name businessName'
        })
        .sort({ createdAt: -1 });
      return sessions;
    } catch (error) {
      throw new AppErrorClass('Failed to get dine-in history', 500);
    }
  }

  async getMerchantDineInHistory(merchantId: string) {
    try {
      const sessions = await Payment.find({
        merchantId,
        type: 'dine-in'
      })
        .populate({
          path: 'merchantId',
          select: 'name businessName'
        })
        .sort({ createdAt: -1 });
      return sessions;
    } catch (error) {
      throw new AppErrorClass('Failed to get merchant dine-in history', 500);
    }
  }

  async getTransactionById(id: string) {
    try {
      const transaction = await Payment.findById(id);
      if (!transaction) {
        throw new AppErrorClass('Transaction not found', 404);
      }
      return transaction;
    } catch (error) {
      throw new AppErrorClass('Failed to get transaction', 500);
    }
  }

  async findOne(query: FilterQuery<IPayment>) {
    return Payment.findOne(query);
  }
} 