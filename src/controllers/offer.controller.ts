import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IOfferService, OfferService } from "../services/offer.service";
import { BaseController } from "./base.controller";
import { AuthRequest } from "../interfaces/auth.interface";
import { Outlet } from "../models/outlet.model";
import { Offer } from "../models/offer.model";
import fs from "fs";
import https from "https";
import { EmailQueueService } from "../services/emailQueue.service";

@injectable()
export class OfferController extends BaseController {
  constructor(
    @inject("OfferService") private readonly offerService: IOfferService,
    @inject("EmailQueueService") emailQueueService: EmailQueueService
  ) {
    super(emailQueueService);
  }

  // Optional image download utility
  private async downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to download image: ${response.statusCode}`)
            );
            return;
          }
          const writer = fs.createWriteStream(filepath);
          response.pipe(writer);
          writer.on("finish", () => resolve());
          writer.on("error", reject);
        })
        .on("error", reject);
    });
  }

  createOffer = async (req: AuthRequest, res: Response) => {
    try {
      const outletId = req.body.outletId;
      if (!outletId) return this.sendError(res, "Outlet ID is required", 400);

      const { title, description, discountPercentage, validFrom, validTo } =
        req.body;
      const roleAssignment = (req as any).roleAssignment;
      const createdByRole = roleAssignment?.role;
      const createdByUser = req.user?._id;

      const offer = await this.offerService.createOffer(
        {
          title,
          description,
          discountPercentage,
          validFrom: new Date(validFrom),
          validTo: new Date(validTo),
          isActive: true,
          isDefault: false,
          createdByRole,
          createdByUser,
          // Remove toObject here — plain data only
        },
        outletId
      );

      this.sendSuccess(res, offer, "Offer created successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  updateOffer = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const outletId = req.body.outletId;
      if (!outletId) return this.sendError(res, "Outlet ID is required", 400);
      const updatedOffer = await this.offerService.updateOffer(
        id,
        updateData,
        outletId
      );
      this.sendSuccess(res, updatedOffer);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  deleteOffer = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const outletId = req.body.outletId;
      if (!outletId) return this.sendError(res, "Outlet ID is required", 400);
      await this.offerService.deleteOffer(id, outletId);
      this.sendSuccess(res, { message: "Offer deleted successfully" });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  restoreOffer = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const outletId = req.body.outletId;
      if (!outletId) return this.sendError(res, "Outlet ID is required", 400);
      const restoredOffer = await this.offerService.restoreOffer(id, outletId);
      this.sendSuccess(res, restoredOffer, "Offer restored successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getDeletedOffers = async (req: AuthRequest, res: Response) => {
    try {
      const { outletId } = req.query;
      const deletedOffers = await this.offerService.getDeletedOffers(
        outletId as string
      );
      this.sendSuccess(
        res,
        deletedOffers,
        `Retrieved ${deletedOffers.length} deleted offers`
      );
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getOfferById = async (req: Request, res: Response) => {
    try {
      const offer = await this.offerService.getOfferById(req.params.id);
      if (!offer) return this.sendError(res, "Offer not found", 404);
      let remainingDays = 0;
      if (offer.validTo) {
        const now = new Date();
        const validTo = new Date(offer.validTo);
        if (validTo > now) {
          const diffMs = validTo.getTime() - now.getTime();
          remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
      }
      this.sendSuccess(res, { ...offer, remainingDays });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getOffersByOutlet = async (req: Request, res: Response) => {
    try {
      const outletId = req.params.outletId;
      const outlet = await Outlet.findById(outletId).select(
        "_id businessName address businessType category"
      );
      if (!outlet) return this.sendError(res, "Outlet not found", 404);
      const offers = await this.offerService.getOffersByOutlet(outletId);
      const offersWithRemaining = offers.map((offer) => {
        let remainingDays = 0;
        if (offer.validTo) {
          const now = new Date();
          const validTo = new Date(offer.validTo);
          if (validTo > now) {
            const diffMs = validTo.getTime() - now.getTime();
            remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        }
        return { ...offer, remainingDays };
      });
      this.sendSuccess(res, {
        outlet: {
          _id: outlet._id,
          name: outlet.businessName,
          address: outlet.address,
          businessType: outlet.businessType,
          category: outlet.category,
        },
        offers: offersWithRemaining,
        totalOffers: offersWithRemaining.length,
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getAllOffers = async (req: Request, res: Response) => {
    try {
      const { outletId, status, date } = req.query;
      const offers = await this.offerService.getAllOffers({
        outletId: outletId as string,
        status: status as string,
        date: date as string,
      });
      const offersWithOutletDetails = await Promise.all(
        offers.map(async (offer) => {
          let outletDetails = null;
          if (offer.outletId) {
            const outlet = await Outlet.findById(offer.outletId);
            if (outlet) {
              outletDetails = outlet.toObject();
              if (
                outletDetails.location &&
                Array.isArray(outletDetails.location.coordinates)
              ) {
                const coords = outletDetails.location.coordinates;
                if (
                  coords.length === 2 &&
                  Math.abs(coords[0]) > 90 &&
                  Math.abs(coords[1]) <= 90
                ) {
                  outletDetails.location.coordinates = [coords[1], coords[0]];
                }
              }
            }
          }
          let remainingDays = 0;
          if (offer.validTo) {
            const now = new Date();
            const validTo = new Date(offer.validTo);
            if (validTo > now) {
              const diffMs = validTo.getTime() - now.getTime();
              remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }
          }
          return { ...offer, outletDetails, remainingDays };
        })
      );
      this.sendSuccess(res, offersWithOutletDetails);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getOffersValidToday = async (_req: Request, res: Response) => {
    try {
      const offers = await this.offerService.getOffersValidToday();
      const offersWithOutletDetails = await Promise.all(
        offers.map(async (offer) => {
          let outletDetails = null;
          if (offer.outletId) {
            const outlet = await Outlet.findById(offer.outletId);
            if (outlet) {
              outletDetails = outlet.toObject();
              if (
                outletDetails.location &&
                Array.isArray(outletDetails.location.coordinates)
              ) {
                const coords = outletDetails.location.coordinates;
                if (
                  coords.length === 2 &&
                  Math.abs(coords[0]) > 90 &&
                  Math.abs(coords[1]) <= 90
                ) {
                  outletDetails.location.coordinates = [coords[1], coords[0]];
                }
              }
            }
          }
          let remainingDays = 0;
          if (offer.validTo) {
            const now = new Date();
            const validTo = new Date(offer.validTo);
            if (validTo > now) {
              const diffMs = validTo.getTime() - now.getTime();
              remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }
          }
          return { ...offer, outletDetails, remainingDays };
        })
      );
      this.sendSuccess(res, offersWithOutletDetails);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMyOffers = async (req: AuthRequest, res: Response) => {
    try {
      const superAdminId = req.user._id;
      const outlets = await Outlet.find({ createdBy: superAdminId });
      const outletIds = outlets.map((o) => o._id);
      const offers = await Offer.find({
        outletId: { $in: outletIds },
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      });
      const outletMap = new Map();
      outlets.forEach((outlet) => {
        outletMap.set(String(outlet._id), {
          businessName: outlet.businessName,
          address: outlet.address,
        });
      });
      const offersWithOutletDetails = offers.map((offer) => {
        const offerObj = offer.toObject ? offer.toObject() : offer;
        const outletDetails = outletMap.get(String(offerObj.outletId));
        let remainingDays = 0;
        if (offerObj.validTo) {
          const now = new Date();
          const validTo = new Date(offerObj.validTo);
          if (validTo > now) {
            const diffMs = validTo.getTime() - now.getTime();
            remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        }
        return {
          ...offerObj,
          outletName: outletDetails ? outletDetails.businessName : null,
          outletAddress: outletDetails ? outletDetails.address : null,
          remainingDays,
        };
      });
      res.status(200).json({ success: true, data: offersWithOutletDetails });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getMyOffersForOutletAdmin = async (req: AuthRequest, res: Response) => {
    try {
      const outletAdminId = req.user._id;
      const outlet = await Outlet.findOne({ assignedAdmin: outletAdminId });
      if (!outlet)
        return res
          .status(404)
          .json({ success: false, message: "Outlet not found for this admin" });
      const offers = await Offer.find({
        outletId: outlet._id,
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      });
      const offersWithRemaining = offers.map((offer) => {
        const offerObj = offer.toObject ? offer.toObject() : offer;
        let remainingDays = 0;
        if (offerObj.validTo) {
          const now = new Date();
          const validTo = new Date(offerObj.validTo);
          if (validTo > now) {
            const diffMs = validTo.getTime() - now.getTime();
            remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        }
        return { ...offerObj, remainingDays };
      });
      res.status(200).json({ success: true, data: offersWithRemaining });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  searchOffers = async (req: Request, res: Response) => {
    try {
      const { title, businessName } = req.query;
      const offers = await this.offerService.searchOffers({
        title: title as string,
        businessName: businessName as string,
      });
      const offersWithRemaining = offers.map((offer) => {
        let remainingDays = 0;
        if (offer.validTo) {
          const now = new Date();
          const validTo = new Date(offer.validTo);
          if (validTo > now) {
            const diffMs = validTo.getTime() - now.getTime();
            remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        }
        return { ...offer, remainingDays };
      });
      this.sendSuccess(res, offersWithRemaining);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getMaxDiscountOfferByOutletId = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      if (!outletId)
        return res
          .status(400)
          .json({ success: false, message: "outletId is required" });
      const offer = await this.offerService.getMaxDiscountOfferByOutlet(
        outletId
      );
      if (!offer) {
        return res
          .status(404)
          .json({ success: false, message: "No offers found for this outlet" });
      }
      let remainingDays = 0;
      if (offer.validTo) {
        const now = new Date();
        const validTo = new Date(offer.validTo);
        if (validTo > now) {
          const diffMs = validTo.getTime() - now.getTime();
          remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
      }
      res
        .status(200)
        .json({ success: true, data: { ...offer, remainingDays } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
