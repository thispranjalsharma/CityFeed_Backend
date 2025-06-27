import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../interfaces/auth.interface";
import { UserRepository } from "../repositories/user.repository";
import { TokenService } from "../services/token.service";
import fs from "fs";
import https from "https";
import cloudinary from "../config/cloudinary";
import { config } from "../config/config";
import { UserService } from "../services/user.service";
import { OutletRoleAssignmentService } from "../services/outletRoleAssignment.service";
import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PreRegistrationPayment } from '../models/preRegistrationPayment.model';
import { SuperAdminService } from '../services/superAdmin.service';

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - phone
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *         phone:
 *           type: string
 *           description: User's phone number
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         otp:
 *           type: string
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [user, merchant, admin, super_admin, outlet_admin, employee]
 *           description: The role of the account to reset password for
 *       example:
 *         email: "user@example.com"
 *         role: "employee"
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - token
 *         - password
 *         - role
 *       properties:
 *         token:
 *           type: string
 *           description: Password reset token
 *         password:
 *           type: string
 *           format: password
 *           description: New password
 *         role:
 *           type: string
 *           enum: [user, merchant, admin, super_admin, outlet_admin, employee]
 *           description: The role of the account to reset password for
 *       example:
 *         token: "PASTE_YOUR_TOKEN_HERE"
 *         password: "NewPassword123!"
 *         role: "employee"
 */

// interface MulterRequest extends Request {
//   files?:
//     | Express.Multer.File[]
//     | { [fieldname: string]: Express.Multer.File[] };
// }

export class AuthController extends BaseController {
  private authService: AuthService;
  private userRepository: UserRepository;
  private tokenService: TokenService;
  private userService: UserService;
  private outletRoleAssignmentService: OutletRoleAssignmentService;

  constructor() {
    super();
    this.authService = new AuthService();
    this.userRepository = new UserRepository();
    this.tokenService = new TokenService();
    this.userService = new UserService();
    this.outletRoleAssignmentService = new OutletRoleAssignmentService();

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

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Invalid input data
   *       409:
   *         description: User already exists
   */
  registerUser = async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, name, dob, gender, phone, membershipType } = req.body;
      // Check for successful pre-registration payment
      const payment = await PreRegistrationPayment.findOne({
        email,
        membershipType,
        status: 'success',
      });
      if (!payment) {
        return this.sendError(res, 'Please complete payment before registering.', 400);
      }
      const result = await this.authService.registerUser({
        email,
        password,
        name,
        dob,
        gender,
        phone,
        membershipType,
      });
      // Optionally, delete the payment record after registration
      await PreRegistrationPayment.deleteOne({ _id: payment._id });
      return this.sendSuccess(res, result, 'User registered successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  login = async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, role } = req.body;
      const result = await this.authService.login(email, password, role);
      // If outlet_admin, ensure outletId is included in the response data
      if (role === 'outlet_admin') {
        return this.sendSuccess(res, {
          ...result,
          outletId: result.outletId ?? null
        }, "Login successful");
      }
      return this.sendSuccess(res, result, "Login successful");
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  verifyEmail = async (req: AuthRequest, res: Response) => {
    try {
      const { token } = req.params;
      // Accept role from either body or query
      const role = req.body.role || req.query.role;
      if (!role) {
        return this.sendError(res, 'Role is required for verification', 400);
      }
      const result = await this.authService.verifyEmail(token, role);
      return this.sendSuccess(res, result, "Email verified successfully");
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/auth/forgot-password:
   *   post:
   *     summary: Request password reset (all roles)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ForgotPasswordRequest'
   *     responses:
   *       200:
   *         description: Password reset OTP sent
   *       404:
   *         description: User not found
   */
  forgotPassword = async (req: AuthRequest, res: Response) => {
    try {
      const { email, role } = req.body;
      const result = await this.authService.forgotPassword(email, role);
      return this.sendSuccess(res, result, "Password reset OTP sent");
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Reset password (all roles)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ResetPasswordRequest'
   *     responses:
   *       200:
   *         description: Password reset successful
   *       400:
   *         description: Invalid OTP or password
   */
  resetPassword = async (req: AuthRequest, res: Response) => {
    try {
      const { token } = req.params;
      const { password, role } = req.body;
      const result = await this.authService.resetPassword(
        token,
        password,
        role
      );
      return this.sendSuccess(res, result, "Password reset successful");
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

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

  /**
   * Admin creates an employee for an outlet, assigns role and responsibilities
   * Body: { email, password, phone, outletId, role, responsibilities }
   */
  public registerEmployee = async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, phone, outletId, role, responsibilities } = req.body;
      if (!email || !password || !phone || !outletId || !role || !responsibilities) {
        return this.sendError(res, 'Missing required fields', 400);
      }
      // Check if employee already exists
      const existingEmployee = await this.userService.findByEmail(email);
      if (existingEmployee) {
        return this.sendError(res, 'Email already registered', 400);
      }
      // Create employee (minimal info, rest can be updated later)
      const employeeData = {
        name: email.split('@')[0], // default name from email
        email,
        password,
        phone,
        dob: new Date(), // default to today
        gender: 'other',
        membershipType: 'cityfeed_select',
        role: 'user',
        isApproved: true,
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: false,
        coins: 0,
        reward_points: 0,
        membershipExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        loginAttempts: 0
      };
      const employee = await this.userService.createUser(employeeData as any);
      // Assign role and responsibilities for this outlet
      const assignment = await this.outletRoleAssignmentService.assignRoleToOutlet({
        outlet: outletId,
        role,
        responsibilities
      });
      this.sendSuccess(res, { employee, assignment }, 'Employee registered and assigned role successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * Change password for user or superadmin
   * Body: { currentPassword, newPassword, role }
   */
  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword, role } = req.body;
      if (!req.user) {
        return this.sendError(res, 'User not authenticated', 401);
      }
      if (!currentPassword || !newPassword || !role) {
        return this.sendError(res, 'Current password, new password, and role are required', 400);
      }
      if (role === 'user') {
        const user = await this.userRepository.findById(req.user._id);
        if (!user) {
          return this.sendError(res, 'User not found', 404);
        }
        const updatedUser = await this.authService.changeUserPassword(
          user._id.toString(),
          currentPassword,
          newPassword
        );
        return this.sendSuccess(res, { user: {
          _id: updatedUser._id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          isEmailVerified: updatedUser.isEmailVerified,
        } }, 'Password changed successfully');
      } else if (role === 'super_admin') {
        const superAdminService = new SuperAdminService();
        const superAdmin = await superAdminService.findByEmail(req.user.email);
        if (!superAdmin) {
          return this.sendError(res, 'Super admin not found', 404);
        }
        // Validate current password
        const isMatch = await bcryptjs.compare(currentPassword, superAdmin.password);
        if (!isMatch) {
          return this.sendError(res, 'Current password is incorrect', 401);
        }
        // Update password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(newPassword, salt);
        superAdmin.password = hashedPassword;
        await superAdmin.save();
        return this.sendSuccess(res, { superAdmin: {
          _id: superAdmin._id,
          email: superAdmin.email,
          name: superAdmin.name,
          phone: superAdmin.phone,
          isEmailVerified: superAdmin.isEmailVerified,
          isApproved: superAdmin.isApproved,
        } }, 'Password changed successfully');
      } else {
        return this.sendError(res, 'Password change is only supported for user and super_admin roles', 400);
      }
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };
}
export const loginEmployee = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    // Find the assignment by email
    const assignment = await OutletRoleAssignment.findOne({ email });
    if (!assignment) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Compare password
    const isMatch = await bcryptjs.compare(password, assignment.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Generate JWT
    const token = jwt.sign(
      {
        _id: assignment._id,
        email: assignment.email,
        role: 'employee',
        outlet: assignment.outlet,
        responsibilities: assignment.responsibilities,
        type: 'employee'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    return res.status(200).json({
      message: 'Login successful',
      token,
      assignment: {
        _id: assignment._id,
        email: assignment.email,
        role: assignment.role,
        outlet: assignment.outlet,
        responsibilities: assignment.responsibilities,
        name: assignment.name,
        phone: assignment.phone
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

