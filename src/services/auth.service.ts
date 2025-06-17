import { UserService } from './user.service';
import { MerchantService } from './merchant.service';
import { AdminService } from './admin.service';
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
  private tokenService: TokenService;
  private emailService: EmailService;

  constructor() {
    this.userService = new UserService();
    this.merchantService = new MerchantService();
    this.adminService = new AdminService();
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

  async login(email: string, password: string, role: string): Promise<{ user?: IUserDocument; merchant?: IMerchantDocument; admin?: IAdminDocument; token: string }> {
    if (role === 'user') {
      return this.loginUser(email, password);
    } else if (role === 'merchant') {
      return this.loginMerchant(email, password);
    } else if (role === 'admin') {
      return this.loginAdmin(email, password);
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

  async verifyEmail(token: string, role: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }

    if (role === 'user') {
      return this.verifyUserEmail(token);
    } else if (role === 'merchant') {
      return this.verifyMerchantEmail(token);
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