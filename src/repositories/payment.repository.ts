import { inject, injectable } from "inversify";
import { IPayment, Payment } from "../models/payment.model";
import { AppErrorClass } from "../utils/appError";
import { FilterQuery } from "mongoose";

export interface IPaymentRepository {
  create(data: Partial<IPayment>, session?: any): Promise<IPayment>;
  update(id: string, data: Partial<IPayment>): Promise<IPayment | null>;
  findById(id: string): Promise<IPayment | null>;
  findByUser(userId: string): Promise<IPayment[]>;
  findByOutlet(outletId: string): Promise<IPayment[]>;
  delete(id: string): Promise<IPayment | null>;
  verifyPayment(orderId: string): Promise<IPayment | null>;
  createOrder(userId: string, amount: number, type: string): Promise<IPayment>;
  getOrderById(id: string): Promise<IPayment | null>;
  getTransactionHistory(userId: string): Promise<IPayment[]>;
  processDineInPayment(data: {
    userId: string;
    outletId: string;
    offerId: string;
    totalBill: number; // original bill
    amount: number; // discounted amount
    status?: "pending" | "completed";
    paymentMethod?: "wallet" | "razorpay";
    razorpayOrderId?: string;
    dineInSessionId?: string;
  }): Promise<IPayment>;
  getTransactionById(id: string): Promise<IPayment | null>;
  getDineInHistory(userId: string): Promise<IPayment[]>;
  findOne(query: FilterQuery<IPayment>): Promise<IPayment | null>;
  getOutletDineInHistory(outletId: string): Promise<any>;
  getMonthlyDineInStats(
    outletIds: string | string[],
    year?: number
  ): Promise<any>;
}

@injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(@inject("PaymentModel") private paymentModel: typeof Payment) {}

  getOrderById(id: string): Promise<IPayment | null> {
    return this.paymentModel.findById(id);
  }

  async create(data: Partial<IPayment>, session?: any) {
    const payment = new Payment(data);
    return payment.save(session ? { session } : undefined);
  }

  async update(id: string, data: Partial<IPayment>) {
    return Payment.findByIdAndUpdate(id, data, { new: true });
  }

  async findById(id: string) {
    try {
      const payment = await this.paymentModel.findById(id);
      if (!payment) {
        throw new AppErrorClass("Payment not found", 404);
      }
      return payment;
    } catch (error) {
      throw new AppErrorClass("Failed to find payment", 500);
    }
  }

  async findByUser(userId: string) {
    try {
      const payments = await this.paymentModel
        .find({ userId })
        .sort({ createdAt: -1 });
      return payments;
    } catch (error) {
      throw new AppErrorClass("Failed to find user payments", 500);
    }
  }

  async findByOutlet(outletId: string) {
    try {
      const payments = await this.paymentModel
        .find({ outletId })
        .sort({ createdAt: -1 });
      return payments;
    } catch (error) {
      throw new AppErrorClass("Failed to find outlet payments", 500);
    }
  }

  async delete(id: string) {
    try {
      const payment = await this.paymentModel.findByIdAndDelete(id);
      if (!payment) {
        throw new AppErrorClass("Payment not found", 404);
      }
      return payment;
    } catch (error) {
      throw new AppErrorClass("Failed to delete payment", 500);
    }
  }

  async createOrder(userId: string, amount: number) {
    try {
      const order = await this.paymentModel.create({
        userId,
        amount,
        status: "pending",
      });
      return order;
    } catch (error) {
      throw new AppErrorClass("Failed to create order", 500);
    }
  }

  async verifyPayment(orderId: string) {
    try {
      const payment = await this.paymentModel.findOneAndUpdate(
        { _id: orderId },
        {
          status: "completed",
          paidAt: new Date(),
        },
        { new: true }
      );

      if (!payment) {
        throw new AppErrorClass("Order not found", 404);
      }

      return payment;
    } catch (error) {
      throw new AppErrorClass("Failed to verify payment", 500);
    }
  }

  async processDineInPayment(data: {
    userId: string;
    outletId: string;
    offerId: string;
    totalBill: number; // original bill
    amount: number; // discounted amount
    status?: "pending" | "completed";
    paymentMethod?: "wallet" | "razorpay";
    razorpayOrderId?: string;
    dineInSessionId?: string;
  }) {
    try {
      const payment = await this.paymentModel.create({
        userId: data.userId,
        outletId: data.outletId,
        offerId: data.offerId,
        totalBill: data.totalBill, // original bill
        amount: data.amount, // discounted amount
        type: "dine-in",
        status: data.status || "completed",
        paymentMethod: data.paymentMethod || "wallet",
        razorpayOrderId: data.razorpayOrderId,
        paidAt: data.status === "completed" ? new Date() : undefined,
        dineInSessionId: data.dineInSessionId,
      });
      return payment;
    } catch (error) {
      throw new AppErrorClass("Failed to process dine-in payment", 500);
    }
  }

  async getTransactionHistory(userId: string) {
    try {
      const transactions = await this.paymentModel
        .find({ userId })
        .populate({
          path: "outletId",
          select: "name businessName",
        })
        .sort({ createdAt: -1 });
      return transactions;
    } catch (error) {
      throw new AppErrorClass("Failed to get transaction history", 500);
    }
  }

  async getOutletDineInHistory(outletId: string) {
    try {
      const outletIdStr = outletId.toString();
      const sessions = await this.paymentModel
        .find({
          outletId: outletIdStr,
          type: "dine-in",
        })
        .populate({
          path: "outletId",
          select: "name businessName",
        })
        .sort({ createdAt: -1 });
      return sessions;
    } catch (error) {
      throw new AppErrorClass("Failed to get outlet dine-in history", 500);
    }
  }

  async getTransactionById(id: string) {
    try {
      const transaction = await this.paymentModel.findById(id);
      if (!transaction) {
        throw new AppErrorClass("Transaction not found", 404);
      }
      return transaction;
    } catch (error) {
      throw new AppErrorClass("Failed to get transaction", 500);
    }
  }

  async findOne(query: FilterQuery<IPayment>) {
    return Payment.findOne(query);
  }

  async getDineInHistory(userId: string) {
    try {
      const payments = await this.paymentModel
        .find({ userId, type: "dine-in" })
        .sort({
          createdAt: -1,
        });
      return payments;
    } catch (error) {
      throw new AppErrorClass("Failed to get dine-in history", 500);
    }
  }

  async getMonthlyDineInStats(outletIds: string | string[], year?: number) {
    try {
      const outletIdArr = Array.isArray(outletIds) ? outletIds : [outletIds];
      const match: any = {
        outletId: { $in: outletIdArr },
        type: "dine-in",
        status: "completed",
      };
      if (year) {
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);
        match.createdAt = { $gte: start, $lt: end };
      }
      const stats = await this.paymentModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalValue: { $sum: "$amount" },
            count: { $sum: 1 },
            avgBill: { $avg: "$amount" },
            uniqueCustomers: { $addToSet: "$userId" },
            paymentMethodBreakdown: {
              $push: "$paymentMethod",
            },
            offerIds: { $push: "$offerId" },
            totalBillSum: { $sum: { $ifNull: ["$totalBill", 0] } },
            finalAmountSum: { $sum: { $ifNull: ["$finalAmount", "$amount"] } },
          },
        },
        {
          $project: {
            year: "$_id.year",
            month: "$_id.month",
            totalValue: 1,
            count: 1,
            avgBill: 1,
            uniqueCustomers: { $size: "$uniqueCustomers" },
            paymentMethodBreakdown: {
              $arrayToObject: {
                $map: {
                  input: { $setUnion: ["$paymentMethodBreakdown", []] },
                  as: "method",
                  in: {
                    k: "$$method",
                    v: {
                      $size: {
                        $filter: {
                          input: "$paymentMethodBreakdown",
                          as: "m",
                          cond: { $eq: ["$$m", "$$method"] },
                        },
                      },
                    },
                  },
                },
              },
            },
            totalDiscount: { $subtract: ["$totalBillSum", "$finalAmountSum"] },
            offerIds: 1,
          },
        },
        {
          $addFields: {
            topOfferId: {
              $let: {
                vars: {
                  offerCounts: {
                    $map: {
                      input: { $setUnion: ["$offerIds", []] },
                      as: "oid",
                      in: {
                        offerId: "$$oid",
                        count: {
                          $size: {
                            $filter: {
                              input: "$offerIds",
                              as: "o",
                              cond: { $eq: ["$$o", "$$oid"] },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                in: {
                  $first: {
                    $slice: [
                      {
                        $filter: {
                          input: {
                            $reverseArray: {
                              $sortArray: {
                                input: "$$offerCounts",
                                sortBy: { count: -1 },
                              },
                            },
                          },
                          as: "item",
                          cond: { $ne: ["$$item.offerId", null] },
                        },
                      },
                      1,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            offerIds: 0,
          },
        },
        { $sort: { year: 1, month: 1 } },
      ]);
      return stats.map((item) => ({
        year: item.year,
        month: item.month,
        totalValue: item.totalValue,
        count: item.count,
        avgBill: item.avgBill,
        uniqueCustomers: item.uniqueCustomers,
        paymentMethodBreakdown: item.paymentMethodBreakdown,
        totalDiscount: item.totalDiscount,
        topOfferId: item.topOfferId ? item.topOfferId.offerId : null,
      }));
    } catch (error) {
      throw new AppErrorClass("Failed to get monthly dine-in stats", 500);
    }
  }
}
