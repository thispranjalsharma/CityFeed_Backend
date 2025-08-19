import { UserRepository } from '../repositories/user.repository';
import { IUser, IUserDocument } from '../interfaces/user.interface';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppErrorClass } from '../utils/appError';
import crypto from 'crypto';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>): Promise<IUserDocument> {
    // Check if email is already taken by a verified user
    const existingVerifiedUser = await this.findVerifiedUserByEmail(userData.email);
    if (existingVerifiedUser) {
      throw new Error('Email already registered with a verified account');
    }

    // Check if phone number is already registered
    const existingUserByPhone = await this.userRepository.findByPhone(userData.phone);
    if (existingUserByPhone) {
      throw new Error('Phone number already registered');
    }

    // Generate unique referral code
    const referralCode = crypto.randomBytes(4).toString('hex');
    // Calculate membership expiry date (1 year from now)
    const membershipExpiryDate = new Date();
    membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

    // Create new user with all required fields
    const newUser: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'> = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      dob: userData.dob,
      gender: userData.gender,
      membershipType: userData.membershipType,
      membershipExpiryDate: membershipExpiryDate,
      role: userData.role || 'user',
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
      referredBy: userData.referredBy || null
    };

    return this.userRepository.create(newUser);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.userRepository.findByEmail(email);
  }

  async findVerifiedUserByEmail(email: string): Promise<IUserDocument | null> {
    return this.userRepository.findOne({ email: email.toLowerCase(), isEmailVerified: true });
  }

  async cleanupUnverifiedUsers(email: string): Promise<void> {
    // Delete old unverified users with the same email
    // This is optional - helps keep the database clean
    const normalizedEmail = email.toLowerCase();
    await this.userRepository.deleteMany({ 
      email: normalizedEmail, 
      isEmailVerified: false,
      // Only delete users older than 24 hours to give them time to verify
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return this.userRepository.findById(id);
  }

  async update(id: string, data: Partial<IUser>): Promise<IUserDocument | null> {
    return this.userRepository.update(id, data);
  }

  async verifyEmail(id: string): Promise<IUserDocument | null> {
    return this.userRepository.verifyEmail(id);
  }

  async updatePassword(id: string, password: string): Promise<IUserDocument | null> {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return this.userRepository.updatePassword(id, hashedPassword);
  }

  async activateUser(id: string): Promise<IUserDocument | null> {
    return this.userRepository.activateUser(id);
  }

  async deactivateUser(id: string): Promise<IUserDocument | null> {
    return this.userRepository.deactivateUser(id);
  }

  async registerUser(userData: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>): Promise<IUserDocument> {
    // Check if email is already taken by a verified user
    const existingVerifiedUser = await this.findVerifiedUserByEmail(userData.email);
    if (existingVerifiedUser) {
      throw new Error('Email already registered with a verified account');
    }

    // Check if phone number is already registered
    const existingUserByPhone = await this.userRepository.findByPhone(userData.phone);
    if (existingUserByPhone) {
      throw new Error('Phone number already registered');
    }

    // Generate unique referral code
    const referralCode = crypto.randomBytes(4).toString('hex');
    // Calculate membership expiry date (1 year from now)
    const membershipExpiryDate = new Date();
    membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

    const newUser: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'> = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      dob: userData.dob,
      gender: userData.gender,
      membershipType: userData.membershipType,
      membershipExpiryDate: membershipExpiryDate,
      coins: 0,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      role: 'user' as const,
      profilePicture: userData.profilePicture,
      address: userData.address,
      preferences: userData.preferences,
      loginAttempts: 0,
      lastLogin: undefined,
      lockUntil: undefined,
      isApproved: userData.isApproved ?? false,
      referralCode,
      referredBy: userData.referredBy || null
    };

    return this.userRepository.create(newUser);
  }

  async getUserById(id: string): Promise<IUserDocument | null> {
    return this.userRepository.findById(id);
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<IUserDocument | null> {
    return this.userRepository.update(id, data);
  }

  async deleteUser(id: string): Promise<IUserDocument | null> {
    return this.userRepository.delete(id);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcryptjs.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      const hashedPassword = await bcryptjs.hash(newPassword, 10);
      await this.userRepository.updatePassword(decoded.userId, hashedPassword);
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }

  async getProfile(userId: string): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    return user;
  }

  async updateProfile(userId: string, data: Partial<IUser>): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    const updatedUser = await this.userRepository.update(userId, data);
    if (!updatedUser) {
      throw new AppErrorClass('Failed to update profile', 400);
    }
    return updatedUser;
  }

  async getUserOffers(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    // TODO: Implement offer retrieval logic
    return [];
  }

  async getUserTransactions(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    // TODO: Implement transaction retrieval logic
    return [];
  }

  async getUserCoins(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    return user.coins;
  }

  async addCoins(userId: string, amount: number): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    const roundedAmount = Math.round(amount);
    const updatedUser = await this.userRepository.update(userId, { $inc: { coins: roundedAmount } });
    if (!updatedUser) {
      throw new AppErrorClass('Failed to add coins', 400);
    }
    return updatedUser;
  }

  async deductCoins(userId: string, amount: number): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    const roundedAmount = Math.round(amount);
    if (user.coins < roundedAmount) {
      throw new AppErrorClass('Insufficient coins', 400);
    }
    const updatedUser = await this.userRepository.update(userId, { $inc: { coins: -roundedAmount } });
    if (!updatedUser) {
      throw new AppErrorClass('Failed to deduct coins', 400);
    }
    return updatedUser;
  }

  async findByPhone(phone: string): Promise<IUserDocument | null> {
    return this.userRepository.findByPhone(phone);
  }

  async findByPhoneOrEmail(phoneOrEmail: string): Promise<IUserDocument | null> {
    return this.userRepository.findByPhoneOrEmail(phoneOrEmail);
  }

  async createGuestUser(userData: Partial<IUser>): Promise<IUserDocument> {
    // Only create if phone is provided and isGuest is true
    if (!userData.phone || !userData.isGuest) throw new Error('Phone and isGuest required');
    // Check if already exists
    const existing = await this.userRepository.findOne({ phone: userData.phone, isGuest: true });
    if (existing) return existing;
    // Create guest user
    return this.userRepository.create(userData as any);
  }

  async updateEmployee(userId: string, updateData: Partial<IUser>): Promise<IUserDocument> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('Employee not found', 404);
    }
    
    const updatedUser = await this.userRepository.update(userId, updateData);
    if (!updatedUser) {
      throw new AppErrorClass('Failed to update employee', 400);
    }
    return updatedUser;
  }

  async deleteEmployee(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('Employee not found', 404);
    }
    
    await this.userRepository.delete(userId);
  }

  async findByReferralCode(referralCode: string): Promise<IUserDocument | null> {
    return this.userRepository.findOne({ referralCode });
  }
} 