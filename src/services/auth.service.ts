import { UserService } from './user.service';
import { MerchantService } from './merchant.service';
import { AdminService } from './admin.service';
import { SuperAdminService } from './superAdmin.service';
import { OutletAdminService } from './outletAdmin.service';
import { TokenService } from './token.service';
import { EmailService } from './email.service';
import { IUser, IUserDocument } from '../interfaces/user.interface';
import { IMerchant, IMerchantDocument } from '../interfaces/merchant.interface';
import { IAdminDocument } from '../interfaces/admin.interface';
import { generateToken } from '../utils/jwt.util';
import { config } from '../config/config';

export class AuthService {
  private userService: UserService;
  private merchantService: MerchantService;
  private adminService: AdminService;
  private superAdminService: SuperAdminService;
  private outletAdminService: OutletAdminService;
  private tokenService: TokenService;
  private emailService: EmailService;

  constructor() {
    this.userService = new UserService();
    this.merchantService = new MerchantService();
    this.adminService = new AdminService();
    this.superAdminService = new SuperAdminService();
    this.outletAdminService = new OutletAdminService();
    this.tokenService = new TokenService();
    this.emailService = new EmailService();
  }

  async registerUser(userData: Partial<IUser>): Promise<{ user: IUserDocument; token: string }> {
    if (!userData.name || !userData.email || !userData.password || !userData.phone || !userData.dob || !userData.gender || !userData.membershipType) {
      throw new Error('Missing required fields');
    }

    const existingUser = await this.userService.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Calculate membership expiry date (1 year from now)
    const membershipExpiryDate = new Date();
    membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

    const newUser = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      dob: userData.dob,
      gender: userData.gender,
      membershipType: userData.membershipType,
      membershipExpiryDate: membershipExpiryDate,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      role: 'user' as const,
      coins: 0,
      reward_points: 0,
      profilePicture: userData.profilePicture,
      address: userData.address,
      preferences: userData.preferences,
      lastLogin: undefined,
      loginAttempts: 0,
      lockUntil: undefined
    } as Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>;

    const user = await this.userService.createUser(newUser);
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'user'
    });
    await this.sendVerificationEmail(user.email, token, 'user');
    return { user, token };
  }

  async registerMerchant(merchantData: Partial<IMerchant>): Promise<{ merchant: IMerchantDocument; token: string }> {
    if (!merchantData.email || !merchantData.password || !merchantData.name || !merchantData.phone || 
        !merchantData.businessName || !merchantData.businessType || !merchantData.businessDescription || 
        !merchantData.category || !merchantData.address || !merchantData.location || !merchantData.defaultMaxDiscount) {
      throw new Error('Missing required fields');
    }

    const existingMerchant = await this.merchantService.findByEmail(merchantData.email);
    if (existingMerchant) {
      throw new Error('Email already registered');
    }

    const newMerchant = {
      name: merchantData.name,
      email: merchantData.email,
      password: merchantData.password,
      phone: merchantData.phone,
      businessName: merchantData.businessName,
      businessType: merchantData.businessType,
      businessDescription: merchantData.businessDescription,
      category: merchantData.category || undefined,
      address: merchantData.address,
      location: merchantData.location,
      images: merchantData.images || [],
      isApproved: false,
      isEmailVerified: false,
      role: 'merchant',
      defaultMaxDiscount: merchantData.defaultMaxDiscount
    } as Omit<IMerchant, '_id' | 'createdAt' | 'updatedAt'>;

    const merchant = await this.merchantService.createMerchant(newMerchant) as IMerchantDocument;
    const token = generateToken({
      _id: merchant._id.toString(),
      email: merchant.email,
      role: merchant.role,
      type: 'merchant'
    });
    await this.sendVerificationEmail(merchant.email, token, 'merchant');
    return { merchant, token };
  }

  async login(email: string, password: string, role: string): Promise<{ user?: IUserDocument; merchant?: IMerchantDocument; admin?: IAdminDocument; superAdmin?: any; outletAdmin?: any; employee?: any; token: string }> {
    if (role === 'user') {
      return this.loginUser(email, password);
    } else if (role === 'merchant') {
      return this.loginMerchant(email, password);
    } else if (role === 'admin') {
      return this.loginAdmin(email, password);
    } else if (role === 'outlet_admin') {
      // Use OutletAdminService for outlet_admin login
      const { outletAdmin, token } = await this.outletAdminService.login(email, password);
      return { outletAdmin, token };
    } else if (role === 'super_admin') {
      // Call the super admin login from superAdminService
      const { superAdmin, token } = await this.superAdminService.login(email, password);
      return { superAdmin, token };
    } else if (role === 'employee') {
      // Custom employee login logic
      return this.loginEmployee(email, password);
    }
    throw new Error('Invalid role specified');
  }

  async loginUser(email: string, password: string): Promise<{ user: IUserDocument; token: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid credentials');
    }
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }
    if (!user.isEmailVerified) {
      const token = generateToken({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        type: 'user'
      });
      await this.sendVerificationEmail(user.email, token, 'user');
      throw new Error('Email not verified. A new verification email has been sent to your email address.');
    }
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'user'
    });
    return { user, token };
  }

  async loginMerchant(email: string, password: string): Promise<{ merchant: IMerchantDocument; token: string }> {
    const merchant = await this.merchantService.findByEmail(email);
    if (!merchant) {
      throw new Error('Merchant not found with this email');
    }
    if (!(await merchant.comparePassword(password))) {
      throw new Error('Invalid password');
    }
    if (!merchant.isApproved) {
      throw new Error('Account is pending approval. Please wait for admin approval');
    }
    if (!merchant.isEmailVerified) {
      const token = generateToken({
        _id: merchant._id.toString(),
        email: merchant.email,
        role: merchant.role,
        type: 'merchant'
      });
      await this.sendVerificationEmail(merchant.email, token, 'merchant');
      throw new Error('Email not verified. A new verification email has been sent to your email address.');
    }
    const token = generateToken({
      _id: merchant._id.toString(),
      email: merchant.email,
      role: merchant.role,
      type: 'merchant'
    });
    return { merchant, token };
  }

  async loginAdmin(email: string, password: string): Promise<{ admin: IAdminDocument; token: string }> {
    const admin = await this.adminService.findByEmail(email);
    if (!admin || !(await admin.comparePassword(password))) {
      throw new Error('Invalid credentials');
    }
    if (!admin.isActive) {
      throw new Error('Account is deactivated');
    }
    const token = generateToken({
      _id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      type: 'admin'
    });
    return { admin, token };
  }

  async loginEmployee(email: string, password: string): Promise<{ employee: any; token: string }> {
    const { OutletRoleAssignment } = require('../models/outletRoleAssignment.model');
    const assignment = await OutletRoleAssignment.findOne({ email });
    if (!assignment) {
      throw new Error('Invalid credentials');
    }
    if (!assignment.isEmailVerified) {
      throw new Error('Email not verified. Please verify your email before logging in.');
    }
    const bcryptjs = require('bcryptjs');
    const isMatch = await bcryptjs.compare(password, assignment.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    const jwt = require('jsonwebtoken');
    const { config } = require('../config/config');
    const token = jwt.sign(
      {
        _id: assignment._id,
        email: assignment.email,
        role: assignment.role,
        outlet: assignment.outlet,
        responsibilities: assignment.responsibilities
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    return {
      employee: {
        _id: assignment._id,
        email: assignment.email,
        role: assignment.role,
        outlet: assignment.outlet,
        responsibilities: assignment.responsibilities,
        name: assignment.name,
        phone: assignment.phone,
        isEmailVerified: assignment.isEmailVerified
      },
      token
    };
  }

  async verifyEmail(token: string, role: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }

    if (role === 'user') {
      return this.verifyUserEmail(token);
    } else if (role === 'merchant') {
      return this.verifyMerchantEmail(token);
    } else if (role === 'super_admin') {
      return this.verifySuperAdminEmail(token);
    } else if (role === 'outlet_admin') {
      return this.verifyOutletAdminEmail(token);
    } else if (role === 'employee') {
      return this.verifyEmployeeEmail(token);
    }
    throw new Error('Invalid role specified');
  }

  async verifyUserEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    return this.userService.verifyEmail(decoded._id);
  }

  async verifyMerchantEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    return this.merchantService.verifyEmail(decoded._id);
  }

  async verifySuperAdminEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    return this.superAdminService.verifyEmail(token);
  }

  async verifyOutletAdminEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    return this.outletAdminService.verifyEmail(token);
  }

  async verifyEmployeeEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    const { OutletRoleAssignment } = require('../models/outletRoleAssignment.model');
    const assignment = await OutletRoleAssignment.findById(decoded._id);
    if (!assignment) {
      throw new Error('Invalid or expired token');
    }
    assignment.isEmailVerified = true;
    await assignment.save();
    return assignment;
  }

  async forgotPassword(email: string, role: string) {
    if (role === 'user') {
      return this.sendUserPasswordResetEmail(email);
    } else if (role === 'merchant') {
      return this.sendMerchantPasswordResetEmail(email);
    }
    throw new Error('Invalid role specified');
  }

  async sendUserPasswordResetEmail(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'user'
    });
    await this.emailService.sendPasswordResetEmail(user.email, token, 'user');
    return { message: 'Password reset email sent', token };
  }

  async sendMerchantPasswordResetEmail(email: string) {
    const merchant = await this.merchantService.findByEmail(email);
    if (!merchant) {
      throw new Error('Merchant not found');
    }
    const token = generateToken({
      _id: merchant._id.toString(),
      email: merchant.email,
      role: merchant.role,
      type: 'merchant'
    });
    await this.emailService.sendPasswordResetEmail(merchant.email, token, 'merchant');
    return { message: 'Password reset email sent', token };
  }

  async resetPassword(token: string, password: string, role: string) {
    if (role === 'user') {
      return this.resetUserPassword(token, password);
    } else if (role === 'merchant') {
      return this.resetMerchantPassword(token, password);
    }
    throw new Error('Invalid role specified');
  }

  async resetUserPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    return this.userService.updatePassword(decoded._id, password);
  }

  async resetMerchantPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    return this.merchantService.updatePassword(decoded._id, password);
  }

  async logout(token: string) {
    await this.tokenService.blacklistToken(token, 24 * 60 * 60); // Blacklist for 24 hours
    return { message: 'Logged out successfully' };
  }

  async changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<IUserDocument> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const updatedUser = await this.userService.updatePassword(userId, newPassword);
    if (!updatedUser) {
      throw new Error('Failed to update password');
    }
    return updatedUser;
  }

  async changeMerchantPassword(merchantId: string, currentPassword: string, newPassword: string): Promise<IMerchantDocument> {
    const merchant = await this.merchantService.findById(merchantId);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const isValidPassword = await merchant.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const updatedMerchant = await this.merchantService.updatePassword(merchantId, newPassword);
    if (!updatedMerchant) {
      throw new Error('Failed to update password');
    }
    return updatedMerchant;
  }

  private async sendVerificationEmail(email: string, token: string, role: string): Promise<void> {
    const verificationLink = `${config.frontendUrl}/verify-email?token=${token}&role=${role}`;
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Verify your email',
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email:</p>
        <a href="${verificationLink}">${verificationLink}</a>
      `
    };

    await this.emailService.sendVerificationEmail(email, token, role);
  }
} 