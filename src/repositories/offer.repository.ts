import { BaseRepository } from './base.repository';
import { Offer, IOfferDocument } from '../models/offer.model';

export class OfferRepository extends BaseRepository<IOfferDocument> {
  constructor() {
    super(Offer);
  }

  async findByOutlet(outletId: string): Promise<IOfferDocument[]> {
    return this.find({ outletId });
  }

  async findActiveOffers(): Promise<IOfferDocument[]> {
    const now = new Date();
    
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    };
    
    const offers = await this.find(query);
    
    return offers;
  }

  async findActiveOffersByOutlet(outletId: string): Promise<IOfferDocument[]> {
    const now = new Date();
    return this.find({
      outletId,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    });
  }

  async findDefaultOffersByOutlet(outletId: string): Promise<IOfferDocument[]> {
    return this.find({
      outletId,
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