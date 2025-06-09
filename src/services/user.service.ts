import { UserRepository } from '../repositories/user.repository';
import { IUser, IUserDocument } from '../interfaces/user.interface';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppErrorClass } from '../middleware/error.middleware';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>): Promise<IUserDocument> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const newUser: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'> = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      dob: userData.dob,
      gender: userData.gender,
      membershipType: userData.membershipType,
      coins: 0,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      role: 'user',
      profilePicture: userData.profilePicture,
      address: userData.address,
      preferences: userData.preferences,
      loginAttempts: 0,
      lastLogin: undefined,
      lockUntil: undefined
    };
    return this.userRepository.create(newUser);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.userRepository.findByEmail(email);
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
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const newUser: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'> = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      dob: userData.dob,
      gender: userData.gender,
      membershipType: userData.membershipType,
      coins: 0,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      role: 'user',
      profilePicture: userData.profilePicture,
      address: userData.address,
      preferences: userData.preferences,
      loginAttempts: 0,
      lastLogin: undefined,
      lockUntil: undefined
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

    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset token
    console.log('Password reset token:', token);
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

  async getUserMerchants(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    // TODO: Implement merchant retrieval logic
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
    const updatedUser = await this.userRepository.update(userId, { $inc: { coins: amount } });
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
    if (user.coins < amount) {
      throw new AppErrorClass('Insufficient coins', 400);
    }
    const updatedUser = await this.userRepository.update(userId, { $inc: { coins: -amount } });
    if (!updatedUser) {
      throw new AppErrorClass('Failed to deduct coins', 400);
    }
    return updatedUser;
  }
} 