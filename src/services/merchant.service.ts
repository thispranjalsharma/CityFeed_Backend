import { MerchantRepository } from '../repositories/merchant.repository';
import { IMerchant, IMerchantDocument } from '../interfaces/merchant.interface';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppErrorClass } from '../utils/appError';
import { OfferService } from './offer.service';

export class MerchantService {
  private merchantRepository: MerchantRepository;
  private offerService: OfferService;

  constructor() {
    this.merchantRepository = new MerchantRepository();
    this.offerService = new OfferService();
  }

  async createMerchant(merchantData: IMerchant): Promise<IMerchantDocument> {
    // Check for required fields with specific error messages
    const requiredFields = {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      phone: 'Phone',
      businessName: 'Business name',
      businessType: 'Business type',
      businessDescription: 'Business description',
      category: 'Category',
      address: 'Address',
      defaultMaxDiscount: 'Default max discount'
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !merchantData[key as keyof IMerchant])
      .map(([_, label]) => label);

    if (missingFields.length > 0) {
      throw new AppErrorClass(`Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const existingMerchant = await this.merchantRepository.findByEmail(merchantData.email);
    if (existingMerchant) {
      throw new AppErrorClass('Email already exists', 409);
    }

    let location = merchantData.location;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (error) {
        throw new AppErrorClass('Invalid location format. Must be a valid GeoJSON Point', 400);
      }
    }

    if (!location || !location.type || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      throw new AppErrorClass('Invalid location format. Must be a valid GeoJSON Point with coordinates [longitude, latitude]', 400);
    }

    // Ensure images is an array
    const images = Array.isArray(merchantData.images) ? merchantData.images : [];

    // Hash the password
    const hashedPassword = await bcryptjs.hash(merchantData.password, 10);

    const newMerchant = {
      name: merchantData.name,
      email: merchantData.email,
      password: hashedPassword,
      phone: merchantData.phone,
      businessName: merchantData.businessName,
      businessType: merchantData.businessType,
      businessDescription: merchantData.businessDescription,
      category: merchantData.category,
      address: merchantData.address,
      location: location,
      images: images,
      isActive: true,
      isApproved: false,
      isEmailVerified: false,
      role: 'merchant' as const,
      defaultMaxDiscount: merchantData.defaultMaxDiscount
    };


    return this.merchantRepository.create(newMerchant as Omit<IMerchant, '_id' | 'createdAt' | 'updatedAt'>);
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

  async approveMerchant(merchantId: string): Promise<IMerchantDocument> {
  

    const merchant = await this.merchantRepository.findById(merchantId);
   

    if (!merchant) {
      throw new AppErrorClass('Merchant not found', 404);
    }

    if (merchant.isApproved) {
      throw new AppErrorClass('Merchant is already approved', 400);
    }

    const updatedMerchant = await this.merchantRepository.update(merchantId, { isApproved: true });
    if (!updatedMerchant) {
      throw new AppErrorClass('Failed to update merchant approval status', 500);
    }

    try {
      await this.createDefaultOffers(updatedMerchant);
    } catch (error) {
      console.error('Error creating default offers:', error);
      // Log the error but don't throw it to prevent blocking the approval process
    }

    return updatedMerchant;
  }

  private async createDefaultOffers(merchant: IMerchantDocument): Promise<void> {
    // Check if outlet exists for this merchant, or create/get outletId as needed
    // For now, assume merchant._id is used as outletId for default offers
    const outletId = merchant._id.toString();
    // Check if outlet already has default offers
    const existingDefaultOffers = await this.offerService.getDefaultOffersByOutlet(outletId);
    if (existingDefaultOffers && existingDefaultOffers.length > 0) {
      return;
    }

    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    // Create offers for different tiers
    const tiers = [
      { name: 'cityfeed_prime', discountMultiplier: 1.0 },    // Full discount
      { name: 'cityfeed_edge', discountMultiplier: 0.8 },     // 80% of max discount
      { name: 'cityfeed_select', discountMultiplier: 0.6 }    // 60% of max discount
    ];

    for (const tier of tiers) {
      const discountPercentage = Math.round(merchant.defaultMaxDiscount * tier.discountMultiplier);
      try {
        await this.offerService.createOffer({
          title: `${tier.name.toUpperCase()} Exclusive Offer`,
          description: `Special ${discountPercentage}% discount for ${tier.name} members`,
          discountPercentage,
          validFrom: now,
          validTo: oneYearFromNow,
          isActive: true,
          isDefault: true, // Mark as default offer
          outletId
        }, outletId);
      } catch (error) {
        console.error(`Error creating ${tier.name} offer:`, error);
        throw error;
      }
    }
  }

  async activateMerchant(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.update(id, { isActive: true });
  }

  async deactivateMerchant(id: string): Promise<IMerchantDocument | null> {
    return this.merchantRepository.update(id, { isActive: false });
  }

  async registerMerchant(merchantData: Omit<IMerchant, '_id' | 'createdAt' | 'updatedAt'>): Promise<IMerchantDocument> {
    if (!merchantData.name || !merchantData.email || !merchantData.password || !merchantData.phone || !merchantData.businessName || !merchantData.businessType || !merchantData.businessDescription || !merchantData.category || !merchantData.address) {
      throw new Error('Missing required fields');
    }

    const existingMerchant = await this.merchantRepository.findByEmail(merchantData.email);
    if (existingMerchant) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcryptjs.hash(merchantData.password, 10);
    const newMerchant = {
      ...merchantData,
      password: hashedPassword,
      isActive: true,
      isApproved: false,
      isEmailVerified: false,
      role: 'merchant' as const
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

  async findAllMerchants() {
    return this.merchantRepository.findAllMerchants();
  }

  async findApprovedMerchants() {
    return this.merchantRepository.findApprovedMerchants();
  }

  async findUnapprovedMerchants() {
    return this.merchantRepository.findUnapprovedMerchants();
  }

  async generateToken(merchant: any) {
    return jwt.sign(
      { 
        _id: merchant._id,
        email: merchant.email,
        role: merchant.role,
        type: 'merchant'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
  }
} 