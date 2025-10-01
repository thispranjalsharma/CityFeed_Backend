import { injectable, inject } from "inversify";
// import { IUserRepository } from "../interfaces/repositories/user.repository.interface";
// import { IUser, IUserDocument } from "../interfaces/user.interface";
import bcryptjs from "bcryptjs";
// import { AppErrorClass } from "../utils/error";
import crypto from "crypto";
import { IUser, IUserDocument } from "../models/user.model";
import { AppErrorClass } from "../utils/appError";
import { IUserRepository } from "../repositories/user.repository";

export interface IUserService {
  createUser(
    userData: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument>;
  findVerifiedUser(email: string): Promise<IUserDocument | null>;
  findByEmail(email: string): Promise<IUserDocument | null>;
  findById(id: string): Promise<IUserDocument | null>;
  findByPhone(phone: string): Promise<IUserDocument | null>;
  updateUser(id: string, data: Partial<IUser>): Promise<IUserDocument | null>;
  delete(id: string): Promise<IUserDocument | null>;
  verifyEmail(token: string): Promise<IUserDocument>;
  updatePassword(id: string, password: string): Promise<IUserDocument>;
  changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IUserDocument | null>;
  cleanupUnverifiedUsers(email: string): Promise<void>;
  verifyPhone(token: string): Promise<IUserDocument>;
  registerUser(
    userData: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument>;
  getUserProfile(id: string): Promise<IUserDocument | null>;
  updateUserProfile(
    id: string,
    data: Partial<IUser>
  ): Promise<IUserDocument | null>;
  verifyPassword(id: string, password: string): Promise<IUserDocument | null>;
  // getOffers(userId: string): Promise<any[]>;
  getUserById(id: string): Promise<IUserDocument | null>;
  // getTransactions(userId: string): Promise<any[]>;
  getCoins(userId: string): Promise<number>;
  addCoins(userId: string, amount: number): Promise<IUserDocument>;
  deductCoins(userId: string, amount: number): Promise<IUserDocument>;
  findByPhone(phone: string): Promise<IUserDocument | null>;
  verifyPhone(token: string): Promise<IUserDocument>;
  findByQrCode(qrCodeUrl: string): Promise<IUserDocument | null>;
  activateUser(id: string): Promise<IUserDocument | null>;
  deleteUser(id: string): Promise<IUserDocument | null>;
  getUserByPhone(phone: string): Promise<IUserDocument | null>;
  getWalletBalance(userId: string): Promise<number>;

  // ----------------------------

  findVerifiedUserByEmail(email: string): Promise<IUser | null>;
  update(id: string, updates: Partial<IUser>): Promise<IUserDocument | null>;
  getUserTransactions(userId: string): Promise<any[]>;
  getUserCoins(userId: string): Promise<number>;
  findByPhoneOrEmail(phoneOrEmail: string): Promise<IUserDocument | null>;
  getUserOffers(userId: string): Promise<any[]>;

  findByReferralCode(referralCode: string): Promise<IUserDocument | null>;
  createGuestUser(
    userData: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument>;
}
@injectable()
export class UserService implements IUserService {
  constructor(
    @inject("UserRepository") private userRepository: IUserRepository
  ) {}

  createGuestUser(
    userData: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument> {
    return this.createUser(userData);
  }

  async findByReferralCode(
    referralCode: string
  ): Promise<IUserDocument | null> {
    return this.userRepository.findByReferralCode(referralCode);
  }

  async getUserOffers(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }
    return [];
  }

  async findByPhoneOrEmail(
    phoneOrEmail: string
  ): Promise<IUserDocument | null> {
    return this.userRepository.findByPhoneOrEmail(phoneOrEmail);
  }

  async getUserCoins(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }
    return user.coins;
  }

  async getUserTransactions(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }

    // Get payment transactions
    const Payment = (await import("../models/payment.model")).Payment;
    const RewardHistory = (await import("../models/rewardHistory.model"))
      .RewardHistory;

    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    const rewards = await RewardHistory.find({ userId }).sort({
      createdAt: -1,
    });

    // Combine and sort all transactions
    const allTransactions = [
      ...payments.map((payment: any) => ({
        ...payment.toObject(),
        transactionType: "payment",
        originalType: payment.type,
      })),
      ...rewards.map((reward: any) => ({
        _id: reward._id,
        userId: reward.userId,
        type: "reward",
        amount: reward.amount,
        transactionType: reward.transactionType,
        sourceType: reward.sourceType,
        description: reward.description,
        balanceBefore: reward.balanceBefore,
        balanceAfter: reward.balanceAfter,
        createdAt: reward.createdAt,
        updatedAt: reward.updatedAt,
        originalType: "reward",
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return allTransactions;
  }

  async update(
    id: string,
    updates: Partial<IUser>
  ): Promise<IUserDocument | null> {
    return await this.userRepository.updateUser(id, updates);
  }

  async findVerifiedUserByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findOne({
      email: email.toLowerCase(),
      isEmailVerified: true,
    });
  }

  // ---------------------------

  getWalletBalance(userId: string): Promise<number> {
    return this.userRepository.getWalletBalance(userId);
  }

  getUserByPhone(phone: string): Promise<IUserDocument | null> {
    return this.userRepository.findByPhone(phone);
  }
  deleteUser(id: string): Promise<IUserDocument | null> {
    return this.userRepository.deleteUser(id);
  }

  verifyPassword(id: string, password: string): Promise<IUserDocument | null> {
    return this.userRepository.verifyPassword(id, password);
  }

  getUserById(id: string): Promise<IUserDocument | null> {
    return this.userRepository.findById(id);
  }

  activateUser(id: string): Promise<IUserDocument | null> {
    return this.userRepository.activateUser(id);
  }

  public async createUser(
    userData: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument> {
    const normalizedEmail = userData.email.toLowerCase();

    const existingVerifiedUser = await this.findVerifiedUser(normalizedEmail);
    if (existingVerifiedUser) {
      throw new AppErrorClass("Email already registered", 400);
    }

    const existingByPhone = await this.userRepository.findPhone(userData.phone);
    if (existingByPhone) {
      throw new AppErrorClass("Phone number already registered", 400);
    }

    const referralCode = crypto.randomBytes(4).toString("hex");
    const membershipExpiryDate = new Date();
    membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

    const newUser: Omit<IUser, "_id" | "createdAt" | "updatedAt"> = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      dob: userData.dob,
      gender: userData.gender,
      membershipType: userData.membershipType,
      membershipExpiryDate: membershipExpiryDate,
      role: userData.role || "user",
      coins: userData.coins || 0, // Use coins from userData or default to 0
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      profilePicture: userData.profilePicture,
      address: userData.address,
      preferences: userData.preferences,
      loginAttempts: 0,
      lastLogin: undefined,
      lockUntil: undefined,
      isApproved: userData.isApproved ?? false,
      referralCode,
      referredBy: userData.referredBy || null,
    };

    return this.userRepository.create(newUser);
  }

  public async findVerifiedUser(email: string): Promise<IUserDocument | null> {
    return this.userRepository.findVerified(email.toLowerCase());
  }

  public async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.userRepository.findByEmail(email.toLowerCase());
  }

  public async findById(id: string): Promise<IUserDocument | null> {
    return this.userRepository.findById(id);
  }

  public async updateUser(
    id: string,
    updates: Partial<IUser>
  ): Promise<IUserDocument | null> {
    return this.userRepository.updateUser(id, updates);
  }

  public async delete(id: string): Promise<IUserDocument | null> {
    return this.userRepository.delete(id);
  }

  public async verifyEmail(id: string): Promise<IUserDocument | null> {
    return this.userRepository.verifyEmail(id);
  }

  public async updatePassword(
    id: string,
    password: string
  ): Promise<IUserDocument | null> {
    const salt = await bcryptjs.genSalt(10);
    const hashed = await bcryptjs.hash(password, salt);
    return this.userRepository.updatePassword(id, hashed);
  }

  public async cleanupUnverifiedUsers(email: string): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.userRepository.deleteMany({
      email: email.toLowerCase(),
      isEmailVerified: false,
      createdAt: { $lt: cutoff },
    });
  }

  public async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IUserDocument | null> {
    return this.userRepository.changePassword(id, currentPassword, newPassword);
  }

  public async registerUser(
    userData: Omit<IUser, "_id" | "createdAt" | "updatedAt">
  ): Promise<IUserDocument> {
    return this.createUser(userData);
  }

  public async getUserProfile(userId: string): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppErrorClass("User not found", 404);
    return user;
  }

  updateUserProfile(
    id: string,
    data: Partial<IUser>
  ): Promise<IUserDocument | null> {
    return this.userRepository.updateUserProfile(id, data);
  }

  public async getCoins(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppErrorClass("User not found", 404);
    return user.coins || 0;
  }

  async addCoins(userId: string, amount: number): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }
    const roundedAmount = Math.round(amount);
    const updatedUser = await this.userRepository.updateUser(userId, {
      coins: (user.coins || 0) + roundedAmount,
    });
    if (!updatedUser) {
      throw new AppErrorClass("Failed to add coins", 400);
    }
    return updatedUser;
  }

  async deductCoins(userId: string, amount: number): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }
    const roundedAmount = Math.round(amount);
    if (user.coins < roundedAmount) {
      throw new AppErrorClass("Insufficient coins", 400);
    }
    const updatedUser = await this.userRepository.updateUser(userId, {
      coins: (user.coins || 0) - roundedAmount,
    });
    if (!updatedUser) {
      throw new AppErrorClass("Failed to deduct coins", 400);
    }
    return updatedUser;
  }

  public async findByPhone(phone: string): Promise<IUserDocument | null> {
    return this.userRepository.findByPhone(phone);
  }

  public async verifyPhone(id: string): Promise<IUserDocument | null> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new AppErrorClass("User not found", 404);
    return this.userRepository.verifyPhone(id);
  }

  public async findByQrCode(qrCodeUrl: string): Promise<IUserDocument | null> {
    return this.userRepository.findByQrCode(qrCodeUrl);
  }
}
