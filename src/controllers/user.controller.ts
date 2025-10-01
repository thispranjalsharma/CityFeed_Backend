import { injectable, inject } from "inversify";
import { Response, Request } from "express";
import { AuthRequest, TokenPayload } from "../interfaces/auth.interface";
import { IUserService } from "../services/user.service";
import { BaseController } from "./base.controller";
import { IPaymentService } from "src/services/payment.service";
import { IReviewService } from "src/services/review.service";
import { SendGridService } from "../services/sendgrid.service";

import { Staff } from "../models/staff.model";

import { logger } from "../utils/logger.util";
import mongoose from "mongoose";
import { Ticket } from "../models/ticket.model";
import {
  UserUpdateDTO,
  UserResponseDTO,
  UserProfileUpdateDTO,
  UserPasswordChangeDTO,
  UserMembershipUpdateDTO,
  UserCoinsUpdateDTO,
  UserSearchDTO,
  PaginatedResponse,
  BaseResponse,
} from "../dto";
import { User } from "../models/user.model";
import { IRewardService } from "../services/reward.service";
import { EmailQueueService } from "../services/emailQueue.service";

@injectable()
export class UserController extends BaseController {
  private sendGridService = SendGridService.getInstance();

  constructor(
    @inject("UserService") private readonly userService: IUserService,
    @inject("PaymentService") private readonly paymentService: IPaymentService,
    @inject("ReviewService") private readonly reviewService: IReviewService,
    @inject("RewardService") private readonly rewardService: IRewardService,
    @inject("EmailQueueService") emailQueueService: EmailQueueService
  ) {
    super(emailQueueService);
  }

  activateUserByAdmin = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findByIdAndUpdate(
        id,
        { isActive: true },
        { new: true }
      );
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.status(200).json({
        success: true,
        message: "User activated successfully",
        data: user,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, "User not found", 404);
      }

      const userProfile = await this.userService.findById(user._id);
      if (!userProfile) {
        return this.sendError(res, "User profile not found", 404);
      }

      // Convert to DTO response
      const profileData: UserResponseDTO = {
        _id: userProfile._id.toString(),
        name: userProfile.name,
        email: userProfile.email,
        dob: userProfile.dob,
        gender: userProfile.gender,
        phone: userProfile.phone,
        membershipType: userProfile.membershipType,
        membershipExpiryDate: userProfile.membershipExpiryDate,
        role: userProfile.role,
        coins: userProfile.coins,
        isActive: userProfile.isActive,
        isEmailVerified: userProfile.isEmailVerified,
        isPhoneVerified: userProfile.isPhoneVerified,
        isApproved: userProfile.isApproved,
        isDeleted: userProfile.isDeleted,
        deletedAt: userProfile.deletedAt,
        profilePicture: userProfile.profilePicture,
        address: userProfile.address,
        preferences: userProfile.preferences,
        lastLogin: userProfile.lastLogin,
        isGuest: userProfile.isGuest,
        referralCode: userProfile.referralCode,
        referredBy: userProfile.referredBy,
        qrCodeUrl: userProfile.qrCodeUrl,
        fullName: userProfile.name, // Assuming fullName is same as name
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
      };

      const response: BaseResponse = {
        success: true,
        message: "Profile retrieved successfully",
        data: profileData,
      };

      return this.sendSuccess(res, response.data, response.message);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user: UserUpdateDTO = req.user as UserUpdateDTO;
      if (!user?._id) {
        return this.sendError(res, "User not found", 404);
      }

      const updateData: UserProfileUpdateDTO = req.body;

      // Validate gender if provided
      if (
        updateData.gender &&
        !["male", "female", "other"].includes(updateData.gender)
      ) {
        return this.sendError(
          res,
          "Invalid gender value. Must be one of: male, female, other",
          400
        );
      }

      // Validate membership type if provided
      if (
        updateData.membershipType &&
        !["cityfeed_select", "cityfeed_edge", "cityfeed_prime"].includes(
          updateData.membershipType
        )
      ) {
        return this.sendError(
          res,
          "Invalid membership type. Must be one of: cityfeed_select, cityfeed_edge, cityfeed_prime",
          400
        );
      }

      // Get current user data for comparison
      const currentUser = await this.userService.findById(user._id);
      if (!currentUser) {
        return this.sendError(res, "User not found", 404);
      }

      // Validate and check email uniqueness if provided
      if (updateData.email) {
        // Normalize email to lowercase
        updateData.email = updateData.email.toLowerCase();

        // Check if email is different from current user's email
        if (currentUser.email !== updateData.email) {
          // Check if email is already taken by another verified user
          const existingVerifiedUser =
            await this.userService.findVerifiedUserByEmail(updateData.email);
          if (existingVerifiedUser) {
            return this.sendError(
              res,
              "Email address is already registered with a verified account",
              400
            );
          }
        }
      }

      // Validate and check phone uniqueness if provided
      if (updateData.phone) {
        // Check if phone is different from current user's phone
        if (currentUser.phone !== updateData.phone) {
          // Check if phone is already taken by another user
          const existingUserWithPhone = await this.userService.findByPhone(
            updateData.phone
          );
          if (existingUserWithPhone) {
            return this.sendError(
              res,
              "Phone number is already registered with another account",
              400
            );
          }
        }
      }

      // Convert dob string to Date object if provided
      if (updateData.dob) {
        try {
          updateData.dob = new Date(updateData.dob);
          if (isNaN(updateData.dob.getTime())) {
            return this.sendError(res, "Invalid date of birth format", 400);
          }
        } catch (error) {
          return this.sendError(res, "Invalid date of birth format", 400);
        }
      }

      // If user is updating to a new email, reset email verification status
      if (updateData.email && currentUser.email !== updateData.email) {
        updateData.isEmailVerified = false;
      }

      // Remove undefined values from updateData
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Check if any QR-relevant fields are being updated
      const qrFields = ["name", "email", "phone", "membershipType"];
      let shouldUpdateQR = false;
      for (const field of qrFields) {
        if (req.body[field]) {
          const newValue =
            field === "email" ? req.body[field].toLowerCase() : req.body[field];
          if (newValue !== currentUser[field]) {
            shouldUpdateQR = true;
            break;
          }
        }
      }

      const updatedUser = await this.userService.update(user._id, updateData);
      if (!updatedUser) {
        return this.sendError(res, "Failed to update profile", 400);
      }

      // If relevant fields changed, regenerate QR code
      if (shouldUpdateQR) {
        const QRCode = (await import("qrcode")).default;
        const cloudinary = (await import("../config/cloudinary")).default;
        const qrPayload =
          "==============================\n" +
          "  🪪 CityFeed Membership QR  🪪\n" +
          "==============================\n" +
          `Name: ${updatedUser.name}\n` +
          `Email: ${updatedUser.email}\n` +
          `Phone: ${updatedUser.phone}\n` +
          `Membership: ${updatedUser.membershipType}\n` +
          `Expiry: ${
            updatedUser.membershipExpiryDate
              ? updatedUser.membershipExpiryDate.toISOString().split("T")[0]
              : ""
          }\n` +
          "------------------------------\n" +
          "Show this QR code for membership verification.\n" +
          "==============================";
        const qrBuffer = await QRCode.toBuffer(qrPayload);
        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image", folder: "user_qr" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(qrBuffer);
        });
        const qrCodeUrl = (uploadResult as any).secure_url;
        updatedUser.qrCodeUrl = qrCodeUrl;
        await updatedUser.save();
      }

      this.sendSuccess(res, updatedUser, "Profile updated successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  deleteProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, "User not found", 404);
      }

      const deleted = await this.userService.delete(user._id);
      if (!deleted) {
        return this.sendError(res, "User not found", 404);
      }

      this.sendSuccess(res, { message: "Profile deleted successfully" });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getUserOffers = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const offers = await this.userService.getUserOffers(userId);
      this.sendSuccess(res, offers);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getUserTransactions = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const transactions = await this.userService.getUserTransactions(userId);
      this.sendSuccess(res, transactions);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getUserCoins = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const coins = await this.userService.getUserCoins(userId);
      this.sendSuccess(res, { coins });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  addCoins = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return this.sendError(res, "Invalid amount", 400);
      }

      const result = await this.userService.addCoins(userId, amount);
      this.sendSuccess(res, result, "Coins added successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  deductCoins = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return this.sendError(res, "Invalid amount", 400);
      }

      const result = await this.userService.deductCoins(userId, amount);
      this.sendSuccess(res, result, "Coins deducted successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  initiateMembershipUpgrade = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const { targetMembershipType } = req.body;

      // Get current user
      const user = await this.userService.findById(userId);
      if (!user) {
        return this.sendError(res, "User not found", 404);
      }

      // Check if user is already at or above the target tier
      const membershipTiers = [
        "cityfeed_select",
        "cityfeed_edge",
        "cityfeed_prime",
      ];
      const currentTierIndex = membershipTiers.indexOf(user.membershipType);
      const targetTierIndex = membershipTiers.indexOf(targetMembershipType);

      if (currentTierIndex >= targetTierIndex) {
        return this.sendError(res, "Cannot upgrade to same or lower tier", 400);
      }

      // Calculate upgrade cost
      const upgradeCosts = {
        cityfeed_edge: 500, // ₹500 for cityfeed_edge
        cityfeed_prime: 1000, // ₹1000 for cityfeed_prime
      };

      const amount =
        upgradeCosts[targetMembershipType as keyof typeof upgradeCosts];

      // Create Razorpay order
      const order = await this.paymentService.createOrder(
        userId,
        amount,
        "membership_purchase"
      );

      // Create pending payment record
      await this.paymentService.createPayment({
        userId,
        amount,
        type: "membership_purchase",
        paymentMethod: "razorpay",
        razorpayOrderId: order.id,
        status: "pending",
      });

      this.sendSuccess(res, {
        order,
        targetMembershipType,
        amount,
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  upgradeMembership = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const { targetMembershipType, paymentMethod } = req.body;

      // Get current user
      const user = await this.userService.findById(userId);
      if (!user) {
        return this.sendError(res, "User not found", 404);
      }

      // Check if user is already at or above the target tier
      const membershipTiers = [
        "cityfeed_select",
        "cityfeed_edge",
        "cityfeed_prime",
      ] as const;
      const currentTierIndex = membershipTiers.indexOf(user.membershipType);
      const targetTierIndex = membershipTiers.indexOf(
        targetMembershipType as (typeof membershipTiers)[number]
      );

      if (currentTierIndex >= targetTierIndex) {
        return this.sendError(res, "Cannot upgrade to same or lower tier", 400);
      }

      // Define membership prices
      const membershipPrices = {
        cityfeed_select: 499,
        cityfeed_edge: 999,
        cityfeed_prime: 1499,
      } as const;

      // Calculate upgrade cost
      const amount =
        membershipPrices[targetMembershipType as keyof typeof membershipPrices];

      if (paymentMethod === "wallet") {
        // Check if user has enough coins
        if (user.coins < amount) {
          return this.sendError(res, "Insufficient coins in wallet", 400);
        }

        // Create payment record
        await this.paymentService.createPayment({
          userId,
          amount,
          type: "membership_purchase",
          paymentMethod: "wallet",
          status: "completed",
        });

        // Deduct coins from user's wallet
        await this.userService.update(userId, { coins: user.coins - amount });

        // Update membership type and expiry date using DTO
        const membershipExpiryDate = new Date();
        membershipExpiryDate.setFullYear(
          membershipExpiryDate.getFullYear() + 1
        );

        const membershipUpdate: UserMembershipUpdateDTO = {
          membershipType:
            targetMembershipType as UserMembershipUpdateDTO["membershipType"],
          membershipExpiryDate,
        };

        await this.userService.update(userId, membershipUpdate);

        return this.sendSuccess(res, {
          message: "Membership upgraded successfully",
          newMembershipType: targetMembershipType,
          expiryDate: membershipExpiryDate,
        });
      } else {
        // Handle Razorpay payment
        const order = await this.paymentService.createOrder(
          userId,
          amount,
          "membership_purchase"
        );

        // Create pending payment record
        await this.paymentService.createPayment({
          userId,
          amount,
          type: "membership_purchase",
          paymentMethod: "razorpay",
          razorpayOrderId: order.id,
          status: "pending",
        });

        return this.sendSuccess(res, {
          order,
          targetMembershipType,
          amount,
        });
      }
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  verifyMembershipUpgrade = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return this.sendError(res, "User not authenticated", 401);
      }

      const { orderId } = req.body;

      // Verify payment
      await this.paymentService.verifyPayment(orderId);

      // Get the payment record
      const payment = await this.paymentService.getPaymentByOrderId(orderId);
      if (!payment) {
        return this.sendError(res, "Payment record not found", 404);
      }

      // Get user's current membership type
      const user = await this.userService.findById(userId);
      if (!user) {
        return this.sendError(res, "User not found", 404);
      }

      // Determine new membership type based on payment amount
      const membershipPrices = {
        499: "cityfeed_select",
        999: "cityfeed_edge",
        1499: "cityfeed_prime",
      } as const;

      const newMembershipType =
        membershipPrices[payment.amount as keyof typeof membershipPrices];
      if (!newMembershipType) {
        return this.sendError(
          res,
          "Invalid payment amount for membership upgrade",
          400
        );
      }

      // Update membership type and expiry date
      const membershipExpiryDate = new Date();
      membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

      await this.userService.update(userId, {
        membershipType: newMembershipType,
        membershipExpiryDate,
      });

      return this.sendSuccess(res, {
        message: "Membership upgraded successfully",
        newMembershipType,
        expiryDate: membershipExpiryDate,
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getUserByPhone = async (req: AuthRequest, res: Response) => {
    try {
      const { phone } = req.query;
      if (!phone)
        return this.sendError(res, "Phone number or email is required", 400);
      const user = await this.userService.findByPhoneOrEmail(phone as string);
      if (!user) return this.sendError(res, "User not found", 404);

      // Remove sensitive fields from the response
      const sanitizedUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        phone: user.phone,
        membershipType: user.membershipType,
        membershipExpiryDate: user.membershipExpiryDate,
        role: user.role,
        coins: user.coins,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isGuest: user.isGuest,
        profilePicture: user.profilePicture,
        address: user.address,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      };

      this.sendSuccess(res, sanitizedUser);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMyWalletBalance = async (req: AuthRequest, res: Response) => {
    try {
      const user = await this.userService.findById(req.user._id);
      if (!user) return this.sendError(res, "User not found", 404);
      this.sendSuccess(res, { balance: user.coins });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMyRewardPoints = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, "User not found", 404);
      }

      const userProfile = await this.userService.findById(user._id);
      if (!userProfile) {
        return this.sendError(res, "User profile not found", 404);
      }

      this.sendSuccess(res, { coins: userProfile.coins || 0 });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMyRewardHistory = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, "User not found", 404);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const transactionType = req.query.transactionType as
        | "earned"
        | "redeemed"
        | "refund"
        | "adjustment"
        | undefined;
      const sourceType = req.query.sourceType as
        | "dine-in"
        | "event"
        | "referral"
        | "membership"
        | "adjustment"
        | "refund"
        | undefined;

      const result = await this.reviewService.getRewardHistory(
        user._id,
        page,
        limit,
        transactionType,
        sourceType
      );

      this.sendSuccess(res, result);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMyRewardSummary = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, "User not found", 404);
      }

      const summary = await this.rewardService.getRewardSummary(user._id);
      this.sendSuccess(res, summary);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  sendReferralEmail = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      if (!user?._id) {
        return this.sendError(res, "User not found", 404);
      }
      const { friendEmail } = req.body;
      if (!friendEmail) {
        return this.sendError(res, "Friend email is required", 400);
      }
      const userProfile = await this.userService.findById(user._id);
      if (!userProfile) {
        return this.sendError(res, "User profile not found", 404);
      }
      const referralCode = userProfile.referralCode;
      const subject = `${userProfile.name} invited you to join CityFeed Club!`;
      const message = `Hi!\n\n${userProfile.name} has invited you to join CityFeed Club. Use their referral code: ${referralCode} when you sign up to get rewards!\n\nSign up here: <your-app-link>`;
      await this.sendGridService.sendMail({
        from: process.env.SMTP_USER || "noreply@cityfeed.club",
        to: friendEmail,
        subject,
        html: message,
      });
      this.sendSuccess(res, { message: "Referral email sent successfully" });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  async getUserById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return this.sendError(res, "User ID not found", 400);
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        return this.sendError(res, "User not found", 404);
      }

      return this.sendSuccess(res, user, "User profile retrieved successfully");
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  }

  async checkEmailAvailability(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return this.sendError(res, "Email is required", 400);
      }

      const normalizedEmail = email.toLowerCase();
      const existingVerifiedUser =
        await this.userService.findVerifiedUserByEmail(normalizedEmail);
      const isAvailable = !existingVerifiedUser;

      let message = "";
      if (isAvailable) {
        // Check if there are any unverified users with this email
        const existingUnverifiedUser = await this.userService.findByEmail(
          normalizedEmail
        );
        if (existingUnverifiedUser && !existingUnverifiedUser.isEmailVerified) {
          message =
            "Email is available (previous unverified registration will be replaced)";
        } else {
          message = "Email is available";
        }
      } else {
        message = "Email is already registered with a verified account";
      }

      return this.sendSuccess(
        res,
        {
          email: normalizedEmail,
          isAvailable,
          message,
        },
        "Email availability checked successfully"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  }

  async checkPhoneAvailability(req: Request, res: Response) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return this.sendError(res, "Phone number is required", 400);
      }

      const existingUser = await this.userService.findByPhone(phone);
      const isAvailable = !existingUser;

      return this.sendSuccess(
        res,
        {
          phone,
          isAvailable,
          message: isAvailable
            ? "Phone number is available"
            : "Phone number is already registered",
        },
        "Phone number availability checked successfully"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  }

  updateEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;
      const { userId } = req.params;
      const updateData = req.body;

      logger.debug("UpdateEmployee: userId param:", userId);

      // Check if current user is super admin or outlet admin
      if (!["super_admin", "outlet_admin"].includes(currentUser.role)) {
        return this.sendError(
          res,
          "Only super admin or outlet admin can update employees",
          403
        );
      }

      // Only allow updating fields that exist in Staff
      const allowedFields = [
        "name",
        "email",
        "phone",
        "role",
        "responsibilities",
        "isEmailVerified",
      ];
      const updates: any = {};
      for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
          updates[key] = updateData[key];
        }
      }
      // Normalize email and name if present
      if (updates.email) updates.email = updates.email.toLowerCase();
      if (updates.name) updates.name = updates.name.toLowerCase();

      // Update the employee assignment in Staff
      const updatedAssignment = await Staff.findByIdAndUpdate(userId, updates, {
        new: true,
      });
      if (!updatedAssignment) {
        return this.sendError(res, "Employee assignment not found", 404);
      }

      this.sendSuccess(res, updatedAssignment, "Employee updated successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  deleteEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;
      const { userId } = req.params;

      logger.debug("DeleteEmployee: userId param:", userId);

      // Check if current user is super admin or outlet admin
      if (!["super_admin", "outlet_admin"].includes(currentUser.role)) {
        return this.sendError(
          res,
          "Only super admin or outlet admin can delete employees",
          403
        );
      }

      // Soft delete the employee assignment in Staff
      const deletedAssignment = await Staff.findByIdAndUpdate(
        userId,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!deletedAssignment) {
        return this.sendError(res, "Employee assignment not found", 404);
      }

      this.sendSuccess(
        res,
        deletedAssignment,
        "Employee assignment deleted (soft) successfully"
      );
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  async getBookedTickets(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, status, page = 1, limit = 10 } = req.query;

      // Get the authenticated user's ID
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      // Calculate default date range (3 months ago to now)
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Parse dates
      const startDateFilter = startDate
        ? new Date(startDate as string)
        : threeMonthsAgo;
      const endDateFilter = endDate ? new Date(endDate as string) : now;

      // Validate dates
      if (isNaN(startDateFilter.getTime()) || isNaN(endDateFilter.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD format.",
        });
      }

      if (startDateFilter > endDateFilter) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date.",
        });
      }

      // Build query - filter by authenticated user's ID
      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        issuedAt: {
          $gte: startDateFilter,
          $lte: endDateFilter,
        },
      };

      // Add status filter if provided
      if (
        status &&
        ["active", "used", "invalidated", "refunded"].includes(status as string)
      ) {
        query.status = status;
      }

      // Calculate pagination
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const limitNum = parseInt(limit as string);

      // Get tickets with populated data
      const tickets = await Ticket.find(query)
        .populate({
          path: "eventId",
          select:
            "name date startEventDate endEventDate startTime endTime venue description coverImages type status",
        })
        .populate({
          path: "ticketTierId",
          select: "name price description order",
        })
        .populate({
          path: "userId",
          select: "name email phone membershipType profilePicture address",
        })
        .populate({
          path: "scannedBy",
          select: "name email",
        })
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const totalTickets = await Ticket.countDocuments(query);

      // Calculate statistics
      const stats = await Ticket.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
          },
        },
      ]);

      const statistics = {
        total: 0,
        active: 0,
        used: 0,
        invalidated: 0,
        refunded: 0,
        totalQuantity: 0,
      };

      stats.forEach((stat) => {
        statistics[stat._id as keyof typeof statistics] = stat.count;
        statistics.totalQuantity += stat.totalQuantity;
      });

      statistics.total = totalTickets;

      // Get user data once (since all tickets belong to the same user)
      const user = tickets[0]?.userId as any;
      const userData = user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            membershipType: user.membershipType,
            profilePicture: user.profilePicture,
          }
        : null;

      // Format response with optimized structure (without repeating user data)
      const formattedTickets = tickets.map((ticket) => {
        const event = ticket.eventId as any;
        const ticketTier = ticket.ticketTierId as any;
        const scannedBy = ticket.scannedBy as any;

        // Calculate total price for the ticket
        const totalPrice = ticketTier ? ticketTier.price * ticket.quantity : 0;

        // Determine event date (prefer startEventDate over date)
        const eventDate = event?.startEventDate || event?.date;

        return {
          ticketId: ticket._id,
          orderId: ticket.orderId,
          status: ticket.status,
          quantity: ticket.quantity,
          totalPrice,
          issuedAt: ticket.issuedAt,
          scannedAt: ticket.scannedAt,
          qrCodeUrl: ticket.qrCodeUrl,
          event: event
            ? {
                id: event._id,
                name: event.name,
                date: eventDate,
                startTime: event.startTime,
                endTime: event.endTime,
                status: event.status,
                venue: event.venue
                  ? {
                      name: event.venue.name,
                      address: event.venue.address,
                      capacity: event.venue.capacity,
                      location: event.venue.location,
                    }
                  : null,
                description: event.description,
                coverImage: event.coverImages?.[0] || null, // Return first image only
                type: event.type,
              }
            : null,
          ticketTier: ticketTier
            ? {
                id: ticketTier._id,
                name: ticketTier.name,
                price: ticketTier.price,
                description: ticketTier.description,
                order: ticketTier.order,
              }
            : null,
          scannedBy: scannedBy
            ? {
                id: scannedBy._id,
                name: scannedBy.name,
                email: scannedBy.email,
              }
            : null,
        };
      });

      const totalPages = Math.ceil(totalTickets / limitNum);

      return res.status(200).json({
        success: true,
        message: "Tickets retrieved successfully",
        data: {
          user: userData, // User data at top level (only once)
          tickets: formattedTickets,
          summary: {
            totalTickets: totalTickets,
            totalValue: formattedTickets.reduce(
              (sum, ticket) => sum + (ticket.totalPrice || 0),
              0
            ),
            activeTickets: statistics.active,
            upcomingEvents: formattedTickets.filter(
              (ticket) =>
                ticket.event?.date && new Date(ticket.event.date) > new Date()
            ).length,
          },
          statistics,
          pagination: {
            total: totalTickets,
            page: parseInt(page as string),
            limit: limitNum,
            totalPages,
            hasNextPage: parseInt(page as string) < totalPages,
            hasPrevPage: parseInt(page as string) > 1,
          },
        },
      });
    } catch (error) {
      logger.error("Error in getBookedTickets:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
