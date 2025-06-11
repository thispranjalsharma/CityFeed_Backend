import { BaseRepository, BaseDocument } from './base.repository';
import { Merchant, IMerchantDocument } from '../models/merchant.model';
import { IMerchant } from '../interfaces/merchant.interface';
import { Types } from 'mongoose';

export class MerchantRepository extends BaseRepository<IMerchantDocument> {
  constructor() {
    super(Merchant);
  }

  async findByEmail(email: string): Promise<IMerchantDocument | null> {
    return this.model.findOne({ email });
  }

  async findById(id: string): Promise<IMerchantDocument | null> {
    return this.model.findById(new Types.ObjectId(id));
  }

  async createMerchant(merchantData: IMerchant): Promise<IMerchantDocument> {
    return this.model.create(merchantData);
  }

  async updateMerchant(id: string, merchantData: Partial<IMerchant>): Promise<IMerchantDocument | null> {
    return this.model.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: merchantData },
      { new: true }
    );
  }

  async deleteMerchant(id: string): Promise<IMerchantDocument | null> {
    return this.model.findByIdAndDelete(new Types.ObjectId(id));
  }

  async findAllMerchants(): Promise<IMerchantDocument[]> {
    return this.model.find();
  }

  async findApprovedMerchants(): Promise<IMerchantDocument[]> {
    return this.model.find({ isApproved: true });
  }

  async findUnapprovedMerchants(): Promise<IMerchantDocument[]> {
    return this.model.find({ isApproved: false });
  }

  async findByUserId(userId: string): Promise<IMerchantDocument | null> {
    return this.findOne({ userId });
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