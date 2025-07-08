import { Request, Response } from "express";
import { OfferService } from "../services/offer.service";
import { BaseController } from "./base.controller";
import { AuthRequest } from "../interfaces/auth.interface";
import fs from "fs";
import https from "https";
import { Outlet } from '../models/outlet.model';
import { Offer } from '../models/offer.model';


export class OfferController extends BaseController {
  private offerService: OfferService;

  constructor() {
    super();
    this.offerService = new OfferService();
  }

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

  public createOffer = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const outletId = req.body.outletId;
      if (!outletId) {
        this.sendError(res, "Outlet ID is required", 400);
        return;
      }

      const { title, description, discountPercentage, validFrom, validTo } = req.body;
      const roleAssignment = (req as any).roleAssignment;
      const createdByRole = roleAssignment?.role;
      const createdByUser = req.user?._id;

      // Create offer
      const offer = await this.offerService.createOffer(
        {
          outletId,
          title,
          description,
          discountPercentage,
          validFrom: new Date(validFrom),
          validTo: new Date(validTo),
          isActive: true,
          isDefault: false,
          createdByRole,
          createdByUser
        },
        outletId
      );

      this.sendSuccess(res, offer, "Offer created successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getActiveOffers = async (req: Request, res: Response) => {
    try {
      const offers = await this.offerService.getActiveOffers();
      this.sendSuccess(res, offers);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getOfferById = async (req: Request, res: Response) => {
    try {
      const offer = await this.offerService.getOfferById(req.params.id);
      if (!offer) {
        return this.sendError(res, "Offer not found", 404);
      }
      this.sendSuccess(res, offer);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getOffersByOutlet = async (req: Request, res: Response) => {
    try {
      const offers = await this.offerService.getOffersByOutlet(
        req.params.outletId
      );
      this.sendSuccess(res, offers);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  updateOffer = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const outletId = req.body.outletId;
      if (!outletId) {
        return this.sendError(res, "Outlet ID is required", 400);
      }
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
      if (!outletId) {
        return this.sendError(res, "Outlet ID is required", 400);
      }
      await this.offerService.deleteOffer(id, outletId);
      this.sendSuccess(res, { message: "Offer deleted successfully" });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public getAllOffers = async (req: Request, res: Response) => {
    try {
      const { outletId, status, date } = req.query;
      // Fetch offers and populate outlet details
      const offers = await Offer.find({
        ...(outletId ? { outletId } : {}),
        ...(status ? { isActive: status === 'active' } : {}),
        ...(date ? { validFrom: { $lte: new Date(date as string) }, validTo: { $gte: new Date(date as string) } } : {})
      }).populate('outletId');

      // Type guard to check if outletId is a populated object
      function isPopulatedOutlet(outlet: any): outlet is { _id: any } {
        return outlet !== null && typeof outlet === 'object' && '_id' in outlet;
      }

      const offersWithOutletDetails = offers.map(offer => {
        const offerObj = offer.toObject();
        let outletDetails = null;
        let outletIdValue = offerObj.outletId;
        if (isPopulatedOutlet(offerObj.outletId)) {
          outletDetails = offerObj.outletId;
          outletIdValue = offerObj.outletId._id;
        }
        return {
          ...offerObj,
          outletDetails,
          outletId: outletIdValue
        };
      });

      this.sendSuccess(res, offersWithOutletDetails);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public getOffersValidToday = async (req: Request, res: Response) => {
    try {
      const offers = await this.offerService.getOffersValidToday();
      this.sendSuccess(res, offers);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public getMyOffers = async (req: AuthRequest, res: Response) => {
    try {
      const superAdminId = req.user._id;
      // Find all outlets created by this super admin
      const outlets = await Outlet.find({ createdBy: superAdminId });
      const outletIds = outlets.map(o => o._id);
      const offers = await Offer.find({ outletId: { $in: outletIds } });

      // Create a map for quick lookup of outlet details
      const outletMap = new Map();
      outlets.forEach(outlet => {
        outletMap.set(String(outlet._id), {
          businessName: outlet.businessName,
          address: outlet.address
        });
      });

      // Add outlet name and address to each offer
      const offersWithOutletDetails = offers.map(offer => {
        const offerObj = offer.toObject();
        const outletDetails = outletMap.get(String(offer.outletId));
        return {
          ...offerObj,
          outletName: outletDetails ? outletDetails.businessName : null,
          outletAddress: outletDetails ? outletDetails.address : null
        };
      });

      res.status(200).json({ success: true, data: offersWithOutletDetails });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  public getMyOffersForOutletAdmin = async (req: AuthRequest, res: Response) => {
    try {
      const outletAdminId = req.user._id;
      const outlet = await Outlet.findOne({ assignedAdmin: outletAdminId });
      if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found for this admin' });
      const offers = await Offer.find({ outletId: outlet._id });
      res.status(200).json({ success: true, data: offers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
