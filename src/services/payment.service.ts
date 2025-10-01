import dotenv from "dotenv";
import { inject, injectable } from "inversify";
import { logger } from "../utils/logger.util";
import { AppErrorClass } from "../utils/appError";
import { config } from "../config/config";
import crypto from "crypto";

import {
  IUserRepository,
  UserRepository,
} from "../repositories/user.repository";
import {
  IPaymentRepository,
  PaymentRepository,
} from "../repositories/payment.repository";
import {
  DineInSessionRepository,
  IDineInSessionRepository,
} from "../repositories/dineInSession.repository";
import {
  IOutletRepository,
  OutletRepository,
} from "../repositories/outlet.repository";
import {
  EventRepository,
  IEventRepository,
} from "../repositories/event.repository";

import { IRewardService, RewardService } from "./reward.service";
import { IOtpService, OTPService } from "./otp.service";

import {
  DirectPaymentResponse,
  InsufficientCoinsResponse,
  OTPRequiredResponse,
  PaymentServiceResponse,
} from "../models/payment.model";
import Razorpay from "razorpay";
import { PaymentCreateDTO } from "src/dto";

dotenv.config();

export interface IPaymentService {
  // Define methods for the payment service here

  // private razorpay: Razorpay.Type | null = null;
  processDineInPayment(data: {
    userId: string;
    outletId: string;
    offerId: string;
    totalBill: number;
    paymentMethod?: "wallet" | "razorpay";
    useRewardPoints?: boolean;
    rewardPointsToUse?: number;
    otp?: string; //
  }): Promise<PaymentServiceResponse>;

  createRazorpayOrder(
    amount: number,
    userId: string,
    orderId: string,
    type: string
  ): Promise<any>;

  verifyOTP(phone: string, otp: string): Promise<boolean>;
  sendOTP(phone: string): Promise<any>;

  calculateDiscount(
    userId: string,
    totalBill: number,
    outletId?: string,
    eventId?: string,
    maxDiscountPercentageFromFrontend?: number
  ): Promise<{
    discountAmount: number;
    finalAmount: number;
    rewardPointsToAdd: number;
    maxDiscountPercentage: number;
    membershipDiscountPercentage: number;
  }>;

  useRewardPoints(
    userId: string,
    totalBill: number,
    rewardPointsToUse: number,
    sourceType:
      | "dine-in"
      | "event"
      | "referral"
      | "membership"
      | "adjustment"
      | "refund",
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string
  ): Promise<any>;

  addRewardCoinsToUser(
    userId: string,
    rewardPointsToAdd: number,
    sourceType:
      | "dine-in"
      | "event"
      | "referral"
      | "membership"
      | "adjustment"
      | "refund",
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string,
    referredUserId?: string
  ): Promise<void>;

  getTransactionHistory(userId: string);
  getOrderById(orderId: string): Promise<any>;
  getTransactionById(id: string);
  getDineInHistory(userId: string);
  createRechargeOrder(userId: string, amount: number): Promise<any>;
  verifyPayment(orderId: string): Promise<{ amount: number; payment: any }>;
  verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean>;
  getOutletDineInHistory(outletId: string): Promise<any>;
  getUserByQRCode(qrCodeData: string): Promise<any>;
  getUserByPhone(phone: string): Promise<any>;
  sendOTPToPhoneAndEmail(phone: string, email: string): Promise<any>;
  getUserById(id: string): Promise<any>;
  hasExistingMerchantDineInPayment(
    userId: string,
    outletId: string,
    billAmount: number,
    since: Date
  ): Promise<boolean>;
  recordMerchantDineInPayment(data: {
    userId: string;
    outletId: string;
    billAmount: number;
    coinsUsed: number;
    cashAmount: number;
    merchantId: string | null;
    paymentMethod: "upi" | "cash" | "card";
    session?: any;
  }): Promise<any>;
  createPayment(paymentData: {
    userId: string;
    amount: number;
    type: "recharge" | "dine-in" | "refund" | "membership_purchase";
    paymentMethod: "wallet" | "razorpay";
    razorpayOrderId?: string;
    status: "pending" | "completed" | "failed" | "refunded";
  }): Promise<any>;

  createOrder(userId: string, amount: number, type: string): Promise<any>;
  getPaymentByOrderId(orderId: string): Promise<any>;
}

@injectable()
export class PaymentService implements IPaymentService {
  private razorpay: Razorpay | null = null;

  constructor(
    @inject("PaymentRepository") private paymentRepository: IPaymentRepository,
    @inject("UserRepository") private userRepository: IUserRepository,

    @inject("DineInSessionRepository")
    private DineInSessionRepository: IDineInSessionRepository,
    @inject("RewardService") private rewardService: IRewardService,
    @inject("OTPService") private otpService: IOtpService,
    @inject("OutletRepository") private outletRepository: IOutletRepository,
    @inject("EventRepository") private eventRepository: IEventRepository
  ) {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    } else {
      this.razorpay = null;
    }
  }

  getPaymentByOrderId(orderId: string): Promise<any> {
    return this.paymentRepository.getOrderById(orderId);
  }

  async createOrder(
    userId: string,
    amount: number,
    paymentType: "recharge" | "membership_purchase"
  ) {
    if (!this.razorpay) {
      throw new AppErrorClass("Payment service is not configured", 503);
    }

    try {
      const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `${paymentType}_${Date.now()}`,
        notes: {
          userId,
          type: paymentType,
        },
      };

      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      logger.error("Error creating Razorpay order:", error);
      throw new AppErrorClass("Failed to create payment order", 500);
    }
  }

  async createPayment(data: PaymentCreateDTO): Promise<any> {
    return this.paymentRepository.create({
      userId: data.userId,
      outletId: data.outletId,
      amount: data.amount,
      coinsUsed: data.coinsUsed,
      cashAmount: data.cashAmount,
      nonCoinPaymentMethod: data.nonCoinPaymentMethod,
      type: data.type,
      status: data.status,
      paymentMethod: data.paymentMethod,
    });
  }

  public async hasExistingMerchantDineInPayment(
    userId: string,
    outletId: string,
    billAmount: number,
    since: Date
  ): Promise<boolean> {
    const existing = await this.paymentRepository.findOne({
      userId,
      outletId,
      amount: billAmount,
      status: "completed",
      type: "dine-in",
      createdAt: { $gte: since },
    });
    return !!existing;
  }

  getUserById(id: string): Promise<any> {
    return this.userRepository.findById(id);
  }

  public async recordMerchantDineInPayment({
    userId,
    outletId,
    billAmount,
    coinsUsed,
    cashAmount,
    merchantId,
    paymentMethod,
    session,
  }: {
    userId: string;
    outletId: string;
    billAmount: number;
    coinsUsed: number;
    cashAmount: number;
    merchantId: string | null;
    paymentMethod: "upi" | "cash" | "card";
    session?: any;
  }) {
    return await this.paymentRepository.create(
      {
        userId,
        outletId,
        amount: billAmount,
        coinsUsed,
        cashAmount,
        nonCoinPaymentMethod: paymentMethod,
        type: "dine-in",
        status: "completed",
        paymentMethod,
        createdAt: new Date(),
      },
      session
    );
  }

  public async sendOTPToPhoneAndEmail(
    phone: string,
    email: string
  ): Promise<any> {
    return this.otpService.sendOTPToPhoneAndEmail(phone, email);
  }

  public async getUserByPhone(phone: string) {
    return this.userRepository.findByPhone(phone);
  }

  public async getUserByQRCode(qrCodeData: string) {
    try {
      // Handle escaped newlines in the QR code data
      let processedQRData = qrCodeData;

      // If the data contains escaped newlines, convert them to actual newlines
      if (qrCodeData.includes("\\n")) {
        processedQRData = qrCodeData.replace(/\\n/g, "\n");
      }

      // Parse the QR code text data
      const lines = processedQRData.split("\n");
      let email = "";
      let phone = "";
      let name = "";
      let userId = "";

      // Extract information from the QR code text
      for (const line of lines) {
        if (line.startsWith("User ID:")) {
          userId = line.replace("User ID:", "").trim();
        } else if (line.startsWith("Email:")) {
          email = line.replace("Email:", "").trim();
        } else if (line.startsWith("Phone:")) {
          phone = line.replace("Phone:", "").trim();
        } else if (line.startsWith("Name:")) {
          name = line.replace("Name:", "").trim();
        }
      }

      // Try to find user by userId first, then by email, then by phone
      let user = null;
      if (userId) {
        user = await this.userRepository.findById(userId);
      }

      if (!user && email) {
        user = await this.userRepository.findByEmail(email);
      }

      if (!user && phone) {
        user = await this.userRepository.findByPhone(phone);
      }

      if (!user) {
        throw new AppErrorClass("User not found", 404);
      }

      // Verify that the user is active
      if (!user.isActive) {
        throw new AppErrorClass("User account is not active", 400);
      }

      return user;
    } catch (error) {
      if (error instanceof AppErrorClass) {
        throw error;
      }
      logger.error("Error fetching user by QR code:", error);
      throw new AppErrorClass("Invalid QR code", 400);
    }
  }

  async getOutletDineInHistory(outletId: string) {
    return this.paymentRepository.getOutletDineInHistory(outletId);
  }

  async verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean> {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(orderId + "|" + paymentId)
      .digest("hex");
    return generatedSignature === signature;
  }

  async verifyPayment(orderId: string) {
    if (!this.razorpay) {
      throw new AppErrorClass("Payment service is not configured", 503);
    }

    try {
      // Get the order details from Razorpay

      // Get the payment details
      const payments = await this.razorpay.orders.fetchPayments(orderId);

      // Check if there are any payments
      if (!payments || !payments.items || payments.items.length === 0) {
        throw new AppErrorClass(
          "No payment found for this order. Please complete the payment first.",
          400
        );
      }

      const payment = payments.items[0];

      // Check payment status
      if (payment.status !== "captured") {
        throw new AppErrorClass(
          "Payment is not completed yet. Please wait for the payment to be processed.",
          400
        );
      }

      const amount = Math.round(Number(payment.amount) / 100); // Convert from paise to rupees and round to integer

      // Find the payment record in our database
      const paymentRecord = await this.paymentRepository.findOne({
        razorpayOrderId: orderId,
      });
      if (!paymentRecord) {
        throw new AppErrorClass("Payment record not found", 404);
      }

      // Check if payment was already processed
      if (paymentRecord.status === "completed") {
        throw new AppErrorClass("Payment was already processed", 400);
      }

      // Update payment status in database
      await this.paymentRepository.update(paymentRecord.id.toString(), {
        status: "completed",
        razorpayPaymentId: payment.id,
        paidAt: new Date(),
      });

      // Update user's wallet only for recharge payments
      if (paymentRecord.type === "recharge") {
        const user = await this.userRepository.findById(paymentRecord.userId);
        if (user) {
          await this.userRepository.update(paymentRecord.userId, {
            coins: (user.coins || 0) + amount,
          });
        }
      } else if (paymentRecord.type === "membership_purchase") {
        // For membership upgrades, we don't need to do anything here
        // The membership upgrade verification is handled in the verifyMembershipUpgrade controller
      }

      return {
        amount,
        payment,
      };
    } catch (error) {
      logger.error("Error verifying payment:", error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass(
        "Payment verification failed. Please try again.",
        500
      );
    }
  }

  async createRechargeOrder(userId: string, amount: number) {
    if (!this.razorpay) {
      throw new AppErrorClass("Payment service is not configured", 503);
    }

    try {
      // Create Razorpay order
      const order = await this.paymentRepository.createOrder(
        userId,
        amount,
        "recharge"
      );

      // Create pending payment record
      await this.paymentRepository.create({
        userId,
        amount,
        type: "recharge",
        status: "pending",
        paymentMethod: "razorpay",
        razorpayOrderId: order.id,
        createdAt: new Date(),
      });

      return order;
    } catch (error) {
      logger.error("Error creating recharge order:", error);
      throw new AppErrorClass("Failed to create recharge order", 500);
    }
  }

  async getDineInHistory(userId: string) {
    return this.paymentRepository.getDineInHistory(userId);
  }

  getOrderById(orderId: string): Promise<any> {
    return this.paymentRepository.getOrderById(orderId);
  }

  public useRewardPoints(
    userId: string,
    totalBill: number,
    rewardPointsToUse: number,
    sourceType:
      | "dine-in"
      | "event"
      | "referral"
      | "membership"
      | "adjustment"
      | "refund" = "dine-in",
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string
  ): Promise<any> {
    return this.rewardService.useRewardPoints(
      userId,
      totalBill,
      rewardPointsToUse,
      sourceType,
      sourceId,
      outletId,
      eventId,
      description
    );
  }

  async getTransactionHistory(userId: string) {
    return this.paymentRepository.getTransactionHistory(userId);
  }

  public async addRewardCoinsToUser(
    userId: string,
    rewardPointsToAdd: number,
    sourceType:
      | "dine-in"
      | "event"
      | "referral"
      | "membership"
      | "adjustment"
      | "refund" = "dine-in",
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string,
    referredUserId?: string
  ): Promise<void> {
    await this.rewardService.addRewardPoints(
      userId,
      rewardPointsToAdd,
      sourceType,
      sourceId,
      outletId,
      eventId,
      description,
      referredUserId
    );
  }

  public async sendOTP(phone: string): Promise<any> {
    return this.otpService.sendOTP(phone);
  }

  public async verifyOTP(phone: string, otp: string): Promise<boolean> {
    return this.otpService.verifyOTP(phone, otp);
  }

  async calculateDiscount(
    userId: string,
    totalBill: number,
    outletId?: string,
    eventId?: string,
    maxDiscountPercentageFromFrontend?: number
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }

    let maxDiscountPercentage = 15; // Default max discount
    if (typeof maxDiscountPercentageFromFrontend === "number") {
      // If provided by frontend, use it directly for reward calculation
      const discountAmount =
        (totalBill * maxDiscountPercentageFromFrontend) / 100;
      const finalAmount = totalBill;
      return {
        discountAmount,
        finalAmount,
        rewardPointsToAdd: Math.round(discountAmount),
        maxDiscountPercentage: maxDiscountPercentageFromFrontend,
        membershipDiscountPercentage: maxDiscountPercentageFromFrontend,
      };
    }
    // If not provided, use the original logic
    if (outletId) {
      const outlet = await this.outletRepository.findById(outletId);
      if (outlet) {
        maxDiscountPercentage = outlet.defaultMaxDiscount;
      }
    }

    let discountPercentage = 0;
    if (eventId) {
      // Use environment variables for event discounts
      switch (user.membershipType) {
        case "cityfeed_select":
          discountPercentage = config.eventDiscountPercentages.cityfeed_select;
          break;
        case "cityfeed_edge":
          discountPercentage = config.eventDiscountPercentages.cityfeed_edge;
          break;
        case "cityfeed_prime":
          discountPercentage = config.eventDiscountPercentages.cityfeed_prime;
          break;
        default:
          discountPercentage = 0;
      }
    } else {
      // For non-event discounts (dine-in), use the original logic
      switch (user.membershipType) {
        case "cityfeed_select":
          discountPercentage = Math.round(maxDiscountPercentage * 0.3);
          break;
        case "cityfeed_edge":
          discountPercentage = Math.round(maxDiscountPercentage * 0.6);
          break;
        case "cityfeed_prime":
          discountPercentage = maxDiscountPercentage;
          break;
        default:
          discountPercentage = 0;
      }
    }
    const discountAmount = (totalBill * discountPercentage) / 100;
    const finalAmount = totalBill;
    return {
      discountAmount,
      finalAmount,
      rewardPointsToAdd: Math.round(discountAmount),
      maxDiscountPercentage,
      membershipDiscountPercentage: discountPercentage,
    };
  }

  async processDineInPayment(data: {
    userId: string;
    outletId: string;
    offerId: string;
    totalBill: number;
    paymentMethod?: "wallet" | "razorpay";
    useRewardPoints?: boolean;
    rewardPointsToUse?: number;
    otp?: string;
  }): Promise<PaymentServiceResponse> {
    try {
      // Calculate discount for both payment methods
      const { finalAmount, rewardPointsToAdd } = await this.calculateDiscount(
        data.userId,
        data.totalBill,
        data.outletId
      );
      const roundedFinalAmount = Math.round(finalAmount);

      // Get user details
      const user = await this.userRepository.findById(data.userId);
      if (!user) {
        throw new AppErrorClass("User not found", 404);
      }

      // Handle reward points usage if requested
      let remainingBill = roundedFinalAmount;
      let rewardPointsDeducted = 0;

      if (data.useRewardPoints && data.rewardPointsToUse) {
        // Verify OTP if provided
        if (data.otp) {
          const isValidOTP = await this.otpService.verifyOTP(
            user.phone,
            data.otp
          );
          if (!isValidOTP) {
            throw new AppErrorClass("Invalid OTP", 400);
          }
        } else {
          // Send OTP if not provided
          await this.otpService.sendOTPToPhoneAndEmail(user.phone, user.email);
          return {
            status: "otp_required",
            message: "OTP has been sent to your phone number and email",
            finalAmount: roundedFinalAmount,
          } as OTPRequiredResponse;
        }

        // Use reward points
        const result = await this.rewardService.useRewardPoints(
          data.userId,
          roundedFinalAmount,
          data.rewardPointsToUse,
          "dine-in",
          undefined, // sourceId will be set later when payment is created
          data.outletId,
          undefined,
          `Used ${data.rewardPointsToUse} reward points for dine-in payment`
        );
        rewardPointsDeducted = result.rewardPointsDeducted;
        remainingBill = result.remainingBill;
      }

      // Find the active dine-in session for this user and outlet
      const activeSession =
        await this.DineInSessionRepository.findActiveSession(
          data.userId,
          data.outletId
        );
      let dineInSessionId: string | undefined = undefined;
      if (activeSession) {
        dineInSessionId = activeSession._id.toString();
      }

      // Handle payment based on method
      if (data.paymentMethod === "razorpay") {
        if (!this.razorpay) {
          throw new AppErrorClass("Payment service is not configured", 503);
        }

        // Create Razorpay order for remaining amount
        const order = await this.razorpay.orders.create({
          amount: remainingBill * 100, // Convert to paise
          currency: "INR",
          receipt: `dine_in_${Date.now()}`,
          notes: {
            userId: data.userId,
            outletId: data.outletId,
            offerId: data.offerId,
            type: "dine_in",
            rewardPointsDeducted: rewardPointsDeducted.toString(),
          },
        });

        // Create pending payment record
        const payment = await this.paymentRepository.create({
          userId: data.userId,
          outletId: data.outletId,
          offerId: data.offerId,
          amount: remainingBill,
          totalBill: data.totalBill, // original bill from request
          type: "dine-in",
          status: "pending",
          paymentMethod: "razorpay",
          razorpayOrderId: order.id,
          dineInSessionId,
        });

        return {
          order,
          paymentId: payment._id,
          keyId: process.env.RAZORPAY_KEY_ID || "",
        } as DirectPaymentResponse;
      }

      // Handle wallet payment
      if (user.coins < remainingBill) {
        return {
          status: "insufficient_coins",
          requiredCoins: remainingBill,
          currentCoins: user.coins,
          finalAmount: roundedFinalAmount,
          _id: null,
          orderDetails: null,
        } as InsufficientCoinsResponse;
      }

      // Process payment with coins
      const payment = await this.paymentRepository.processDineInPayment({
        userId: data.userId,
        outletId: data.outletId,
        offerId: data.offerId,
        totalBill: data.totalBill, // original bill from request
        amount: roundedFinalAmount, // discounted amount to be paid
        status: "completed",
        paymentMethod: "wallet",
        dineInSessionId,
      });

      // Deduct coins from user's wallet
      await this.userRepository.update(data.userId, {
        coins: user.coins - remainingBill,
      });

      // Add reward points for the payment (discount amount as reward)
      try {
        await this.rewardService.addRewardPoints(
          data.userId,
          rewardPointsToAdd,
          "dine-in",
          payment.id.toString(),
          data.outletId,
          undefined,
          `Earned ${rewardPointsToAdd} reward points from dine-in payment`
        );
      } catch (error) {
        logger.error("Error adding reward points:", error);
      }

      // Update dine-in session status to completed
      const sessionToUpdate =
        await this.DineInSessionRepository.findActiveSession(
          data.userId,
          data.outletId
        );
      if (sessionToUpdate) {
        const sessionId = sessionToUpdate._id.toString();
        const paymentId = payment._id.toString();
        await this.DineInSessionRepository.update(sessionId, {
          status: "completed",
          endTime: new Date(),
          totalBill: roundedFinalAmount,
          paymentId,
        });
      }

      // Referral reward: check if this is the user's first completed dine-in
      const userDineIns = await this.DineInSessionRepository.findByUserId(
        data.userId
      );
      const completedDineIns = userDineIns.filter(
        (s) => s.status === "completed"
      );
      if (completedDineIns.length === 1) {
        // First completed dine-in
        const user = await this.userRepository.findById(data.userId);
        if (user && user.referredBy) {
          // Check if bill amount meets minimum requirement for referral reward
          if (data.totalBill >= config.referralReward.minDineInAmount) {
            // Find the referrer by referralCode
            const referrer = await this.userRepository.findOne({
              referralCode: user.referredBy,
            });
            if (referrer) {
              // Give referral reward coins using amount from config
              await this.rewardService.addRewardPoints(
                referrer._id.toString(),
                config.referralReward.amount,
                "referral",
                payment._id.toString(),
                data.outletId,
                undefined,
                `Referral reward: ${user.name} completed their first dine-in (₹${data.totalBill})`,
                user._id.toString() // referred user ID
              );
              logger.info(
                `Referral reward given: ${config.referralReward.amount} coins to referrer ${referrer._id} for user ${user._id} first dine-in with bill ₹${data.totalBill}`
              );
            }
          } else {
            logger.info(
              `Referral reward not given: Bill amount ₹${data.totalBill} is below minimum ₹${config.referralReward.minDineInAmount} for user ${user._id} first dine-in`
            );
          }
        }
      }

      return payment;
    } catch (error) {
      logger.error("Error processing dine-in payment:", error);
      throw new AppErrorClass("Failed to process payment", 500);
    }
  }

  async createRazorpayOrder(
    amount: number,
    userId: string,
    orderId: string,
    type: string
  ) {
    if (!this.razorpay) {
      throw new AppErrorClass("Payment service is not configured", 503);
    }
    // Ensure receipt is <= 40 chars
    const shortOrderId = orderId.length > 24 ? orderId.slice(-24) : orderId;
    const receipt = `evt_${shortOrderId}_${Date.now()}`.slice(0, 40);
    const order = await this.razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt,
      notes: {
        userId,
        orderId,
        type,
      },
    });
    return order;
  }

  async getTransactionById(id: string) {
    return this.paymentRepository.getTransactionById(id);
  }
}
