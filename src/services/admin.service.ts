import { IAdminRepository } from "../repositories/admin.repository";
import { IUserRepository } from "../repositories/user.repository";
import { AppErrorClass } from "../utils/appError";
import jwt from "jsonwebtoken";
// import { IAdmin, IAdminDocument } from '../interfaces/admin.interface';

import bcryptjs from "bcryptjs";
import { IAdmin, IAdminDocument, IAdminResponse } from "../models/admin.model";
import { inject, injectable } from "inversify";

export interface IAdminService {
  getAllUsers();
  deleteUser(userId: string);
  login(
    email: string,
    password: string
  ): Promise<{ admin: IAdminResponse; token: string }>;
  findByEmail(email: string): Promise<IAdminDocument | null>;
  findById(id: string): Promise<IAdminDocument | null>;
  createAdmin(adminData: Partial<IAdmin>): Promise<IAdminDocument>;
  update(id: string, data: Partial<IAdmin>): Promise<IAdminDocument | null>;
  verifyEmail(id: string): Promise<IAdminDocument | null>;
  updatePassword(id: string, password: string): Promise<IAdminDocument | null>;
  changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IAdminDocument | null>;
  activateAdmin(id: string): Promise<IAdminDocument | null>;
  deactivateAdmin(id: string): Promise<IAdminDocument | null>;
}

@injectable()
export class AdminService implements IAdminService {
  constructor(
    @inject("AdminRepository") private adminRepository: IAdminRepository,
    @inject("UserRepository") private userRepository: IUserRepository
  ) {}

  async getAllUsers() {
    return this.userRepository.findAll();
  }

  async deleteUser(userId: string) {
    return this.userRepository.delete(userId);
  }

  async login(
    email: string,
    password: string
  ): Promise<{ admin: IAdminResponse; token: string }> {
    const admin = await this.adminRepository.findByEmail(email);

    if (!admin) {
      throw new AppErrorClass("Invalid credentials", 401);
    }

    // Compare password with bcrypt
    let isValidPassword = false;
    try {
      isValidPassword = await admin.comparePassword(password);
    } catch (e) {
      isValidPassword = false;
    }

    // Fallback to plain text comparison if bcrypt fails (not recommended in prod)
    if (!isValidPassword && password === admin.password) {
      isValidPassword = true;
    }

    if (!isValidPassword) {
      throw new AppErrorClass("Invalid credentials", 401);
    }

    // Determine role, force 'admin' role for cityfeed admin email
    const isCityfeedAdmin = admin.email === "admin@cityfeed.com";
    const role = isCityfeedAdmin ? "admin" : admin.role;

    // Create JWT token
    const token = jwt.sign(
      {
        _id: admin._id.toString(),
        email: admin.email,
        role: role,
        type: "admin",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Prepare admin response object: omit password and convert _id to string
    const adminResponse: IAdminResponse = {
      _id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: role,
      phone: admin.phone,
      isActive: admin.isActive,
      isEmailVerified: admin.isEmailVerified,
      createdAt: admin.createdAt || new Date(),
      updatedAt: admin.updatedAt || new Date(),
    };

    return {
      admin: adminResponse,
      token,
    };
  }

  async findByEmail(email: string): Promise<IAdminDocument | null> {
    return this.adminRepository.findByEmail(email);
  }

  async findById(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.findById(id);
  }

  async createAdmin(adminData: Partial<IAdmin>): Promise<IAdminDocument> {
    const existingAdmin = await this.adminRepository.findByEmail(
      adminData.email
    );
    if (existingAdmin) {
      throw new Error("Email already registered");
    }

    // Check if phone number is already registered
    if (adminData.phone) {
      const existingAdminByPhone = await this.adminRepository.findByPhone(
        adminData.phone
      );
      if (existingAdminByPhone) {
        throw new Error("Phone number already registered");
      }
    }

    // Omit _id if present in adminData to avoid type conflict
    const { _id, ...adminDataWithoutId } = adminData;
    return this.adminRepository.create({
      ...adminDataWithoutId,
      isActive: true,
      isEmailVerified: false,
      role: adminData.role,
      phone: adminData.phone,
    });
  }

  async update(
    id: string,
    data: Partial<IAdmin>
  ): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, data);
  }

  async verifyEmail(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, { isEmailVerified: true });
  }

  async updatePassword(
    id: string,
    password: string
  ): Promise<IAdminDocument | null> {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return this.adminRepository.update(id, { password: hashedPassword });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IAdminDocument | null> {
    const admin = await this.adminRepository.findById(id);
    if (!admin) throw new Error("Admin not found");
    let isValidPassword = false;
    try {
      isValidPassword = await admin.comparePassword(currentPassword);
    } catch (e) {
      isValidPassword = false;
    }
    if (!isValidPassword && currentPassword === admin.password) {
      isValidPassword = true;
    }
    if (!isValidPassword) throw new Error("Current password is incorrect");
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);
    return this.adminRepository.update(id, { password: hashedPassword });
  }

  async activateAdmin(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, { isActive: true });
  }

  async deactivateAdmin(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, { isActive: false });
  }
}
