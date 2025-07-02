import { UserService } from './user.service';
import { AdminService } from './admin.service';
import { SuperAdminService } from './superAdmin.service';
import { OutletAdminService } from './outletAdmin.service';
import { TokenService } from './token.service';
import { EmailService } from './email.service';
import { IUser, IUserDocument } from '../interfaces/user.interface';
import { IAdminDocument } from '../interfaces/admin.interface';
import { generateToken } from '../utils/jwt.util';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';
import { AppErrorClass } from '../utils/appError';
import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  private userService: UserService;
  private adminService: AdminService;
  private superAdminService: SuperAdminService;
  private outletAdminService: OutletAdminService;
  private tokenService: TokenService;
  private emailService: EmailService;

  constructor() {
    this.userService = new UserService();
    this.adminService = new AdminService();
    this.superAdminService = new SuperAdminService();
    this.outletAdminService = new OutletAdminService();
    this.tokenService = new TokenService();
    this.emailService = new EmailService();
  }

  async registerUser(userData: Partial<IUser>): Promise<{ user: IUserDocument; token: string }> {
    if (!userData.name || !userData.email || !userData.password || !userData.phone || !userData.dob || !userData.gender || !userData.membershipType) {
      throw new AppErrorClass('Missing required fields', 400);
    }

    const existingUser = await this.userService.findByEmail(userData.email);
    if (existingUser) {
      throw new AppErrorClass('User already exists', 409);
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

  async login(email: string, password: string, role: string): Promise<{ user?: IUserDocument; admin?: IAdminDocument; superAdmin?: any; outletAdmin?: any; employee?: any; token: string; outletId?: string | null }> {
    if (role === 'user') {
      return this.loginUser(email, password);
    } else if (role === 'admin') {
      return this.loginAdmin(email, password);
    } else if (role === 'outlet_admin') {
      // Use OutletAdminService for outlet_admin login
      const { outletAdmin, token, outletId } = await this.outletAdminService.login(email, password);
      return { outletAdmin, token, outletId };
    } else if (role === 'super_admin') {
      // Call the super admin login from superAdminService
      const { superAdmin, token } = await this.superAdminService.login(email, password);
      return { superAdmin, token };
    } else if (role === 'employee') {
      // Custom employee login logic
      return this.loginEmployee(email, password);
    }
    throw new AppErrorClass('Invalid role specified', 400);
  }

  async loginUser(email: string, password: string): Promise<{ user: IUserDocument; token: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new AppErrorClass('Invalid credentials', 400);
    }
    if (!user.isActive) {
      throw new AppErrorClass('Account is deactivated', 403);
    }
    if (!user.isEmailVerified) {
      const token = generateToken({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        type: 'user'
      });
      await this.sendVerificationEmail(user.email, token, 'user');
      throw new AppErrorClass('Email not verified. A new verification email has been sent to your email address.', 400);
    }
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'user'
    });
    return { user, token };
  }

  async loginAdmin(email: string, password: string): Promise<{ admin: IAdminDocument; token: string }> {
    const admin = await this.adminService.findByEmail(email);
    if (!admin || !(await admin.comparePassword(password))) {
      throw new AppErrorClass('Invalid credentials', 400);
    }
    if (!admin.isActive) {
      throw new AppErrorClass('Account is deactivated', 403);
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
    const assignment = await OutletRoleAssignment.findOne({ email });
    if (!assignment) {
      throw new AppErrorClass('Invalid credentials', 400);
    }
    if (!assignment.isEmailVerified) {
      throw new AppErrorClass('Email not verified. Please verify your email before logging in.', 400);
    }
    const isMatch = await bcryptjs.compare(password, assignment.password);
    if (!isMatch) {
      throw new AppErrorClass('Invalid credentials', 400);
    }
    const token = jwt.sign(
      {
        _id: assignment._id,
        email: assignment.email,
        role: 'employee',
        type: 'employee',
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
      throw new AppErrorClass('Invalid or expired token', 400);
    }

    if (role === 'user') {
      return this.verifyUserEmail(token);
    } else if (role === 'super_admin') {
      return this.verifySuperAdminEmail(token);
    } else if (role === 'outlet_admin') {
      return this.verifyOutletAdminEmail(token);
    } else if (role === 'employee') {
      return this.verifyEmployeeEmail(token);
    }
    throw new AppErrorClass('Invalid role specified', 400);
  }

  async verifyUserEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    return this.userService.verifyEmail(decoded._id);
  }

  async verifySuperAdminEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    const superAdmin = await this.superAdminService.verifyEmail(token);
    if (superAdmin) {
      try {
        await this.emailService.sendSuperAdminVerifiedAdminNotification({
          name: superAdmin.name,
          email: superAdmin.email,
          phone: superAdmin.phone
        });
      } catch (error) {
        logger.error('[AuthService] Error notifying admin for super admin:', superAdmin.email, error);
      }
    }
    return superAdmin;
  }

  async verifyOutletAdminEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    return this.outletAdminService.verifyEmail(token);
  }

  async verifyEmployeeEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    const assignment = await OutletRoleAssignment.findById(decoded._id);
    if (!assignment) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    assignment.isEmailVerified = true;
    await assignment.save();
    return assignment;
  }

  async forgotPassword(email: string, role: string) {
    if (role === 'user') {
      return this.sendUserPasswordResetEmail(email);
    } else if (role === 'super_admin') {
      return this.sendSuperAdminPasswordResetEmail(email);
    } else if (role === 'outlet_admin') {
      return this.sendOutletAdminPasswordResetEmail(email);
    } else if (role === 'admin') {
      return this.sendAdminPasswordResetEmail(email);
    } else if (role === 'employee') {
      return this.sendEmployeePasswordResetEmail(email);
    }
    throw new AppErrorClass('Invalid role specified', 400);
  }

  async sendUserPasswordResetEmail(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
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

  async sendSuperAdminPasswordResetEmail(email: string) {
    const superAdmin = await this.superAdminService.findByEmail(email);
    if (!superAdmin) {
      throw new AppErrorClass('Super admin not found', 404);
    }
    const token = generateToken({
      _id: superAdmin._id.toString(),
      email: superAdmin.email,
      role: 'super_admin',
      type: 'super_admin'
    });
    await this.emailService.sendPasswordResetEmail(superAdmin.email, token, 'super_admin');
    return { message: 'Password reset email sent', token };
  }

  async sendOutletAdminPasswordResetEmail(email: string) {
    const outletAdmin = await this.outletAdminService.findByEmail(email);
    if (!outletAdmin) {
      throw new AppErrorClass('Outlet admin not found', 404);
    }
    const token = generateToken({
      _id: outletAdmin._id.toString(),
      email: outletAdmin.email,
      role: 'admin',
      type: 'admin'
    });
    await this.emailService.sendPasswordResetEmail(outletAdmin.email, token, 'admin');
    return { message: 'Password reset email sent', token };
  }

  async sendAdminPasswordResetEmail(email: string) {
    const admin = await this.adminService.findByEmail(email);
    if (!admin) {
      throw new AppErrorClass('Admin not found', 404);
    }
    const token = generateToken({
      _id: admin._id.toString(),
      email: admin.email,
      role: 'admin',
      type: 'admin'
    });
    await this.emailService.sendPasswordResetEmail(admin.email, token, 'admin');
    return { message: 'Password reset email sent', token };
  }

  async sendEmployeePasswordResetEmail(email: string) {
    const assignment = await OutletRoleAssignment.findOne({ email, role: 'employee' });
    if (!assignment) {
      throw new AppErrorClass('Employee not found', 404);
    }
    const token = generateToken({
      _id: assignment._id.toString(),
      email: assignment.email,
      role: 'employee',
      type: 'employee'
    });
    await this.emailService.sendPasswordResetEmail(assignment.email, token, 'employee');
    return { message: 'Password reset email sent', token };
  }

  async resetPassword(token: string, password: string, role: string) {
    if (role === 'user') {
      return this.resetUserPassword(token, password);
    } else if (role === 'super_admin') {
      return this.resetSuperAdminPassword(token, password);
    } else if (role === 'outlet_admin') {
      return this.resetOutletAdminPassword(token, password);
    } else if (role === 'admin') {
      return this.resetAdminPassword(token, password);
    } else if (role === 'employee') {
      return this.resetEmployeePassword(token, password);
    }
    throw new AppErrorClass('Invalid role specified', 400);
  }

  async resetUserPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    return this.userService.updatePassword(decoded._id, password);
  }

  async resetSuperAdminPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    return this.superAdminService.updatePassword(decoded._id, password);
  }

  async resetOutletAdminPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    return this.outletAdminService.updatePassword(decoded._id, password);
  }

  async resetAdminPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    return this.adminService.updatePassword(decoded._id, password);
  }

  async resetEmployeePassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    const assignment = await OutletRoleAssignment.findById(decoded._id);
    if (!assignment) {
      throw new AppErrorClass('Employee not found', 404);
    }
    assignment.password = password;
    await assignment.save();
    return assignment;
  }

  async logout(token: string) {
    await this.tokenService.blacklistToken(token, 24 * 60 * 60); // Blacklist for 24 hours
    return { message: 'Logged out successfully' };
  }

  async changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<IUserDocument> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new AppErrorClass('Current password is incorrect', 400);
    }

    const updatedUser = await this.userService.updatePassword(userId, newPassword);
    if (!updatedUser) {
      throw new AppErrorClass('Failed to update password', 500);
    }
    return updatedUser;
  }

  public async changePassword(user: any, currentPassword: string, newPassword: string) {
    if (user.type === 'user') {
      return this.changeUserPassword(user._id, currentPassword, newPassword);
    } else if (user.type === 'super_admin') {
      return this.superAdminService.changePassword(user._id, currentPassword, newPassword);
    } else if (user.type === 'outlet_admin') {
      return this.outletAdminService.changePassword(user._id, currentPassword, newPassword);
    } else if (user.type === 'admin') {
      return this.adminService.changePassword(user._id, currentPassword, newPassword);
    } else if (user.type === 'employee') {
      const assignment = await OutletRoleAssignment.findById(user._id);
      if (!assignment) throw new AppErrorClass('Employee not found', 404);
      const isValid = await bcryptjs.compare(currentPassword, assignment.password);
      if (!isValid) throw new AppErrorClass('Current password is incorrect', 400);
      assignment.password = newPassword;
      await assignment.save();
      return assignment;
    }
    throw new AppErrorClass('Invalid user type', 400);
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

    await this.emailService.sendVerificationEmail(email, token, role as 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin');
  }

  /**
   * Resend verification email for any role
   */
  async resendVerification(email: string, role: string): Promise<void> {
    if (!email || !role) {
      throw new Error('Email and role are required');
    }
    if (role === 'user') {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new Error('User not found');
      if (user.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: user._id.toString(), email: user.email, role: user.role, type: 'user' });
      await this.sendVerificationEmail(user.email, token, 'user');
    } else if (role === 'super_admin') {
      const superAdmin = await this.superAdminService.findByEmail(email);
      if (!superAdmin) throw new Error('Super admin not found');
      if (superAdmin.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: superAdmin._id.toString(), email: superAdmin.email, role: 'super_admin', type: 'super_admin' });
      await this.sendVerificationEmail(superAdmin.email, token, 'super_admin');
    } else if (role === 'outlet_admin') {
      const outletAdmin = await this.outletAdminService.findByEmail(email);
      if (!outletAdmin) throw new Error('Outlet admin not found');
      if (outletAdmin.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: outletAdmin._id.toString(), email: outletAdmin.email, role: 'outlet_admin', type: 'outlet_admin' });
      await this.sendVerificationEmail(outletAdmin.email, token, 'outlet_admin');
    } else if (role === 'employee') {
      const employee = await this.userService.findByEmail(email);
      if (!employee) throw new Error('Employee not found');
      if (employee.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: employee._id.toString(), email: employee.email, role: employee.role, type: 'employee' });
      await this.sendVerificationEmail(employee.email, token, 'employee');
    } else {
      throw new Error('Invalid role');
    }
  }
} 