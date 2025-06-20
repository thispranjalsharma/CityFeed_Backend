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
      outletId: (obj.outletId as Types.ObjectId).toString()
    };
  }

  async getDefaultOffersByOutlet(outletId: string): Promise<IOffer[]> {
    const offers = await this.offerRepository.find({ outletId, isDefault: true });
    return offers.map(this.convertToIOffer);
  }

  async createOffer(data: Omit<IOffer, '_id' | 'createdAt' | 'updatedAt'>, outletId: string): Promise<IOffer> {
    // Optionally verify outlet exists
    // const outlet = await Outlet.findById(outletId);
    // if (!outlet) throw new AppErrorClass('Outlet not found', 404);
    const offerData = {
      ...data,
      outletId,
      isActive: true,
      isDefault: data.isDefault || false
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

  async getOffersByOutlet(outletId: string): Promise<IOffer[]> {
    const offers = await this.offerRepository.find({ outletId });
    return offers.map(this.convertToIOffer);
  }

  async updateOffer(id: string, data: Partial<IOffer>, outletId: string): Promise<IOffer> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }
    const offerOutletIdStr = offer.outletId.toString();
    const providedOutletIdStr = outletId.toString();
    console.log('[DEBUG] updateOffer: offer.outletId =', offerOutletIdStr, typeof offerOutletIdStr, 'provided outletId =', providedOutletIdStr, typeof providedOutletIdStr);
    if (offerOutletIdStr !== providedOutletIdStr) {
      console.log('[DEBUG] updateOffer: Not authorized - outletId mismatch');
      throw new AppErrorClass('Not authorized to update this offer', 403);
    }
    const updatedOffer = await this.offerRepository.update(id, data);
    if (!updatedOffer) {
      throw new AppErrorClass('Failed to update offer', 500);
    }
    return this.convertToIOffer(updatedOffer);
  }

  async deleteOffer(id: string, outletId: string): Promise<void> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }
    if (offer.outletId.toString() !== outletId) {
      throw new AppErrorClass('Not authorized to delete this offer', 403);
    }
    await this.offerRepository.delete(id);
  }
} 