import { IOffer, IOfferResponse } from '../interfaces/offer.interface';
import { OfferRepository } from '../repositories/offer.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AppErrorClass } from '../middleware/error.middleware';
import { IOfferDocument } from '../models/offer.model';
import { Types } from 'mongoose';

export class OfferService {
  private offerRepository: OfferRepository;
  private merchantRepository: MerchantRepository;

  constructor() {
    this.offerRepository = new OfferRepository();
    this.merchantRepository = new MerchantRepository();
  }

  private convertToIOffer(doc: IOfferDocument): IOffer {
    const obj = doc.toObject();
    return {
      ...obj,
      _id: (obj._id as Types.ObjectId).toString(),
      merchantId: (obj.merchantId as Types.ObjectId).toString()
    };
  }

  async createOffer(data: Omit<IOffer, '_id' | 'createdAt' | 'updatedAt'>, merchantId: string): Promise<IOffer> {
    // Verify merchant exists
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new AppErrorClass('Merchant not found', 404);
    }

    // Create offer with proper type handling
    const offerData = {
      ...data,
      merchantId,
      isActive: true
    };

    const offer = await this.offerRepository.create(offerData as any);
    return this.convertToIOffer(offer);
  }

  async getActiveOffers(): Promise<IOffer[]> {
    const offers = await this.offerRepository.findActiveOffers();
    return offers.map(this.convertToIOffer);
  }

  async getOfferById(id: string): Promise<IOffer | null> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) return null;
    return this.convertToIOffer(offer);
  }

  async getOffersByMerchant(merchantId: string): Promise<IOffer[]> {
    const offers = await this.offerRepository.findByMerchant(merchantId);
    return offers.map(this.convertToIOffer);
  }

  async updateOffer(id: string, data: Partial<IOffer>, merchantId: string): Promise<IOffer> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }

    if (offer.merchantId.toString() !== merchantId) {
      throw new AppErrorClass('Not authorized to update this offer', 403);
    }

    const updatedOffer = await this.offerRepository.update(id, data);
    if (!updatedOffer) {
      throw new AppErrorClass('Failed to update offer', 500);
    }

    return this.convertToIOffer(updatedOffer);
  }

  async deleteOffer(id: string, merchantId: string): Promise<void> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }

    if (offer.merchantId.toString() !== merchantId) {
      throw new AppErrorClass('Not authorized to delete this offer', 403);
    }

    await this.offerRepository.delete(id);
  }

  async getOfferWithMerchantDetails(id: string): Promise<IOfferResponse | null> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) return null;

    const merchant = await this.merchantRepository.findById(offer.merchantId.toString());
    if (!merchant) {
      throw new AppErrorClass('Merchant not found', 404);
    }

    return {
      ...this.convertToIOffer(offer),
      merchant: {
        _id: merchant._id.toString(),
        businessName: merchant.businessName,
        businessType: merchant.businessType
      }
    };
  }
} 