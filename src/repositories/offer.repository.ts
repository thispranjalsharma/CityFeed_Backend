import { Offer, IOfferDocument, IOffer } from "../models/offer.model";
import { inject, injectable } from "inversify";
import { FilterQuery, Model } from "mongoose";

export interface IOfferRepository {
  findByOutlet(outletId: string): Promise<IOfferDocument[]>;
  findActiveOffers(): Promise<IOfferDocument[]>;
  findActiveOffersByOutlet(outletId: string): Promise<IOfferDocument[]>;
  findDefaultOffersByOutlet(outletId: string): Promise<IOfferDocument[]>;
  findMaxDiscountOfferByOutlet(
    outletId: string
  ): Promise<IOfferDocument | null>;
  deactivateOffer(offerId: string): Promise<IOfferDocument | null>;
  activateOffer(offerId: string): Promise<IOfferDocument | null>;
  deleteByOutletId(outletId: string): Promise<void>;
  findById(id: string): Promise<IOfferDocument | null>;
  update(id: string, data: Partial<IOffer>): Promise<IOfferDocument | null>;
  find(query: any): Promise<IOfferDocument[]>;
  findDeleted(filter: any): Promise<IOfferDocument[]>;
  softDelete(id: string): Promise<IOfferDocument | null>;
  restore(id: string): Promise<IOfferDocument | null>;
  findIncludingDeleted({ id }: { id: string }): Promise<IOfferDocument | null>;
  deleteOffer(id: string, outletId: string): Promise<IOfferDocument | null>;
  create(data: Partial<IOffer>): Promise<IOfferDocument>;
}

@injectable()
export class OfferRepository implements IOfferRepository {
  constructor(@inject("Offer") private offer: Model<IOfferDocument>) {}

  deleteOffer(id: string, outletId: string): Promise<IOfferDocument | null> {
    return this.offer.findOneAndDelete({ _id: id, outletId });
  }

  create(data: Partial<IOffer>): Promise<IOfferDocument> {
    const offerData = {
      ...data,
    };
    return this.offer.create(offerData as Partial<IOfferDocument>);
  }

  async findIncludingDeleted({ id }): Promise<IOfferDocument | null> {
    return this.offer.findById(id);
  }

  restore(id: string): Promise<IOfferDocument | null> {
    return this.offer.findByIdAndUpdate(
      id,
      { isDeleted: false },
      { new: true }
    );
  }

  async softDelete(id: string): Promise<IOfferDocument | null> {
    return this.offer.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  }

  async findDeleted(filter: any): Promise<IOfferDocument[]> {
    const query: FilterQuery<IOfferDocument> = { isDeleted: true, ...filter };
    return this.offer.find(query);
  }

  async find(query: any): Promise<IOfferDocument[]> {
    return this.offer.find(query);
  }

  async findById(id: string): Promise<IOfferDocument | null> {
    return this.offer.findById(id);
  }

  async update(
    id: string,
    data: Partial<IOffer>
  ): Promise<IOfferDocument | null> {
    return this.offer.findByIdAndUpdate(id, data);
  }

  async findByOutlet(outletId: string): Promise<IOfferDocument[]> {
    return this.offer.find({ outletId });
  }

  async findActiveOffers(): Promise<IOfferDocument[]> {
    const now = new Date();

    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    };

    const offers = await this.offer.find(query);

    return offers;
  }

  async findActiveOffersByOutlet(outletId: string): Promise<IOfferDocument[]> {
    const now = new Date();
    return this.offer.find({
      outletId,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    });
  }

  async findDefaultOffersByOutlet(outletId: string): Promise<IOfferDocument[]> {
    return this.offer.find({
      outletId,
      isDefault: true,
    });
  }

  async findMaxDiscountOfferByOutlet(outletId: string) {
    const now = new Date();
    return this.offer
      .findOne({
        outletId,
        isActive: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      })
      .sort({ discountPercentage: -1 })
      .exec();
  }

  async deactivateOffer(offerId: string): Promise<IOfferDocument | null> {
    return this.offer.findByIdAndUpdate(offerId, { isActive: false });
  }

  async activateOffer(offerId: string): Promise<IOfferDocument | null> {
    return this.offer.findByIdAndUpdate(offerId, { isActive: true });
  }

  async deleteByOutletId(outletId: string): Promise<void> {
    await Offer.deleteMany({ outletId });
  }
}
