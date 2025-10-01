import { IUserService, UserService } from "./user.service";
import { AdminService, IAdminService } from "./admin.service";
import { ISuperAdminService, SuperAdminService } from "./superAdmin.service";
import { IOutletAdminService, OutletAdminService } from "./outletAdmin.service";
import { TokenService } from "./token.service";
import { ISendGridService, SendGridService } from "./sendgrid.service";
import { generateToken } from "../utils/jwt.util";
import { config } from "../config/config";
import { logger } from "../utils/logger.util";
import { AppErrorClass } from "../utils/appError";
import { Staff } from "../models/staff.model";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { EventOrganizer } from "../models/eventOrganizer.model";
import { EventAuthService, IEventAuthService } from "./eventAuth.service";
import { EventManager } from "../models/eventManager.model";
import { EventStaff } from "../models/eventStaff.model";
import { PreRegistrationPayment } from "../models/preRegistrationPayment.model";
import { Payment } from "../models/payment.model";
import { RewardHistory } from "../models/rewardHistory.model";
import twilio from "twilio";
import { inject } from "inversify";
import { IAdminDocument } from "../models/admin.model";
import { IUser, IUserDocument } from "../models/user.model";
import { DocumentType } from "@typegoose/typegoose";

import {
  UserRegisterDTO,
  UserLoginDTO,
  AdminLoginDTO,
  LoginResponseDTO,
  AdminLoginResponseDTO,
  PasswordResetRequestDTO,
  PasswordResetConfirmDTO,
  VerificationConfirmDTO,
  GuestLoginDTO,
  BaseResponse,
} from "../dto";
import { IEmailQueueService } from "./emailQueue.service";
import { ISuperAdmin } from "../models/superAdmin.model";

// In-memory OTP store for demo (replace with Redis/DB in production)
const guestOtpStore: { [phone: string]: { otp: string; expires: number } } = {};

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export interface IAuthService {
  registerUser: (
    userData: UserRegisterDTO
  ) => Promise<{ user: IUserDocument; token: string }>;

  verifyEmail: (token: string, role: string) => Promise<void>;
  forgotPassword: (email: string, role: string) => Promise<void>;
  resetPassword: (
    token: string,
    newPassword: string,
    role: string
  ) => Promise<void>;
  changePassword: (
    userId: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  sendVerificationEmail: (
    email: string,
    token: string,
    role: string
  ) => Promise<void>;
  login: (email: string, password: string, role: string) => Promise<any>;
  loginAdmin: (email: string, password: string) => Promise<any>;
  loginUser: (email: string, password: string) => Promise<any>;
  logout: (token: string) => Promise<BaseResponse>;
  changeUserPassword: (
    userId: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<IUserDocument>;
  resendVerification: (email: string, role: string) => Promise<string>;
  firstLoginChangePassword(
    userId: string,
    newPassword: string,
    role: string
  ): Promise<void>;
  sendGuestOtp(phone: string): Promise<string>;
  guestLoginWithOtp(
    phone: string,
    otp: string
  ): Promise<{ user: any; token: string }>;
}

export class AuthService implements IAuthService {
  constructor(
    @inject("UserService") private userService: IUserService,
    @inject("AdminService") private adminService: IAdminService,
    @inject("SuperAdminService") private superAdminService: ISuperAdminService,
    @inject("OutletAdminService")
    private outletAdminService: IOutletAdminService,
    @inject("TokenService") private tokenService: TokenService,
    @inject("SendGridService") private sendGridService: ISendGridService,
    @inject("EventAuthService") private eventAuthService: IEventAuthService,
    @inject("EmailQueueService") private emailQueueService: IEmailQueueService
  ) {}

  async registerUser(
    userData: UserRegisterDTO
  ): Promise<{ user: IUserDocument; token: string }> {
    // Normalize email and name to lowercase as a safeguard
    if (userData.email) userData.email = userData.email.toLowerCase();
    if (userData.name) userData.name = userData.name.toLowerCase();
    if (!userData.name || !userData.phone) {
      throw new AppErrorClass("Name and phone are required", 400);
    }

    // Check if email is already taken by a verified user
    const existingVerifiedUser = await this.userService.findVerifiedUserByEmail(
      userData.email
    );
    if (existingVerifiedUser) {
      throw new AppErrorClass(
        "Email already registered with a verified account",
        409
      );
    }

    // Clean up old unverified users with the same email (optional)
    await this.userService.cleanupUnverifiedUsers(userData.email);

    // Check if phone number is already registered
    const existingUserByPhone = await this.userService.findByPhone(
      userData.phone
    );
    if (existingUserByPhone) {
      throw new AppErrorClass("Phone number already registered", 409);
    }

    // Calculate membership expiry date (1 year from now)
    const membershipExpiryDate = new Date();
    membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

    let referredBy = null;
    if (userData.referralCode) {
      const referrer = await this.userService.findByReferralCode(
        userData.referralCode
      );
      if (referrer) {
        referredBy = referrer.referralCode; // Store referralCode, not _id
      } else {
        throw new AppErrorClass("Referral code does not exist", 400);
      }
    }

    // Calculate initial coins based on membership type
    const initialCoins =
      config.registrationCoinRewards[
        userData.membershipType as keyof typeof config.registrationCoinRewards
      ] || 0;

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
      role: "user" as const,
      coins: initialCoins,
      profilePicture: userData.profilePicture,
      address: userData.address,
      preferences: userData.preferences,
      lastLogin: undefined,
      loginAttempts: 0,
      lockUntil: undefined,
      referredBy, // Save user ID of referrer or null
    } as Omit<IUser, "_id" | "createdAt" | "updatedAt">;

    const user = await this.userService.createUser(newUser);

    // Get the pre-registration payment details
    const preRegistrationPayment = await PreRegistrationPayment.findOne({
      email: userData.email,
      membershipType: userData.membershipType,
      status: "success",
    });

    // Create payment record for registration
    if (preRegistrationPayment) {
      const membershipPrices: Record<string, number> = {
        cityfeed_select: 499,
        cityfeed_edge: 999,
        cityfeed_prime: 1499,
      };

      const registrationPayment = new Payment({
        userId: user._id.toString(),
        amount:
          membershipPrices[
            userData.membershipType as keyof typeof membershipPrices
          ] || 0,
        type: "membership_purchase",
        status: "completed",
        paymentMethod: "razorpay",
        razorpayOrderId: preRegistrationPayment.razorpayOrderId,
        createdAt: new Date(),
      });
      await registrationPayment.save();

      // Mark pre-registration payment as consumed instead of deleting
      await PreRegistrationPayment.updateOne(
        { _id: preRegistrationPayment._id },
        {
          status: "consumed",
          consumedAt: new Date(),
          userId: user._id.toString(),
          paymentId: registrationPayment._id.toString(),
        }
      );
    }

    // Create reward history record for joining reward points
    if (initialCoins > 0) {
      const rewardHistory = new RewardHistory({
        userId: user._id.toString(),
        transactionType: "earned",
        amount: initialCoins,
        sourceType: "membership",
        description: `Joining reward points for ${userData.membershipType} membership`,
        balanceBefore: 0,
        balanceAfter: initialCoins,
        createdAt: new Date(),
      });
      await rewardHistory.save();
    }

    // Generate QR code for user registration
    const QRCode = (await import("qrcode")).default;
    const cloudinary = (await import("../config/cloudinary")).default;
    const qrPayload =
      "==============================\n" +
      "  🪪 CityFeed Membership QR  🪪\n" +
      "==============================\n" +
      `User ID: ${user._id}\n` +
      `Name: ${user.name}\n` +
      `Email: ${user.email}\n` +
      `Phone: ${user.phone}\n` +
      `Membership: ${user.membershipType}\n` +
      `Expiry: ${
        user.membershipExpiryDate
          ? user.membershipExpiryDate.toISOString().split("T")[0]
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
    user.qrCodeUrl = qrCodeUrl;
    await user.save();
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "user",
    });
    await this.sendVerificationEmail(user.email, token, "user");
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
    | {
        outletAdmin: any;
        token: string;
        outletId: string | null;
        isFirstLogin: boolean;
      }
    | { employee: any; token: string; isFirstLogin: boolean }
    | { organizer: any; token: string }
    | { manager: any; token: string }
    | { staff: any; token: string }
  > {
    // Normalize email to lowercase as a safeguard
    email = email?.toLowerCase();
    if (role === "user") {
      return await this.loginUser(email, password);
    } else if (role === "event_organizer") {
      const result = (await this.loginEventUser(email, password, role)) as {
        organizer: any;
        token: string;
      };
      return { organizer: result.organizer, token: result.token };
    } else if (role === "event_manager") {
      const result = (await this.loginEventUser(email, password, role)) as {
        manager: any;
        token: string;
      };
      return { manager: result.manager, token: result.token };
    } else if (role === "event_staff") {
      const result = (await this.loginEventUser(email, password, role)) as {
        staff: any;
        token: string;
      };
      return { staff: result.staff, token: result.token };
    } else if (role === "admin") {
      return await this.loginAdmin(email, password);
    } else if (role === "outlet_admin") {
      const { outletAdmin, token, outletId } =
        await this.outletAdminService.login(email, password);
      return {
        outletAdmin,
        token,
        outletId,
        isFirstLogin: outletAdmin.isFirstLogin,
      };
    } else if (role === "super_admin") {
      const { superAdmin, token } = await this.superAdminService.login(
        email,
        password
      );
      return { superAdmin, token };
    } else if (role === "employee") {
      const result = await this.loginEmployee(email, password);
      return { ...result, isFirstLogin: result.employee.isFirstLogin };
    }
    throw new AppErrorClass("Invalid role specified", 400);
  }

  async loginUser(
    email: string,
    password: string
  ): Promise<{ user: IUserDocument; token: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new AppErrorClass("Invalid credentials", 400);
    }
    if (!user.isActive) {
      throw new AppErrorClass(
        "Your account is deactivated. Please contact admin",
        403
      );
    }
    if (!user.isEmailVerified) {
      const token = generateToken({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        type: "user",
      });
      await this.sendVerificationEmail(user.email, token, "user");
      throw new AppErrorClass(
        "Email not verified. A new verification email has been sent to your email address.",
        400
      );
    }
    const token = generateToken(
      {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        type: "user",
      },
      "7d"
    );
    // Ensure referralCode is included in user object for response
    return { user, token };
  }

  async loginAdmin(
    email: string,
    password: string
  ): Promise<{ admin: IAdminDocument; token: string }> {
    const admin = await this.adminService.findByEmail(email);
    if (!admin || !(await admin.comparePassword(password))) {
      throw new AppErrorClass("Invalid credentials", 400);
    }
    if (!admin.isActive) {
      throw new AppErrorClass(
        "Your account is deactivated. Please contact admin",
        403
      );
    }
    const token = generateToken(
      {
        _id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        type: "admin",
      },
      "7d"
    );
    return { admin, token };
  }

  async loginEventUser(
    email: string,
    password: string,
    role: string
  ): Promise<
    | { organizer: any; token: string }
    | { manager: any; token: string }
    | { staff: any; token: string }
  > {
    email = email.trim().toLowerCase();
    if (role === "event_organizer") {
      const organizer = await EventOrganizer.findOne({ email });
      if (!organizer) throw new AppErrorClass("Invalid credentials", 400);
      if (organizer.isDeleted)
        throw new AppErrorClass("Account is deleted", 403);
      const isMatch = await bcryptjs.compare(password, organizer.password);
      if (!isMatch) throw new AppErrorClass("Invalid credentials", 400);
      if (!organizer.isEmailVerified) {
        const token = generateToken({
          _id: organizer._id.toString(),
          email: organizer.email,
          role: "event_organizer",
          type: "event_organizer",
        });
        await this.sendVerificationEmail(
          organizer.email,
          token,
          "event_organizer"
        );
        throw new AppErrorClass(
          "Email not verified. A new verification email has been sent to your email address.",
          400
        );
      }
      if (!organizer.isApproved)
        throw new AppErrorClass(
          "Your account is pending approval by CityFeed admin.",
          403
        );
      const token = jwt.sign(
        { _id: organizer._id, email: organizer.email, role, type: role },
        config.jwtSecret,
        { expiresIn: "7d" }
      );
      return { organizer, token };
    } else if (role === "event_manager") {
      const manager = await EventManager.findOne({ email });
      if (!manager) throw new AppErrorClass("Invalid credentials", 400);
      if (manager.isDeleted) throw new AppErrorClass("Account is deleted", 403);
      if (!manager.isActive)
        throw new AppErrorClass(
          "Your account is deactivated. Please contact admin",
          403
        );
      const isMatch = await bcryptjs.compare(password, manager.password);
      if (!isMatch) throw new AppErrorClass("Invalid credentials", 400);
      if (!manager.isEmailVerified) {
        const token = generateToken({
          _id: manager._id.toString(),
          email: manager.email,
          role: "event_manager",
          type: "event_manager",
        });
        await this.sendVerificationEmail(manager.email, token, "event_manager");
        throw new AppErrorClass(
          "Email not verified. A new verification email has been sent to your email address.",
          400
        );
      }
      const token = jwt.sign(
        { _id: manager._id, email: manager.email, role, type: role },
        config.jwtSecret,
        { expiresIn: "7d" }
      );
      return { manager, token };
    } else if (role === "event_staff") {
      const staff = await EventStaff.findOne({ email });
      if (!staff) throw new AppErrorClass("Invalid email or password.", 400);
      if (staff.isDeleted) throw new AppErrorClass("Account is deleted", 403);
      if (!staff.isActive)
        throw new AppErrorClass(
          "Your account is deactivated. Please contact admin",
          403
        );
      const isMatch = await bcryptjs.compare(password, staff.password);
      if (!isMatch) throw new AppErrorClass("Invalid email or password.", 400);
      if (!staff.isEmailVerified) {
        const token = generateToken({
          _id: staff._id.toString(),
          email: staff.email,
          role: "event_staff",
          type: "event_staff",
        });
        await this.sendVerificationEmail(staff.email, token, "event_staff");
        throw new AppErrorClass(
          "Email not verified. A new verification email has been sent to your email address.",
          400
        );
      }
      const token = jwt.sign(
        { _id: staff._id, email: staff.email, role, type: role },
        config.jwtSecret,
        { expiresIn: "7d" }
      );
      return { staff, token };
    } else {
      throw new AppErrorClass("Invalid role specified", 400);
    }
  }

  async loginEmployee(
    email: string,
    password: string
  ): Promise<{ employee: any; token: string }> {
    const staff = await Staff.findOne({ email });
    if (!staff) {
      throw new AppErrorClass("Invalid credentials", 400);
    }
    if (staff.isDeleted) {
      throw new AppErrorClass("Account is deleted", 403);
    }
    if (!staff.isActive) {
      throw new AppErrorClass(
        "Your account is deactivated. Please contact admin",
        403
      );
    }
    if (!staff.isEmailVerified) {
      // Send verification email if not verified
      const token = generateToken({
        _id: staff._id.toString(),
        email: staff.email,
        role: "employee",
        type: "employee",
      });
      await this.sendVerificationEmail(staff.email, token, "employee");
      throw new AppErrorClass(
        "Email not verified. A new verification email has been sent to your email address.",
        400
      );
    }

    const isMatch = await bcryptjs.compare(password, staff.password);

    if (!isMatch) {
      throw new AppErrorClass("Invalid credentials", 400);
    }
    const token = jwt.sign(
      {
        _id: staff._id,
        email: staff.email,
        role: staff.role,
        type: "employee",
        outlet: staff.outlet,
        responsibilities: staff.responsibilities,
      },
      config.jwtSecret,
      { expiresIn: "7d" }
    );
    return {
      employee: {
        _id: staff._id,
        email: staff.email,
        role: staff.role,
        outlet: staff.outlet,
        responsibilities: staff.responsibilities,
        name: staff.name,
        phone: staff.phone,
        isEmailVerified: staff.isEmailVerified,
        isFirstLogin: staff.isFirstLogin,
      },
      token,
    };
  }

  async verifyEmail(token: string, role: string): Promise<any> {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    if (
      role === "user" ||
      role === "event_organizer" ||
      role === "event_manager" ||
      role === "event_staff"
    ) {
      if (
        role === "event_organizer" ||
        role === "event_manager" ||
        role === "event_staff"
      ) {
        return this.eventAuthService.verifyEmail(token);
      }
      return this.verifyUserEmail(token);
    } else if (role === "super_admin") {
      return this.verifySuperAdminEmail(token);
    } else if (role === "outlet_admin") {
      return this.verifyOutletAdminEmail(token);
    } else if (role === "employee") {
      return this.verifyEmployeeEmail(token);
    }
    throw new AppErrorClass("Invalid role specified", 400);
  }

  async verifyUserEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    return this.userService.verifyEmail(decoded._id);
  }

  async verifySuperAdminEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    const superAdmin = await this.superAdminService.verifyEmail(token);
    if (superAdmin) {
      try {
       await this.sendGridService.sendSuperAdminVerifiedAdminNotification(superAdmin);

      } catch (error) {
        logger.error(
          "[AuthService] Error notifying admin for super admin:",
          superAdmin.email,
          error
        );
      }
    }
    return superAdmin;
  }

  async verifyOutletAdminEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    return this.outletAdminService.verifyEmail(token);
  }

  async verifyEmployeeEmail(token: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    const staff = await Staff.findById(decoded._id);
    if (!staff) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    staff.isEmailVerified = true;
    await staff.save();
    return staff;
  }

  async forgotPassword(email: string, role: string): Promise<any> {
    if (role === "user") {
      return this.sendUserPasswordResetEmail(email);
    } else if (role === "event_organizer") {
      return this.eventAuthService.sendOrganizerPasswordResetEmail(email);
    } else if (role === "event_manager") {
      return this.eventAuthService.sendManagerPasswordResetEmail(email);
    } else if (role === "event_staff") {
      return this.eventAuthService.sendStaffPasswordResetEmail(email);
    } else if (role === "super_admin") {
      return this.sendSuperAdminPasswordResetEmail(email);
    } else if (role === "outlet_admin") {
      return this.sendOutletAdminPasswordResetEmail(email);
    } else if (role === "admin") {
      return this.sendAdminPasswordResetEmail(email);
    } else if (role === "employee") {
      return this.sendEmployeePasswordResetEmail(email);
    }
    throw new AppErrorClass("Invalid role specified", 400);
  }

  async sendUserPasswordResetEmail(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "user",
    });
    await this.sendGridService.sendPasswordResetEmail(
      user.email,
      token,
      "user"
    );
    return { message: "Password reset email sent", token };
  }

  async sendSuperAdminPasswordResetEmail(email: string) {
    const superAdmin = await this.superAdminService.findByEmail(email);
    if (!superAdmin) {
      throw new AppErrorClass("Super admin not found", 404);
    }
    const token = generateToken({
      _id: superAdmin._id.toString(),
      email: superAdmin.email,
      role: "super_admin",
      type: "super_admin",
    });
    await this.sendGridService.sendPasswordResetEmail(
      superAdmin.email,
      token,
      "super_admin"
    );
    return { message: "Password reset email sent", token };
  }

  async sendOutletAdminPasswordResetEmail(email: string) {
    const outletAdmin = await this.outletAdminService.findByEmail(email);
    if (!outletAdmin) {
      throw new AppErrorClass("Outlet admin not found", 404);
    }
    const token = generateToken({
      _id: outletAdmin._id.toString(),
      email: outletAdmin.email,
      role: "outlet_admin",
      type: "outlet_admin",
    });
    await this.sendGridService.sendPasswordResetEmail(
      outletAdmin.email,
      token,
      "outlet_admin"
    );
    return { message: "Password reset email sent", token };
  }

  async sendAdminPasswordResetEmail(email: string) {
    const admin = await this.adminService.findByEmail(email);
    if (!admin) {
      throw new AppErrorClass("Admin not found", 404);
    }
    const token = generateToken({
      _id: admin._id.toString(),
      email: admin.email,
      role: "admin",
      type: "admin",
    });
    await this.sendGridService.sendPasswordResetEmail(
      admin.email,
      token,
      "admin"
    );
    return { message: "Password reset email sent", token };
  }

  async sendEmployeePasswordResetEmail(email: string) {
    const staff = await Staff.findOne({ email });
    if (!staff) {
      throw new AppErrorClass("Employee not found", 404);
    }
    const token = generateToken({
      _id: staff._id.toString(),
      email: staff.email,
      role: "employee",
      type: "employee",
    });
    await this.sendGridService.sendPasswordResetEmail(
      staff.email,
      token,
      "employee"
    );
    return { message: "Password reset email sent", token };
  }

  async resetPassword(
    token: string,
    password: string,
    role: string
  ): Promise<any> {
    validatePasswordStrength(password);
    if (role === "user") {
      return this.resetUserPassword(token, password);
    } else if (role === "event_organizer") {
      return this.eventAuthService.resetOrganizerPassword(token, password);
    } else if (role === "event_manager") {
      return this.eventAuthService.resetManagerPassword(token, password);
    } else if (role === "event_staff") {
      return this.eventAuthService.resetStaffPassword(token, password);
    } else if (role === "super_admin") {
      return this.resetSuperAdminPassword(token, password);
    } else if (role === "outlet_admin") {
      return this.resetOutletAdminPassword(token, password);
    } else if (role === "admin") {
      return this.resetAdminPassword(token, password);
    } else if (role === "employee") {
      return this.resetEmployeePassword(token, password);
    }
    throw new AppErrorClass("Invalid role specified", 400);
  }

  async resetUserPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    return this.userService.updatePassword(decoded._id, password);
  }

  async resetSuperAdminPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    return this.superAdminService.updatePassword(decoded._id, password);
  }

  async resetOutletAdminPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    return this.outletAdminService.updatePassword(decoded._id, password);
  }

  async resetAdminPassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    return this.adminService.updatePassword(decoded._id, password);
  }

  async resetEmployeePassword(token: string, password: string) {
    const decoded = this.tokenService.verifyToken(token);
    if (!decoded) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    const staff = await Staff.findById(decoded._id);
    if (!staff) {
      throw new AppErrorClass("Employee not found", 404);
    }
    staff.password = password;
    staff.isFirstLogin = false;
    await staff.save();
    return staff;
  }

  async logout(token: string): Promise<any> {
    await this.tokenService.blacklistToken(token); // Blacklist for 24 hours
    return { message: "Logged out successfully" };
  }

  async changeUserPassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IUserDocument> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new AppErrorClass("Current password is incorrect", 400);
    }

    const updatedUser = await this.userService.updatePassword(
      userId,
      newPassword
    );
    if (!updatedUser) {
      throw new AppErrorClass("Failed to update password", 500);
    }
    return updatedUser;
  }

  public async changePassword(
    user: any,
    currentPassword: string,
    newPassword: string
  ): Promise<any> {
    validatePasswordStrength(newPassword);
    if (user.type === "user") {
      return this.changeUserPassword(user._id, currentPassword, newPassword);
    } else if (user.type === "event_organizer") {
      return this.eventAuthService.changeOrganizerPassword(
        user._id,
        currentPassword,
        newPassword
      );
    } else if (user.type === "event_manager") {
      // For event_manager, check password and update
      const manager = await EventManager.findById(user._id);
      if (!manager) throw new AppErrorClass("Event manager not found", 404);
      const isValid = await bcryptjs.compare(currentPassword, manager.password);
      if (!isValid)
        throw new AppErrorClass("Current password is incorrect", 400);
      manager.password = newPassword;
      await manager.save();
      return manager;
    } else if (user.type === "event_staff") {
      // For event_staff, check password and update
      const staff = await EventStaff.findById(user._id);
      if (!staff) throw new AppErrorClass("Event staff not found", 404);
      const isValid = await bcryptjs.compare(currentPassword, staff.password);
      if (!isValid)
        throw new AppErrorClass("Current password is incorrect", 400);
      staff.password = newPassword;
      await staff.save();
      return staff;
    } else if (user.type === "super_admin") {
      return this.superAdminService.changePassword(
        user._id,
        currentPassword,
        newPassword
      );
    } else if (user.type === "outlet_admin") {
      return this.outletAdminService.changePassword(
        user._id,
        currentPassword,
        newPassword
      );
    } else if (user.type === "admin") {
      return this.adminService.changePassword(
        user._id,
        currentPassword,
        newPassword
      );
    } else if (user.type === "employee") {
      const staff = await Staff.findById(user._id);
      if (!staff) throw new AppErrorClass("Employee not found", 404);
      const isValid = await bcryptjs.compare(currentPassword, staff.password);
      if (!isValid)
        throw new AppErrorClass("Current password is incorrect", 400);
      staff.password = newPassword;
      staff.isFirstLogin = false;
      await staff.save();
      return staff;
    }
    throw new AppErrorClass("Invalid user type", 400);
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void> {
    try {
      if (!email || !token || !role) {
        logger.error("Missing required parameters for verification email:", {
          email,
          token: token ? "present" : "missing",
          role,
        });
        return;
      }

      // Use email queue service to send email asynchronously without blocking
      await this.emailQueueService.sendVerificationEmail(email, token, role);
      logger.info(`Verification email queued for ${email}`);
    } catch (error) {
      logger.error(`Error in sendVerificationEmail for ${email}:`, error);
      // Don't throw error to prevent blocking the registration process
    }
  }

  /**
   * Resend verification email for any role
   */
  async resendVerification(email: string, role: string): Promise<string> {
    if (!email || !role) {
      throw new Error("Email and role are required");
    }
    if (role === "event_organizer") {
      const organizer = await EventOrganizer.findOne({ email });
      if (!organizer) throw new Error("Event organizer not found");
      if (organizer.isEmailVerified)
        throw new Error("Email is already verified");
      const token = generateToken({
        _id: organizer._id.toString(),
        email: organizer.email,
        role: "event_organizer",
        type: "event_organizer",
      });
      await this.sendVerificationEmail(
        organizer.email,
        token,
        "event_organizer"
      );
      return token;
    }
    if (role === "event_manager") {
      const manager = await EventManager.findOne({ email });
      if (!manager) throw new Error("Event manager not found");
      if (manager.isEmailVerified) throw new Error("Email is already verified");
      const token = generateToken({
        _id: manager._id.toString(),
        email: manager.email,
        role: "event_manager",
        type: "event_manager",
      });
      await this.sendVerificationEmail(manager.email, token, "event_manager");
      return token;
    }
    if (role === "event_staff") {
      const staff = await EventStaff.findOne({ email });
      if (!staff) throw new Error("Event staff not found");
      if (staff.isEmailVerified) throw new Error("Email is already verified");
      const token = generateToken({
        _id: staff._id.toString(),
        email: staff.email,
        role: "event_staff",
        type: "event_staff",
      });
      await this.sendVerificationEmail(staff.email, token, "event_staff");
      return token;
    }
    if (role === "user") {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new Error("User not found");
      if (user.isEmailVerified) throw new Error("Email is already verified");
      const token = generateToken({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        type: user.role,
      });
      await this.sendVerificationEmail(
        user.email,
        token,
        user.role as
          | "user"
          | "admin"
          | "super_admin"
          | "employee"
          | "outlet_admin"
          | "event_organizer"
          | "event_manager"
          | "event_staff"
      );
      return token;
    }
    if (role === "super_admin") {
      const superAdmin = await this.superAdminService.findByEmail(email);
      if (!superAdmin) throw new Error("Super admin not found");
      if (superAdmin.isEmailVerified)
        throw new Error("Email is already verified");
      const token = generateToken({
        _id: superAdmin._id.toString(),
        email: superAdmin.email,
        role: "super_admin",
        type: "super_admin",
      });
      await this.sendVerificationEmail(superAdmin.email, token, "super_admin");
      return token;
    }
    if (role === "outlet_admin") {
      const outletAdmin = await this.outletAdminService.findByEmail(email);
      if (!outletAdmin) throw new Error("Outlet admin not found");
      if (outletAdmin.isEmailVerified)
        throw new Error("Email is already verified");
      const token = generateToken({
        _id: outletAdmin._id.toString(),
        email: outletAdmin.email,
        role: "outlet_admin",
        type: "outlet_admin",
      });
      await this.sendVerificationEmail(
        outletAdmin.email,
        token,
        "outlet_admin"
      );
      return token;
    }
    if (role === "employee") {
      const staff = await Staff.findOne({ email });
      if (!staff) throw new Error("Employee not found");
      if (staff.isEmailVerified) throw new Error("Email is already verified");
      const token = generateToken({
        _id: staff._id.toString(),
        email: staff.email,
        role: staff.role as
          | "user"
          | "admin"
          | "super_admin"
          | "employee"
          | "outlet_admin",
        type: "employee",
      });
      await this.sendVerificationEmail(staff.email, token, "employee");
      return token;
    }
    throw new Error("Invalid role");
  }

  public async firstLoginChangePassword(
    user: any,
    newPassword: string,
    role: string
  ): Promise<any> {
    validatePasswordStrength(newPassword);
    if (role === "outlet_admin") {
      return this.outletAdminService.updatePassword(user._id, newPassword);
    } else if (role === "employee") {
      const staff = await Staff.findById(user._id);
      if (!staff) throw new AppErrorClass("Invalid or expired token", 400);
      staff.password = newPassword;
      staff.isFirstLogin = false;
      await staff.save();
      return staff;
    } else if (role === "event_organizer") {
      const organizer = await EventOrganizer.findById(user._id);
      if (!organizer) throw new AppErrorClass("Invalid or expired token", 400);
      organizer.password = newPassword;
      organizer.isFirstLogin = false;
      await organizer.save();
      return organizer;
    } else if (role === "event_manager") {
      const manager = await EventManager.findById(user._id);
      if (!manager) throw new AppErrorClass("Invalid or expired token", 400);
      manager.password = newPassword;
      manager.isFirstLogin = false;
      await manager.save();
      return manager;
    } else if (role === "event_staff") {
      const staff = await EventStaff.findById(user._id);
      if (!staff) throw new AppErrorClass("Invalid or expired token", 400);
      staff.password = newPassword;
      staff.isFirstLogin = false;
      await staff.save();
      return staff;
    } else {
      throw new AppErrorClass(
        "First login password change is only supported for outlet_admin, employee, and event roles",
        400
      );
    }
  }

  async sendGuestOtp(phone: string): Promise<string> {
    // Check if phone number already exists as a regular user BEFORE sending OTP
    const existingUser = await this.userService.findByPhone(phone);
    if (existingUser && !existingUser.isGuest) {
      throw new AppErrorClass(
        "This phone number is already registered as a regular user. Please login with your regular account instead of guest login.",
        400
      );
    }

    // Format phone number to ensure it has country code (same as OTP service)
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    guestOtpStore[formattedPhone] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    };

    // Try to send SMS via Twilio, but don't fail if SMS is not enabled
    try {
      const message = await twilioClient.messages.create({
        body: `Your CityFeed OTP is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: formattedPhone,
      });
    } catch (smsError: any) {
      console.warn(
        `SMS sending failed for ${formattedPhone}:`,
        smsError.message
      );
      // In development, we can still proceed without SMS
    }

    // Ensure a guest placeholder exists in DB so the user appears in users collection
    try {
      const existing = await this.userService.findByPhone(phone);
      if (!existing) {
        // Only create guest user if no user exists with this phone
        const guestUserData = {
          name: `Guest-${phone.slice(-4)}`,
          email: `guest_${phone}@cityfeed.guest`,
          password: undefined,
          phone,
          dob: undefined,
          gender: "other" as const,
          membershipType: null,
          membershipExpiryDate: null,
          isActive: true,
          isEmailVerified: false,
          isPhoneVerified: false, // will be set true upon OTP verification
          role: "guest_event" as const,
          isGuest: true,
          coins: 0,
          profilePicture: undefined,
          address: undefined,
          preferences: undefined,
          lastLogin: new Date(),
          loginAttempts: 0,
          lockUntil: undefined,
          isApproved: true,
        };
        const createdUser = await this.userService.createGuestUser(
          guestUserData
        );
        console.log("Guest user created successfully:", createdUser._id);
      } else if (existing.isGuest) {
        console.log("Guest user already exists:", existing._id);
      } else {
        console.log(
          "Phone number already registered as regular user:",
          existing._id
        );
      }
    } catch (e) {
      // Non-fatal: failure to pre-create should not block OTP sending
      console.warn(`Failed to pre-create guest user for ${phone}:`, e);
    }

    console.log("=== END SMS DEBUG ===");
    return otp; // For testing only (remove in production)
  }

  async guestLoginWithOtp(
    phone: string,
    otp: string
  ): Promise<{ user: any; token: string }> {
    // Format phone number to match the format used when storing OTP
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const record = guestOtpStore[formattedPhone];
    if (!record || record.otp !== otp || record.expires < Date.now()) {
      throw new AppErrorClass("Invalid or expired OTP", 400);
    }
    // OTP is valid, delete it
    delete guestOtpStore[formattedPhone];

    // Check if phone number already exists as a regular user
    const existingUser = await this.userService.findByPhone(phone);
    if (existingUser && !existingUser.isGuest) {
      throw new AppErrorClass(
        "This phone number is already registered as a regular user. Please login with your regular account instead of guest login.",
        400
      );
    }

    // If no user exists or if it's already a guest user, proceed
    let user = existingUser;
    if (!user) {
      // Create new guest user only if none exists
      const guestUserData = {
        name: `Guest-${phone.slice(-4)}`,
        email: `guest_${phone}@cityfeed.guest`,
        password: undefined,
        phone,
        dob: undefined,
        gender: "other" as const,
        membershipType: null,
        membershipExpiryDate: null,
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: true,
        role: "guest_event" as const,
        isGuest: true,
        coins: 0,
        profilePicture: undefined,
        address: undefined,
        preferences: undefined,
        lastLogin: new Date(),
        loginAttempts: 0,
        lockUntil: undefined,
        isApproved: true,
      };
      user = await this.userService.createGuestUser(guestUserData);
    } else {
      console.log("Existing guest user found:", user._id);
    }

    // Generate JWT
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email || "",
      role: user.role,
      type: "guest_event",
    });
    return { user, token };
  }
}

function validatePasswordStrength(password: string) {
  if (password.length < 8) {
    throw new AppErrorClass("Password must be at least 8 characters", 400);
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppErrorClass(
      "Password must contain at least one uppercase letter",
      400
    );
  }
  if (!/[a-z]/.test(password)) {
    throw new AppErrorClass(
      "Password must contain at least one lowercase letter",
      400
    );
  }
  if (!/\d/.test(password)) {
    throw new AppErrorClass("Password must contain at least one digit", 400);
  }
  if (!/[^A-Za-z\d]/.test(password)) {
    throw new AppErrorClass(
      "Password must contain at least one special character",
      400
    );
  }
}
