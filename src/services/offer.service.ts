import { IOffer } from '../interfaces/offer.interface';
import { OfferRepository } from '../repositories/offer.repository';
import { AppErrorClass } from '../utils/appError';
import { IOfferDocument } from '../models/offer.model';
import { logger } from '../utils/logger.util';
import { Outlet } from '../models/outlet.model';

export class OfferService {
  private offerRepository: OfferRepository;

  constructor() {
    this.offerRepository = new OfferRepository();
  }

  private convertToIOffer(doc: IOfferDocument): IOffer {
    const obj = doc.toObject();
    return {
      ...obj,
      _id: obj._id ? obj._id.toString() : undefined,
      outletId: obj.outletId ? obj.outletId.toString() : undefined
    };
  }

  async getDefaultOffersByOutlet(outletId: string): Promise<IOffer[]> {
    const offers = await this.offerRepository.find({ outletId, isDefault: true });
    return offers.map(this.convertToIOffer);
  }

  async createOffer(data: Omit<IOffer, '_id' | 'createdAt' | 'updatedAt' | 'outletId'>, outletId: string): Promise<IOffer> {
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

  async getActiveOffersByOutlet(outletId: string): Promise<IOffer[]> {
    const now = new Date();
    const offers = await this.offerRepository.find({
      outletId,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    });
    return offers.map(this.convertToIOffer);
  }

  async updateOffer(id: string, data: Partial<IOffer>, outletId: string): Promise<IOffer> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }
    const offerOutletIdStr = offer.outletId.toString();
    const providedOutletIdStr = outletId.toString();
    logger.debug('[DEBUG] updateOffer: offer.outletId =', offerOutletIdStr, typeof offerOutletIdStr, 'provided outletId =', providedOutletIdStr, typeof providedOutletIdStr);
    if (offerOutletIdStr !== providedOutletIdStr) {
      logger.debug('[DEBUG] updateOffer: Not authorized - outletId mismatch');
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
    const offerOutletIdStr = offer.outletId.toString();
    const providedOutletIdStr = outletId.toString();
    logger.debug('[DEBUG] deleteOffer: offer.outletId =', offerOutletIdStr, 'provided outletId =', providedOutletIdStr);
    if (offerOutletIdStr !== providedOutletIdStr) {
      throw new AppErrorClass('Not authorized to delete this offer', 403);
    }
    // Use soft delete instead of hard delete
    await this.offerRepository.softDelete(id);
  }

  // Soft delete method (alias for deleteOffer)
  async softDeleteOffer(id: string, outletId: string): Promise<void> {
    return this.deleteOffer(id, outletId);
  }

  // Hard delete method (use with caution)
  async hardDeleteOffer(id: string, outletId: string): Promise<void> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }
    const offerOutletIdStr = offer.outletId.toString();
    const providedOutletIdStr = outletId.toString();
    if (offerOutletIdStr !== providedOutletIdStr) {
      throw new AppErrorClass('Not authorized to delete this offer', 403);
    }
    await this.offerRepository.hardDelete(id);
  }

  // Restore deleted offer
  async restoreOffer(id: string, outletId: string): Promise<IOffer> {
    const offer = await this.offerRepository.findIncludingDeleted({ _id: id });
    if (!offer || offer.length === 0) {
      throw new AppErrorClass('Offer not found', 404);
    }
    const offerOutletIdStr = offer[0].outletId.toString();
    const providedOutletIdStr = outletId.toString();
    if (offerOutletIdStr !== providedOutletIdStr) {
      throw new AppErrorClass('Not authorized to restore this offer', 403);
    }
    const restoredOffer = await this.offerRepository.restore(id);
    if (!restoredOffer) {
      throw new AppErrorClass('Failed to restore offer', 500);
    }
    return this.convertToIOffer(restoredOffer);
  }

  // Get deleted offers (for admin purposes)
  async getDeletedOffers(outletId?: string): Promise<IOffer[]> {
    const filter = outletId ? { outletId } : {};
    const offers = await this.offerRepository.findDeleted(filter);
    return offers.map(this.convertToIOffer);
  }

  async getAllOffers(filters: { outletId?: string; status?: string; date?: string }): Promise<IOffer[]> {
    const query: any = {};
    const now = new Date();
    if (filters.outletId) {
      query.outletId = filters.outletId;
    }
    if (typeof filters.status === 'string') {
      query.isActive = filters.status === 'active';
    } else {
      // Default to only active offers when no status filter provided
      query.isActive = true;
    }
    if (filters.date) {
      const date = new Date(filters.date);
      query.validFrom = { $lte: date };
      query.validTo = { $gte: date };
    } else {
      // Default to offers valid for "now" when no explicit date filter provided
      query.validFrom = { $lte: now };
      query.validTo = { $gte: now };
    }
    const offers = await this.offerRepository.find(query);
    const offersWithOutletId = offers.filter(o => o.outletId).map(this.convertToIOffer);
    
    // Group offers by outlet and return only the one with maximum discount
    const outletOffersMap = new Map<string, IOffer>();
    
    offersWithOutletId.forEach(offer => {
      if (offer.outletId) {
        const existingOffer = outletOffersMap.get(offer.outletId);
        if (!existingOffer || (offer.discountPercentage || 0) > (existingOffer.discountPercentage || 0)) {
          outletOffersMap.set(offer.outletId, offer);
        }
      }
    });
    
    return Array.from(outletOffersMap.values());
  }

  async getOffersValidToday(): Promise<IOffer[]> {
    const today = new Date();
    const query = {
      validFrom: { $lte: today },
      validTo: { $gte: today },
      isActive: true
    };
    const offers = await this.offerRepository.find(query);
    return offers.filter(o => o.outletId).map(this.convertToIOffer);
  }

  async deleteOffersByOutletId(outletId: string): Promise<void> {
    // Soft delete all offers for this outlet
    const offers = await this.offerRepository.find({ outletId });
    const updatePromises = offers.map(offer => 
      this.offerRepository.softDelete(offer._id.toString())
    );
    await Promise.all(updatePromises);
  }

  async searchOffers(params: { title?: string; businessName?: string }): Promise<IOffer[]> {
    const { title, businessName } = params;
    const query: any = {};
    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }
    let offers: IOfferDocument[] = [];
    if (businessName) {
      // Find outlets matching businessName
      const outlets = await Outlet.find({ businessName: { $regex: businessName, $options: 'i' } });
      const outletIds = outlets.map((o: any) => o._id);
      if (outletIds.length === 0 && !title) return [];
      if (outletIds.length > 0) {
        query.outletId = { $in: outletIds };
      }
    }
    offers = await this.offerRepository.find(query);
    return offers.map(this.convertToIOffer);
  }

  async getMaxDiscountOfferByOutlet(outletId: string): Promise<IOffer | null> {
    const offer = await this.offerRepository.findMaxDiscountOfferByOutlet(outletId);
    return offer ? this.convertToIOffer(offer) : null;
  }
} 