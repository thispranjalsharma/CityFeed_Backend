import { MerchantRepository } from '../repositories/merchant.repository';
import { IMerchant, IMerchantDocument } from '../interfaces/merchant.interface';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export class MerchantService {
  private merchantRepository: MerchantRepository;

  constructor() {
    this.merchantRepository = new MerchantRepository();
  }

  async createMerchant(merchantData: Partial<IMerchant>): Promise<IMerchantDocument> {
    if (!merchantData.name || !merchantData.email || !merchantData.password || !merchantData.phone || !merchantData.businessName || !merchantData.businessType || !merchantData.address) {
      throw new Error('Missing required fields');
    }

    const existingMerchant = await this.merchantRepository.findByEmail(merchantData.email);
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
      address: merchantData.address,
      location: merchantData.location,
      images: merchantData.images || [],
      isActive: true,
      isApproved: false,
      isEmailVerified: false,
      role: 'merchant' as const
    } as Omit<IMerchant, '_id' | 'createdAt' | 'updatedAt'>;

    return this.merchantRepository.create(newMerchant);
  }

  async findByEmail(email: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.findByEmail(email);
  }

  async findById(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.findById(id);
  }

  async update(id: string, data: Partial<IMerchant>): Promise<IMerchantDocument | null> {
    return this.merchantRepository.update(id, data);
  }

  async verifyEmail(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.verifyEmail(id);
  }

  async updatePassword(id: string, password: string): Promise<IMerchantDocument | null> {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return this.merchantRepository.updatePassword(id, hashedPassword);
  }

  async approveMerchant(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.update(id, { isApproved: true });
  }

  async activateMerchant(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.update(id, { isActive: true });
  }

  async deactivateMerchant(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.update(id, { isActive: false });
  }

  async registerMerchant(merchantData: Omit<IMerchant, '_id' | 'createdAt' | 'updatedAt'>): Promise<IMerchantDocument> {
    const existingMerchant = await this.merchantRepository.findByEmail(merchantData.email);
    if (existingMerchant) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcryptjs.hash(merchantData.password, 10);
    const newMerchant = {
      ...merchantData,
      password: hashedPassword
    } as Omit<IMerchant, '_id' | 'createdAt' | 'updatedAt'>;

    return this.merchantRepository.create(newMerchant);
  }

  async getMerchantById(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.findById(id);
  }

  async updateMerchant(id: string, data: Partial<IMerchant>): Promise<IMerchantDocument | null> {
    return this.merchantRepository.update(id, data);
  }

  async deleteMerchant(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.delete(id);
  }

  async changePassword(merchantId: string, currentPassword: string, newPassword: string): Promise<void> {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const isValidPassword = await bcryptjs.compare(currentPassword, merchant.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    await this.merchantRepository.updatePassword(merchantId, hashedPassword);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const merchant = await this.merchantRepository.findByEmail(email);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const token = jwt.sign(
      { merchantId: merchant._id },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset token
    console.log('Password reset token:', token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { merchantId: string };
      const hashedPassword = await bcryptjs.hash(newPassword, 10);
      await this.merchantRepository.updatePassword(decoded.merchantId, hashedPassword);
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }
} 