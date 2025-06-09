import { BaseRepository, BaseDocument } from './base.repository';
import { Merchant } from '../models/merchant.model';
import { IMerchant, IMerchantDocument } from '../interfaces/merchant.interface';
import { Types } from 'mongoose';

export class MerchantRepository extends BaseRepository<IMerchantDocument & BaseDocument> {
  constructor() {
    super(Merchant);
  }

  async findByEmail(email: string): Promise<IMerchantDocument | null> {
    const merchant = await this.model.findOne({ email });
    if (!merchant) return null;
    return merchant;
  }

  async findByPhone(phone: string): Promise<IMerchantDocument | null> {
    return this.findOne({ phone });
  }

  async findByBusinessName(businessName: string): Promise<IMerchantDocument | null> {
    return this.findOne({ businessName });
  }

  async findNearby(location: { type: string; coordinates: [number, number] }, maxDistance: number): Promise<IMerchantDocument[]> {
    return this.find({
      location: {
        $near: {
          $geometry: location,
          $maxDistance: maxDistance
        }
      }
    });
  }

  async create(data: Omit<IMerchant, '_id' | 'createdAt' | 'updatedAt'>): Promise<IMerchantDocument> {
    const merchantData = {
      ...data,
      _id: new Types.ObjectId()
    };
    return super.create(merchantData as Partial<IMerchantDocument>);
  }

  async approveMerchant(merchantId: string): Promise<IMerchantDocument | null> {
    return this.update(merchantId, { isApproved: true });
  }

  async verifyEmail(merchantId: string): Promise<IMerchantDocument | null> {
    return this.update(merchantId, { isEmailVerified: true });
  }

  async activateMerchant(merchantId: string): Promise<IMerchantDocument | null> {
    return this.update(merchantId, { isActive: true });
  }

  async deactivateMerchant(merchantId: string): Promise<IMerchantDocument | null> {
    return this.update(merchantId, { isActive: false });
  }

  async updateImages(merchantId: string, images: string[]): Promise<IMerchantDocument | null> {
    return this.update(merchantId, { images });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<IMerchantDocument | null> {
    return this.update(id, { password: hashedPassword });
  }
} 