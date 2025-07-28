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
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { EventOrganizer } from '../models/eventOrganizer.model';
import { EventAuthService } from './eventAuth.service';
import { EventManager } from '../models/eventManager.model';
import { EventStaff } from '../models/eventStaff.model';
import twilio from 'twilio';

// In-memory OTP store for demo (replace with Redis/DB in production)
const guestOtpStore: { [phone: string]: { otp: string, expires: number } } = {};

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export class AuthService {
  private userService: UserService;
  private adminService: AdminService;
  private superAdminService: SuperAdminService;
  private outletAdminService: OutletAdminService;
  private tokenService: TokenService;
  private emailService: EmailService;
  private eventAuthService: EventAuthService;

  constructor() {
    this.userService = new UserService();
    this.adminService = new AdminService();
    this.superAdminService = new SuperAdminService();
    this.outletAdminService = new OutletAdminService();
    this.tokenService = new TokenService();
    this.emailService = new EmailService();
    this.eventAuthService = new EventAuthService();
  }

  async registerUser(userData: Partial<IUser>): Promise<{ user: IUserDocument; token: string }> {
    // Normalize email and name to lowercase as a safeguard
    if (userData.email) userData.email = userData.email.toLowerCase();
    if (userData.name) userData.name = userData.name.toLowerCase();
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

    let referredBy = null;
    if (userData.referralCode) {
      const referrer = await this.userService.findByReferralCode(userData.referralCode);
      if (referrer) {
        referredBy = referrer.referralCode; // Store referralCode, not _id
      } else {
        throw new AppErrorClass('Referral code does not exist', 400);
      }
    }
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
      coins: 0, // Will be set below based on membershipType
      // reward_points: 0, // Disabled: reward points logic
      profilePicture: userData.profilePicture,
      address: userData.address,
      preferences: userData.preferences,
      lastLogin: undefined,
      loginAttempts: 0,
      lockUntil: undefined,
      referredBy // Save user ID of referrer or null
    } as Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>;

    // Credit coins based on membershipType
    let initialCoins = 0;
    switch (userData.membershipType) {
      case 'cityfeed_select':
        initialCoins = 100; // Example: 100 coins for select
        break;
      case 'cityfeed_edge':
        initialCoins = 200; // Example: 200 coins for edge
        break;
      case 'cityfeed_prime':
        initialCoins = 500; // Example: 500 coins for prime
        break;
      default:
        initialCoins = 0;
    }
    newUser.coins = initialCoins;

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

  async login(
    email: string,
    password: string,
    role: string
  ): Promise<
    | { user: IUserDocument; token: string }
    | { admin: IAdminDocument; token: string }
    | { superAdmin: any; token: string }
    | { outletAdmin: any; token: string; outletId: string | null; isFirstLogin: boolean }
    | { employee: any; token: string; isFirstLogin: boolean }
    | { organizer: any; token: string }
    | { manager: any; token: string }
    | { staff: any; token: string }
  > {
    // Normalize email to lowercase as a safeguard
    email = email?.toLowerCase();
    if (role === 'user') {
      return await this.loginUser(email, password);
    } else if (role === 'event_organizer') {
      const result = await this.loginEventUser(email, password, role) as { organizer: any; token: string };
      return { organizer: result.organizer, token: result.token };
    } else if (role === 'event_manager') {
      const result = await this.loginEventUser(email, password, role) as { manager: any; token: string };
      return { manager: result.manager, token: result.token };
    } else if (role === 'event_staff') {
      const result = await this.loginEventUser(email, password, role) as { staff: any; token: string };
      return { staff: result.staff, token: result.token };
    } else if (role === 'admin') {
      return await this.loginAdmin(email, password);
    } else if (role === 'outlet_admin') {
      const { outletAdmin, token, outletId } = await this.outletAdminService.login(email, password);
      return { outletAdmin, token, outletId, isFirstLogin: outletAdmin.isFirstLogin };
    } else if (role === 'super_admin') {
      const { superAdmin, token } = await this.superAdminService.login(email, password);
      return { superAdmin, token };
    } else if (role === 'employee') {
      const result = await this.loginEmployee(email, password);
      return { ...result, isFirstLogin: result.employee.isFirstLogin };
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
    // Ensure referralCode is included in user object for response
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

  async loginEventUser(email: string, password: string, role: string): Promise<
    { organizer: any; token: string } |
    { manager: any; token: string } |
    { staff: any; token: string }
  > {
    email = email.trim().toLowerCase();
    if (role === 'event_organizer') {
      const organizer = await EventOrganizer.findOne({ email });
      if (!organizer) throw new AppErrorClass('Invalid credentials', 400);
      const isMatch = await bcryptjs.compare(password, organizer.password);
      if (!isMatch) throw new AppErrorClass('Invalid credentials', 400);
      if (!organizer.isEmailVerified) throw new AppErrorClass('Email not verified. Please verify your email before logging in.', 400);
      if (!organizer.isApproved) throw new AppErrorClass('Your account is pending approval by CityFeed admin.', 403);
      const token = jwt.sign(
        { _id: organizer._id, email: organizer.email, role, type: role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
      return { organizer, token };
    } else if (role === 'event_manager') {
      const manager = await EventManager.findOne({ email });
      if (!manager) throw new AppErrorClass('Invalid credentials', 400);
      const isMatch = await bcryptjs.compare(password, manager.password);
      if (!isMatch) throw new AppErrorClass('Invalid credentials', 400);
      if (!manager.isEmailVerified) throw new AppErrorClass('Email not verified. Please verify your email before logging in.', 400);
      const token = jwt.sign(
        { _id: manager._id, email: manager.email, role, type: role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
      return { manager, token };
    } else if (role === 'event_staff') {
      const staff = await EventStaff.findOne({ email });
      if (!staff) throw new AppErrorClass('Invalid email or password.', 400);
      const isMatch = await bcryptjs.compare(password, staff.password);
      if (!isMatch) throw new AppErrorClass('Invalid email or password.', 400);
      if (!staff.isEmailVerified) throw new AppErrorClass('Email not verified. Please verify your email before logging in.', 400);
      const token = jwt.sign(
        { _id: staff._id, email: staff.email, role, type: role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
      return { staff, token };
    } else {
      throw new AppErrorClass('Invalid role specified', 400);
    }
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
        isEmailVerified: assignment.isEmailVerified,
        isFirstLogin: assignment.isFirstLogin
      },
      token
    };
  }

  async verifyEmail(token: string, role: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass('Invalid or expired token', 400);
    }
    if (role === 'user' || role === 'event_organizer' || role === 'event_manager' || role === 'event_staff') {
      if (role === 'event_organizer' || role === 'event_manager' || role === 'event_staff') {
        return this.eventAuthService.verifyEmail(token);
      }
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
    } else if (role === 'event_organizer') {
      return this.eventAuthService.sendOrganizerPasswordResetEmail(email);
    } else if (role === 'event_manager') {
      return this.eventAuthService.sendManagerPasswordResetEmail(email);
    } else if (role === 'event_staff') {
      return this.eventAuthService.sendStaffPasswordResetEmail(email);
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
      role: 'outlet_admin',
      type: 'outlet_admin'
    });
    await this.emailService.sendPasswordResetEmail(outletAdmin.email, token, 'outlet_admin');
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
    validatePasswordStrength(password);
    if (role === 'user') {
      return this.resetUserPassword(token, password);
    } else if (role === 'event_organizer') {
      return this.eventAuthService.resetOrganizerPassword(token, password);
    } else if (role === 'event_manager') {
      return this.eventAuthService.resetManagerPassword(token, password);
    } else if (role === 'event_staff') {
      return this.eventAuthService.resetStaffPassword(token, password);
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
    assignment.isFirstLogin = false;
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
    validatePasswordStrength(newPassword);
    if (user.type === 'user') {
      return this.changeUserPassword(user._id, currentPassword, newPassword);
    } else if (user.type === 'event_organizer') {
      return this.eventAuthService.changeOrganizerPassword(user._id, currentPassword, newPassword);
    } else if (user.type === 'event_manager') {
      // For event_manager, check password and update
      const manager = await EventManager.findById(user._id);
      if (!manager) throw new AppErrorClass('Event manager not found', 404);
      const isValid = await bcryptjs.compare(currentPassword, manager.password);
      if (!isValid) throw new AppErrorClass('Current password is incorrect', 400);
      manager.password = newPassword;
      await manager.save();
      return manager;
    } else if (user.type === 'event_staff') {
      // For event_staff, check password and update
      const staff = await EventStaff.findById(user._id);
      if (!staff) throw new AppErrorClass('Event staff not found', 404);
      const isValid = await bcryptjs.compare(currentPassword, staff.password);
      if (!isValid) throw new AppErrorClass('Current password is incorrect', 400);
      staff.password = newPassword;
      await staff.save();
      return staff;
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
      assignment.isFirstLogin = false;
      await assignment.save();
      return assignment;
    }
    throw new AppErrorClass('Invalid user type', 400);
  }

  private async sendVerificationEmail(email: string, token: string, role: string): Promise<void> {
    const baseUrl = config.frontendUrls[role] || config.frontendUrl;
    const verificationLink = `${baseUrl}/verify-email?token=${token}&role=${role}`;
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

    await this.emailService.sendVerificationEmail(email, token, role as 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff');
  }

  /**
   * Resend verification email for any role
   */
  async resendVerification(email: string, role: string): Promise<string> {
    if (!email || !role) {
      throw new Error('Email and role are required');
    }
    if (role === 'event_organizer') {
      const organizer = await EventOrganizer.findOne({ email });
      if (!organizer) throw new Error('Event organizer not found');
      if (organizer.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: organizer._id.toString(), email: organizer.email, role: 'event_organizer', type: 'event_organizer' });
      await this.sendVerificationEmail(organizer.email, token, 'event_organizer');
      return token;
    }
    if (role === 'event_manager') {
      const manager = await EventManager.findOne({ email });
      if (!manager) throw new Error('Event manager not found');
      if (manager.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: manager._id.toString(), email: manager.email, role: 'event_manager', type: 'event_manager' });
      await this.sendVerificationEmail(manager.email, token, 'event_manager');
      return token;
    }
    if (role === 'event_staff') {
      const staff = await EventStaff.findOne({ email });
      if (!staff) throw new Error('Event staff not found');
      if (staff.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: staff._id.toString(), email: staff.email, role: 'event_staff', type: 'event_staff' });
      await this.sendVerificationEmail(staff.email, token, 'event_staff');
      return token;
    }
    if (role === 'user') {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new Error('User not found');
      if (user.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: user._id.toString(), email: user.email, role: user.role, type: user.role });
      await this.sendVerificationEmail(user.email, token, user.role as 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff');
      return token;
    }
    if (role === 'super_admin') {
      const superAdmin = await this.superAdminService.findByEmail(email);
      if (!superAdmin) throw new Error('Super admin not found');
      if (superAdmin.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: superAdmin._id.toString(), email: superAdmin.email, role: 'super_admin', type: 'super_admin' });
      await this.sendVerificationEmail(superAdmin.email, token, 'super_admin');
      return token;
    }
    if (role === 'outlet_admin') {
      const outletAdmin = await this.outletAdminService.findByEmail(email);
      if (!outletAdmin) throw new Error('Outlet admin not found');
      if (outletAdmin.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: outletAdmin._id.toString(), email: outletAdmin.email, role: 'outlet_admin', type: 'outlet_admin' });
      await this.sendVerificationEmail(outletAdmin.email, token, 'outlet_admin');
      return token;
    }
    if (role === 'employee') {
      const assignment = await OutletRoleAssignment.findOne({ email });
      if (!assignment) throw new Error('Employee not found');
      if (assignment.isEmailVerified) throw new Error('Email is already verified');
      const token = generateToken({ _id: assignment._id.toString(), email: assignment.email, role: assignment.role as 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin', type: 'employee' });
      await this.sendVerificationEmail(assignment.email, token, 'employee');
      return token;
    }
    throw new Error('Invalid role');
  }

  public async firstLoginChangePassword(user: any, newPassword: string, role: string) {
    validatePasswordStrength(newPassword);
    if (role === 'outlet_admin') {
      return this.outletAdminService.updatePassword(user._id, newPassword);
    } else if (role === 'employee') {
      const assignment = await OutletRoleAssignment.findById(user._id);
      if (!assignment) throw new AppErrorClass('Invalid or expired token', 400);
      assignment.password = newPassword;
      assignment.isFirstLogin = false;
      await assignment.save();
      return assignment;
    } else if (role === 'event_organizer') {
      const organizer = await EventOrganizer.findById(user._id);
      if (!organizer) throw new AppErrorClass('Invalid or expired token', 400);
      organizer.password = newPassword;
      organizer.isFirstLogin = false;
      await organizer.save();
      return organizer;
    } else if (role === 'event_manager') {
      const manager = await EventManager.findById(user._id);
      if (!manager) throw new AppErrorClass('Invalid or expired token', 400);
      manager.password = newPassword;
      manager.isFirstLogin = false;
      await manager.save();
      return manager;
    } else if (role === 'event_staff') {
      const staff = await EventStaff.findById(user._id);
      if (!staff) throw new AppErrorClass('Invalid or expired token', 400);
      staff.password = newPassword;
      staff.isFirstLogin = false;
      await staff.save();
      return staff;
    } else {
      throw new AppErrorClass('First login password change is only supported for outlet_admin, employee, and event roles', 400);
    }
  }

  async sendGuestOtp(phone: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    guestOtpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };
    // Send SMS via Twilio
    await twilioClient.messages.create({
      body: `Your CityFeed OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone
    });
    console.log(`Guest OTP for ${phone}: ${otp}`);
    return otp; // For testing only (remove in production)
  }

  async guestLoginWithOtp(phone: string, otp: string): Promise<{ user: any, token: string }> {
    const record = guestOtpStore[phone];
    if (!record || record.otp !== otp || record.expires < Date.now()) {
      throw new AppErrorClass('Invalid or expired OTP', 400);
    }
    // OTP is valid, delete it
    delete guestOtpStore[phone];
    // Check if guest user exists
    let user = await this.userService.findByPhone(phone);
    if (!user || !user.isGuest) {
      // Create guest user
      const guestUserData = {
        name: `Guest-${phone.slice(-4)}`,
        email: undefined,
        password: undefined,
        phone,
        dob: undefined,
        gender: "other" as "other",
        membershipType: null,
        membershipExpiryDate: null,
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: true,
        role: "guest_event" as "guest_event",
        isGuest: true,
        coins: 0,
        reward_points: 0,
        profilePicture: undefined,
        address: undefined,
        preferences: undefined,
        lastLogin: new Date(),
        loginAttempts: 0,
        lockUntil: undefined,
        isApproved: true
      };
      user = await this.userService.createGuestUser(guestUserData);
    }
    // Generate JWT
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email || "",
      role: user.role,
      type: 'guest_event'
    });
    return { user, token };
  }
}

function validatePasswordStrength(password: string) {
  if (password.length < 8) {
    throw new AppErrorClass('Password must be at least 8 characters', 400);
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppErrorClass('Password must contain at least one uppercase letter', 400);
  }
  if (!/[a-z]/.test(password)) {
    throw new AppErrorClass('Password must contain at least one lowercase letter', 400);
  }
  if (!/\d/.test(password)) {
    throw new AppErrorClass('Password must contain at least one digit', 400);
  }
  if (!/[^A-Za-z\d]/.test(password)) {
    throw new AppErrorClass('Password must contain at least one special character', 400);
  }
} 