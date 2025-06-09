import { Request, Response } from 'express';
import { OfferService } from '../services/offer.service';
import { BaseController } from './base.controller';
import { AuthRequest } from '../interfaces/auth.interface';
import path from 'path';
import fs from 'fs';
import https from 'https';

export class OfferController extends BaseController {
  private offerService: OfferService;

  constructor() {
    super();
    this.offerService = new OfferService();
  }

  private async downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const writer = fs.createWriteStream(filepath);
        response.pipe(writer);

        writer.on('finish', () => resolve());
        writer.on('error', reject);
      }).on('error', reject);
    });
  }

  createOffer = async (req: AuthRequest, res: Response) => {
    try {
      const merchantId = req.user?._id;
      if (!merchantId) {
        return this.sendError(res, 'Merchant ID not found', 401);
      }

      // Get the image path from either file upload or URL
      let imagePath = '';
      if (req.file) {
        // If file was uploaded, get the relative path
        const relativePath = path.relative(path.join(__dirname, '../../'), req.file.path);
        imagePath = '/' + relativePath.replace(/\\/g, '/');
      } else if (req.body.image) {
        // If image URL was provided, download and save it
        const uploadDir = path.join(__dirname, '../../uploads');
        
        // Create the uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate filename using timestamp
        const timestamp = Date.now();
        const filename = `${timestamp}.jpg`;
        const filepath = path.join(uploadDir, filename);

        // Download and save the image
        await this.downloadImage(req.body.image, filepath);

        // Get the relative path for storage
        const relativePath = path.relative(path.join(__dirname, '../../'), filepath);
        imagePath = '/' + relativePath.replace(/\\/g, '/');
      }

      const offerData = {
        ...req.body,
        image: imagePath
      };

      const offer = await this.offerService.createOffer(offerData, merchantId.toString());
      this.sendSuccess(res, offer, 'Offer created successfully');
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
        return this.sendError(res, 'Offer not found', 404);
      }
      this.sendSuccess(res, offer);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getOffersByMerchant = async (req: Request, res: Response) => {
    try {
      const offers = await this.offerService.getOffersByMerchant(req.params.merchantId);
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
        return this.sendError(res, 'Merchant ID not found', 401);
      }

      const updatedOffer = await this.offerService.updateOffer(id, updateData, merchantId.toString());
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
        return this.sendError(res, 'Merchant ID not found', 401);
      }

      await this.offerService.deleteOffer(id, merchantId.toString());
      this.sendSuccess(res, { message: 'Offer deleted successfully' });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
} 