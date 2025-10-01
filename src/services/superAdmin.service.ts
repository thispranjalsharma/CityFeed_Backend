import { injectable, inject } from "inversify";
import { TYPES } from "../types/types";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { ISuperAdmin, SuperAdmin } from "../models/superAdmin.model";
import { ISendGridService } from "./sendgrid.service";
import { config } from "../config/config";
import { logger } from "../utils/logger.util";
import { AppErrorClass } from "../utils/appError";

export interface ISuperAdminService {
  createSuperAdmin(data: Partial<ISuperAdmin>): Promise<ISuperAdmin>;
  findByEmail(email: string): Promise<ISuperAdmin | null>;
  login(
    email: string,
    password: string
  ): Promise<{ superAdmin: ISuperAdmin; token: string }>;
  sendVerificationEmail(superAdmin: ISuperAdmin): Promise<void>;
  verifyEmail(token: string): Promise<ISuperAdmin>;
  approveSuperAdmin(id: string): Promise<ISuperAdmin>;
  updatePassword(id: string, newPassword: string): Promise<ISuperAdmin>;
  changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ISuperAdmin>;
  getAllSuperAdmins(): Promise<ISuperAdmin[]>;
  findById(id: string): Promise<ISuperAdmin | null>;
  updateById(
    id: string,
    updates: Partial<ISuperAdmin>
  ): Promise<ISuperAdmin | null>;
  deleteById(id: string): Promise<ISuperAdmin | null>;
  // save(): Promise<void>;
}

@injectable()
export class SuperAdminService implements ISuperAdminService {
  constructor(
    @inject("SendGridService") private sendGridService: ISendGridService
  ) {}

  // async save(): Promise<void> {
  //   return
  // }

  async createSuperAdmin(data: Partial<ISuperAdmin>): Promise<ISuperAdmin> {
    // Normalize email and name to lowercase as a safeguard
    if (data.email) data.email = data.email.toLowerCase();
    if (data.name) data.name = data.name.toLowerCase();

    // Check for existing super admin with same email
    const existingEmail = await SuperAdmin.findOne({ email: data.email });
    if (existingEmail)
      throw new Error("Super admin with this email already exists");

    // Check for existing super admin with same phone number
    const existingPhone = await SuperAdmin.findOne({ phone: data.phone });
    if (existingPhone)
      throw new Error("Super admin with this phone number already exists");

    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const superAdmin = new SuperAdmin({
      ...data,
      password: hashedPassword,
    });
    await superAdmin.save();
    await this.sendVerificationEmail(superAdmin);
    return superAdmin;
  }

  public async findByEmail(email: string): Promise<ISuperAdmin | null> {
    return SuperAdmin.findOne({ email });
  }

  public async login(
    email: string,
    password: string
  ): Promise<{ superAdmin: ISuperAdmin; token: string }> {
    const superAdmin = await SuperAdmin.findOne({ email });
    if (!superAdmin) throw new AppErrorClass("Super admin not found", 404);

    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) throw new AppErrorClass("Invalid password", 401);

    if (!superAdmin.isEmailVerified) {
      await this.sendVerificationEmail(superAdmin);
      throw new AppErrorClass(
        "Email not verified. Verification email resent.",
        403
      );
    }

    if (!superAdmin.isApproved)
      throw new AppErrorClass("Account not approved", 403);

    const token = jwt.sign(
      {
        _id: superAdmin._id,
        email: superAdmin.email,
        role: "super_admin",
        type: "super_admin",
      },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    return { superAdmin, token };
  }

  public async sendVerificationEmail(superAdmin: ISuperAdmin): Promise<void> {
    const token = jwt.sign({ _id: superAdmin._id }, config.jwtSecret, {
      expiresIn: "7d",
    });
    await this.sendGridService.sendVerificationEmail(
      superAdmin.email,
      token,
      "super_admin"
    );
  }

  public async verifyEmail(token: string): Promise<ISuperAdmin> {
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new AppErrorClass("Invalid or expired token", 400);
    }
    const superAdmin = await SuperAdmin.findByIdAndUpdate(
      decoded._id,
      { isEmailVerified: true },
      { new: true }
    );
    if (!superAdmin) throw new AppErrorClass("Super admin not found", 404);

    logger.debug(
      "Super admin verified:",
      superAdmin.email,
      superAdmin.isEmailVerified
    );
    return superAdmin;
  }

  public async approveSuperAdmin(id: string): Promise<ISuperAdmin> {
    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) throw new AppErrorClass("Super admin not found", 404);
    superAdmin.isApproved = true;
    await superAdmin.save();
    return superAdmin;
  }

  public async updatePassword(
    id: string,
    newPassword: string
  ): Promise<ISuperAdmin> {
    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) throw new AppErrorClass("Super admin not found", 404);
    const hashed = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hashed;
    await superAdmin.save();
    return superAdmin;
  }

  public async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ISuperAdmin> {
    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) throw new AppErrorClass("Super admin not found", 404);

    const isMatch = await bcrypt.compare(currentPassword, superAdmin.password);
    if (!isMatch) throw new AppErrorClass("Current password incorrect", 401);

    const hashed = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hashed;
    await superAdmin.save();
    return superAdmin;
  }

  public async getAllSuperAdmins(): Promise<ISuperAdmin[]> {
    return SuperAdmin.find();
  }

  public async findById(id: string): Promise<ISuperAdmin | null> {
    return SuperAdmin.findById(id);
  }

  public async updateById(
    id: string,
    updates: Partial<ISuperAdmin>
  ): Promise<ISuperAdmin | null> {
    return SuperAdmin.findByIdAndUpdate(id, updates, { new: true });
  }

  public async deleteById(id: string): Promise<ISuperAdmin | null> {
    return SuperAdmin.findByIdAndDelete(id);
  }
}
