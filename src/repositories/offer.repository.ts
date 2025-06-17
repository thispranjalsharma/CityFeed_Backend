import { BaseRepository } from './base.repository';
import { Offer, IOfferDocument } from '../models/offer.model';

export class OfferRepository extends BaseRepository<IOfferDocument> {
  constructor() {
    super(Offer);
  }

  async findByMerchant(merchantId: string): Promise<IOfferDocument[]> {
    return this.find({ merchantId });
  }

  async findActiveOffers(): Promise<IOfferDocument[]> {
    const now = new Date();
    console.log('Current date:', now);
    
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    };
    console.log('Query:', JSON.stringify(query, null, 2));
    
    const offers = await this.find(query);
    console.log('Found offers:', offers.length);
    
    return offers;
  }

  async findActiveOffersByMerchant(merchantId: string): Promise<IOfferDocument[]> {
    const now = new Date();
    return this.find({
      merchantId,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    });
  }

  async findDefaultOffersByMerchant(merchantId: string): Promise<IOfferDocument[]> {
    return this.find({
      merchantId,
      isDefault: true
    });
  }

  async deactivateOffer(offerId: string): Promise<IOfferDocument | null> {
    return this.update(offerId, { isActive: false });
  }

  async activateOffer(offerId: string): Promise<IOfferDocument | null> {
    return this.update(offerId, { isActive: true });
  }
} 