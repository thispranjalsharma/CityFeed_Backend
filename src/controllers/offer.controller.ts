import { Request, Response } from "express";
import { OfferService } from "../services/offer.service";
import { BaseController } from "./base.controller";
import { AuthRequest } from "../interfaces/auth.interface";
import fs from "fs";
import https from "https";


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
      const merchantId = req.user?._id?.toString();
      if (!merchantId) {
        this.sendError(res, "Merchant not authenticated", 401);
        return;
      }

      const { title, description, discountPercentage, validFrom, validTo } =
        req.body;

      // Create offer
      const offer = await this.offerService.createOffer(
        {
          merchantId,
          title,
          description,
          discountPercentage,
          validFrom: new Date(validFrom),
          validTo: new Date(validTo),
          isActive: true,
          isDefault: false,
        },
        merchantId
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

  getOffersByMerchant = async (req: Request, res: Response) => {
    try {
      const offers = await this.offerService.getOffersByMerchant(
        req.params.merchantId
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
      const merchantId = req.user?._id;

      if (!merchantId) {
        return this.sendError(res, "Merchant ID not found", 401);
      }

      const updatedOffer = await this.offerService.updateOffer(
        id,
        updateData,
        merchantId.toString()
      );
      this.sendSuccess(res, updatedOffer);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  deleteOffer = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const merchantId = req.user?._id;

      if (!merchantId) {
        return this.sendError(res, "Merchant ID not found", 401);
      }

      await this.offerService.deleteOffer(id, merchantId.toString());
      this.sendSuccess(res, { message: "Offer deleted successfully" });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
}
