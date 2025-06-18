import { AdminRepository } from '../repositories/admin.repository';
import { UserRepository } from '../repositories/user.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AppErrorClass } from '../middleware/error.middleware';
import jwt from 'jsonwebtoken';
import { IAdmin, IAdminDocument } from '../interfaces/admin.interface';
import bcryptjs from 'bcryptjs';

export class AdminService {
  private adminRepository: AdminRepository;
  private userRepository: UserRepository;
  private merchantRepository: MerchantRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
    this.userRepository = new UserRepository();
    this.merchantRepository = new MerchantRepository();
  }

  async getAllUsers() {
    return this.userRepository.find({});
  }

  async getAllMerchants() {
    return this.merchantRepository.find({});
  }

  async approveMerchant(merchantId: string) {
    return this.merchantRepository.approveMerchant(merchantId);
  }

  async deleteUser(userId: string) {
    return this.userRepository.delete(userId);
  }

  async deleteMerchant(merchantId: string) {
    return this.merchantRepository.delete(merchantId);
  }

  async login(email: string, password: string) {
    const admin = await this.adminRepository.findByEmail(email);
    
    if (!admin) {
      throw new AppErrorClass('Invalid credentials', 401);
    }

    const isValidPassword = await admin.comparePassword(password);

    if (!isValidPassword) {
      throw new AppErrorClass('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { 
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return {
      admin: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      token
    };
  }

  async findByEmail(email: string): Promise<IAdminDocument | null> {
    return this.adminRepository.findByEmail(email);
  }

  async findById(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.findById(id);
  }

  async createAdmin(adminData: Omit<IAdmin, '_id' | 'createdAt' | 'updatedAt'>): Promise<IAdminDocument> {
    const existingAdmin = await this.adminRepository.findByEmail(adminData.email);
    if (existingAdmin) {
      throw new Error('Email already registered');
    }

    return this.adminRepository.create({
      ...adminData,
      isActive: true,
      isEmailVerified: false,
      role: 'admin'
    });
  }

  async update(id: string, data: Partial<IAdmin>): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, data);
  }

  async verifyEmail(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, { isEmailVerified: true });
  }

  async updatePassword(id: string, password: string): Promise<IAdminDocument | null> {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return this.adminRepository.update(id, { password: hashedPassword });
  }

  async activateAdmin(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, { isActive: true });
  }

  async deactivateAdmin(id: string): Promise<IAdminDocument | null> {
    return this.adminRepository.update(id, { isActive: false });
  }
} 