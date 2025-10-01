import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { AuthService, IAuthService } from "../services/auth.service";
import { AuthRequest } from "../interfaces/auth.interface";
import {
  IUserRepository,
  UserRepository,
} from "../repositories/user.repository";
import { TokenService } from "../services/token.service";
import fs from "fs";
import https from "https";
import cloudinary from "../config/cloudinary";
import { config } from "../config/config";
import { IUserService } from "../services/user.service";
import { IStaffService } from "../services/staff.service";
import { Staff } from "../models/staff.model";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { PreRegistrationPayment } from "../models/preRegistrationPayment.model";
import { ISuperAdminService } from "../services/superAdmin.service";
import { generateToken } from "../utils/jwt.util";
import { injectable, inject } from "inversify";
import {
  AdminLoginResponseDTO,
  LoginResponseDTO,
  PasswordResetConfirmDTO,
  PasswordResetRequestDTO,
  UserLoginDTO,
  VerificationConfirmDTO,
} from "src/dto/auth.dto";
import { EmailQueueService } from "../services/emailQueue.service";
import { BaseResponse } from "src/dto";


@injectable()
export class AuthController extends BaseController {
  constructor(
    @inject("AuthService") private authService: IAuthService,
    @inject("UserRepository") private userRepository: IUserRepository,
    @inject("TokenService") private tokenService: TokenService,
    @inject("UserService") private userService: IUserService,
    @inject("StaffService") private staffService: IStaffService,
    @inject("SuperAdminService") private superAdminService: ISuperAdminService,
    @inject("EmailQueueService") emailQueueService: EmailQueueService
  ) {
    super(emailQueueService);

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
  }

  private async downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to download image: ${response.statusCode}`)
            );
            return;
          }

          const writer = fs.createWriteStream(filepath);
          response.pipe(writer);

          writer.on("finish", () => resolve());
          writer.on("error", reject);
        })
        .on("error", reject);
    });
  }

  registerUser = async (req: AuthRequest, res: Response) => {
    try {
      const userData = req.body;

      // Validate required fields
      if (!userData.name || !userData.phone) {
        return this.sendError(res, "Name and phone are required", 400);
      }

      // Normalize email and name to lowercase
      if (userData.email) {
        userData.email = userData.email.toLowerCase();
      }
      userData.name = userData.name.toLowerCase();

      // Check for successful pre-registration payment
      const payment = await PreRegistrationPayment.findOne({
        email: userData.email,
        membershipType: userData.membershipType,
        status: "success",
      });
      if (!payment) {
        return this.sendError(
          res,
          "Please complete payment before registering.",
          400
        );
      }

      const result = await this.authService.registerUser(userData);

      // Create typed response
      const response: LoginResponseDTO = {
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            _id: result.user._id.toString(),
            name: result.user.name,
            email: result.user.email,
            phone: result.user.phone,
            role: result.user.role,
            isActive: result.user.isActive,
            isEmailVerified: result.user.isEmailVerified,
            isPhoneVerified: result.user.isPhoneVerified,
          },
          token: result.token,
          refreshToken: undefined, // Add if available
          expiresIn: 3600, // Default token expiry
        },
      };

      return this.sendSuccess(res, response.data, response.message);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  //  @httpPost('/login')
  login = async (req: AuthRequest, res: Response) => {
    try {
      const loginData: UserLoginDTO = req.body;
      const { role } = req.body;

      // Validate required fields
      if (!loginData.password || (!loginData.email && !loginData.phone)) {
        return this.sendError(
          res,
          "Email/phone and password are required",
          400
        );
      }

      // Normalize email if provided
      if (loginData.email) {
        loginData.email = loginData.email.toLowerCase();
      }

      const result = await this.authService.login(
        loginData.email,
        loginData.password,
        role
      );

      // Type guard to check if result has user property
      if ("user" in result) {
        const response: LoginResponseDTO = {
          success: true,
          message: "Login successful",
          data: {
            user: {
              _id: result.user._id.toString(),
              name: result.user.name,
              email: result.user.email,
              phone: result.user.phone,
              role: result.user.role,
              isActive: result.user.isActive,
              isEmailVerified: result.user.isEmailVerified,
              isPhoneVerified: result.user.isPhoneVerified,
            },
            token: result.token,
            refreshToken: undefined, // Add if available
            expiresIn: 3600, // Default token expiry
          },
        };
        return this.sendSuccess(res, response.data, response.message);
      } else if ("admin" in result) {
        const response: AdminLoginResponseDTO = {
          success: true,
          message: "Admin login successful",
          data: {
            admin: {
              _id: result.admin._id.toString(),
              name: result.admin.name,
              email: result.admin.email,
              role: result.admin.role,
              phone: result.admin.phone,
              isActive: result.admin.isActive,
              isEmailVerified: result.admin.isEmailVerified,
            },
            token: result.token,
            refreshToken: undefined, // Add if available
            expiresIn: 3600, // Default token expiry
          },
        };
        return this.sendSuccess(res, response.data, response.message);
      } else {
        // Handle other result types (outlet_admin, superAdmin, etc.)
        return this.sendSuccess(res, result, "Login successful");
      }
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // @httpGet('/verify-email/:token')
  verifyEmail = async (req: AuthRequest, res: Response) => {
    try {
      const verificationData: VerificationConfirmDTO = {
        email: req.body.email || req.query.email,
        verificationCode: req.params.token,
      };

      // Accept role from either body or query
      const role = req.body.role || req.query.role;
      if (!role) {
        return this.sendError(res, "Role is required for verification", 400);
      }

      // Validate required fields
      if (!verificationData.verificationCode) {
        return this.sendError(res, "Verification code is required", 400);
      }

      // Normalize email if provided
      if (verificationData.email) {
        verificationData.email = verificationData.email.toLowerCase();
      }

      const result = await this.authService.verifyEmail(
        verificationData.verificationCode,
        role
      );

      const response: BaseResponse = {
        success: true,
        message: "Email verified successfully",
        data: result,
      };

      return this.sendSuccess(res, response.data, response.message);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // @httpPost('/forgot-password')
  forgotPassword = async (req: AuthRequest, res: Response) => {
    try {
      const resetData: PasswordResetRequestDTO= req.body;

      // Validate required fields
      if (!resetData.email) {
        return this.sendError(res, "Email is required", 400);
      }

      // Normalize email
      resetData.email = resetData.email.toLowerCase();

      const result = await this.authService.forgotPassword(
        resetData.email,
        "user"
      );

      const response: BaseResponse = {
        success: true,
        message: "Password reset OTP sent",
        data: result,
      };

      return this.sendSuccess(res, response.data, response.message);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // @httpPost('/reset-password')
  resetPassword = async (req: AuthRequest, res: Response) => {
    try {
      const resetData: PasswordResetConfirmDTO = {
        token: req.params.token || req.body.token,
        newPassword: req.body.password,
      };

      // Validate required fields
      if (!resetData.token || !resetData.newPassword) {
        return this.sendError(res, "Token and new password are required", 400);
      }

      // Always extract role from the token, ignore role from request body
      const decoded = this.tokenService.verifyToken(resetData.token);
      if (!decoded || !decoded.role) {
        return this.sendError(res, "Invalid or expired token", 400);
      }

      const userRole = decoded.role;
      const result = await this.authService.resetPassword(
        resetData.token,
        resetData.newPassword,
        userRole
      );

      const response: BaseResponse = {
        success: true,
        message: "Password reset successful",
        data: result,
      };

      return this.sendSuccess(res, response.data, response.message);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // @httpPost('/logout')
  logout = async (req: AuthRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== "string") {
        return this.sendError(res, "No token provided", 401);
      }
      const token = authHeader.split(" ")[1];
      await this.authService.logout(token);
      return this.sendSuccess(res, null, "Logout successful");
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // @httpPost('/register/employee')
  public registerEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, phone, outletId, role, responsibilities } =
        req.body;
      if (
        !email ||
        !password ||
        !phone ||
        !outletId ||
        !role ||
        !responsibilities
      ) {
        return this.sendError(res, "Missing required fields", 400);
      }
      // Check if employee already exists
      const existingEmployee = await this.userService.findByEmail(email);
      if (existingEmployee) {
        return this.sendError(res, "Email already registered", 400);
      }
      // Create employee (minimal info, rest can be updated later)
      const employeeData = {
        name: email.split("@")[0], // default name from email
        email,
        password,
        phone,
        dob: new Date(), // default to today
        gender: "other",
        membershipType: "cityfeed_select",
        role: "user",
        isApproved: true,
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: false,
        coins: 0,
        reward_points: 0,
        membershipExpiryDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ),
        loginAttempts: 0,
      };
      const employee = await this.userService.createUser(employeeData as any);
      // Assign role and responsibilities for this outlet
      const assignment = await this.staffService.assignRoleToOutlet({
        outlet: outletId,
        role,
        responsibilities,
        email,
        password,
        phone,
        name: email.split("@")[0], // default name from email
      });
      this.sendSuccess(
        res,
        { employee, assignment },
        "Employee registered and assigned role successfully"
      );
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  // @httpPost('/change-password')
  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword, role } = req.body;
      if (!req.user) {
        return this.sendError(res, "User not authenticated", 401);
      }
      if (!currentPassword || !newPassword || !role) {
        return this.sendError(
          res,
          "Current password, new password, and role are required",
          400
        );
      }
      if (role === "user") {
        const user = await this.userRepository.findById(req.user._id);
        if (!user) {
          return this.sendError(res, "User not found", 404);
        }
        const updatedUser = await this.authService.changeUserPassword(
          user._id.toString(),
          currentPassword,
          newPassword
        );
        return this.sendSuccess(
          res,
          {
            user: {
              _id: updatedUser._id,
              email: updatedUser.email,
              name: updatedUser.name,
              phone: updatedUser.phone,
              role: updatedUser.role,
              isActive: updatedUser.isActive,
              isEmailVerified: updatedUser.isEmailVerified,
            },
          },
          "Password changed successfully"
        );
      } else if (role === "super_admin") {
        // const superAdminService = new SuperAdminService();
        const superAdmin = await this.superAdminService.findByEmail(
          req.user.email
        );
        if (!superAdmin) {
          return this.sendError(res, "Super admin not found", 404);
        }
        // Validate current password
        const isMatch = await bcryptjs.compare(
          currentPassword,
          superAdmin.password
        );
        if (!isMatch) {
          return this.sendError(res, "Current password is incorrect", 401);
        }
        // Update password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(newPassword, salt);
        superAdmin.password = hashedPassword;
        if (superAdmin) {
          await superAdmin.save();
        }
        return this.sendSuccess(
          res,
          {
            superAdmin: {
              _id: superAdmin._id,
              email: superAdmin.email,
              name: superAdmin.name,
              phone: superAdmin.phone,
              isEmailVerified: superAdmin.isEmailVerified,
              isApproved: superAdmin.isApproved,
            },
          },
          "Password changed successfully"
        );
      } else if (
        role === "employee" ||
        role === "outlet_admin" ||
        role === "event_organizer" ||
        role === "event_manager" ||
        role === "event_staff"
      ) {
        // Use the generic changePassword method in authService
        const updated = await this.authService.changePassword(
          req.user as any,
          currentPassword,
          newPassword
        );
        return this.sendSuccess(
          res,
          { updated },
          "Password changed successfully"
        );
      } else {
        return this.sendError(
          res,
          "Password change is only supported for user, super_admin, employee, outlet_admin, event_organizer, event_manager, and event_staff roles",
          400
        );
      }
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  resendVerification = async (req: AuthRequest, res: Response) => {
    try {
      const { email, role } = req.body;
      if (!email || !role) {
        return this.sendError(res, "Email and role are required", 400);
      }
      const token = await this.authService.resendVerification(email, role);
      return this.sendSuccess(
        res,
        { email, role, verificationToken: token },
        "Verification email sent successfully"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // @httpPost('/first-login-change-password')
  firstLoginChangePassword = async (req: AuthRequest, res: Response) => {
    try {
      const { newPassword, role } = req.body;
      if (!req.user) {
        return this.sendError(res, "User not authenticated", 401);
      }
      if (!newPassword || !role) {
        return this.sendError(res, "New password and role are required", 400);
      }
      const updated = await this.authService.firstLoginChangePassword(
        req.user as any,
        newPassword,
        role
      );
      return this.sendSuccess(
        res,
        { updated },
        "Password changed and first login flag unset"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // Helper to sanitize guest user object
  private sanitizeGuestUser(user: any) {
    return {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isGuest: user.isGuest,
      isPhoneVerified: user.isPhoneVerified,
    };
  }

  // @httpPost('/guest-login')
  guestLogin = async (req: AuthRequest, res: Response) => {
    try {
      const { phone, otp } = req.body;
      if (!phone) {
        return this.sendError(res, "Phone number is required", 400);
      }
      if (!otp) {
        // Step 1: Request OTP
        const testOtp = await this.authService.sendGuestOtp(phone);
        return this.sendSuccess(
          res,
          { otp: testOtp },
          "OTP sent to phone (test only)"
        );
      } else {
        // Step 2: Verify OTP and login
        const { user, token } = await this.authService.guestLoginWithOtp(
          phone,
          otp
        );
        return this.sendSuccess(
          res,
          { user: this.sanitizeGuestUser(user), token },
          "Guest login successful"
        );
      }
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  // @httpPost('/verify-guest-otp')
  verifyGuestOtp = async (req: AuthRequest, res: Response) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return this.sendError(res, "Phone and OTP are required", 400);
      }
      const { user, token } = await this.authService.guestLoginWithOtp(
        phone,
        otp
      );
      return this.sendSuccess(
        res,
        { user: this.sanitizeGuestUser(user), token },
        "Guest login successful"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };
}
export const loginEmployee = async (
  req: Request,
  res: Response,
  resendVerification: (email: string, role: string) => Promise<void>
) => {
  try {
    let { email } = req.body;
    const { password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    email = email.trim().toLowerCase();
    // Find the staff by email (case-insensitive, trimmed)
    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!staff.isEmailVerified) {
      const token = generateToken({
        _id: staff._id.toString(),
        email: staff.email,
        role: "employee",
        type: "employee",
      });
      await resendVerification(staff.email, "employee");
      return res.status(400).json({
        message:
          "Email not verified. A new verification email has been sent to your email address.",
      });
    }

    // Compare password
    const isMatch = await bcryptjs.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if account is deleted
    if (staff.isDeleted) {
      return res.status(403).json({ message: "Account is deleted" });
    }

    // Check if account is active
    if (!staff.isActive) {
      return res
        .status(403)
        .json({ message: "Your account is deactivated. Please contact admin" });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        _id: staff._id,
        email: staff.email,
        role: "employee",
        outlet: staff.outlet,
        responsibilities: staff.responsibilities,
        type: "employee",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      message: "Login successful",
      token,
      assignment: {
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
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};
