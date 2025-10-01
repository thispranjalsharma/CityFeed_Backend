import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import container from "../inversify.config";
import { OfferController } from "../controllers/offer.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { check, body } from "express-validator";
import { requireResponsibility } from "../middleware/requireResponsibility.middleware";
import { Offer } from "../models/offer.model";

const router = Router();
const offerController = container.get(OfferController);

// Middleware to inject outletId from offer for delete route
const injectOutletIdFromOffer: RequestHandler = async (req, res, next) => {
  try {
    const offerId = req.params.id;
    if (!offerId)
      return res.status(400).json({ message: "Offer ID is required" });
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    req.body.outletId = offer.outletId;
    next();
  } catch (error) {
    next(error);
  }
};

const validateOfferDates: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { validFrom, validTo } = req.body;

  if (new Date(validFrom) < new Date()) {
    res.status(400).json({
      success: false,
      error: "Valid from date must be in the future",
    });
    return;
  }

  if (new Date(validTo) <= new Date(validFrom)) {
    res.status(400).json({
      success: false,
      error: "Valid to date must be after valid from date",
    });
    return;
  }

  next();
};

router.get("/", offerController.getAllOffers);

router.get("/valid-today", offerController.getOffersValidToday);

router.get("/search", offerController.searchOffers);

router.get("/:id", offerController.getOfferById);

router.get("/outlet/:outletId", offerController.getOffersByOutlet);

router.put(
  "/:id",
  authenticate,
  injectOutletIdFromOffer,
  requireResponsibility("update_offer"),
  validateRequest([
    check("title").optional().isString(),
    check("description").optional().isString(),
    check("discountPercentage").optional().isNumeric(),
    check("validFrom").optional().isISO8601(),
    check("validTo").optional().isISO8601(),
    check("isActive").optional().isBoolean(),
  ]),
  offerController.updateOffer
);

router.delete(
  "/:id",
  authenticate,
  injectOutletIdFromOffer,
  requireResponsibility("delete_offer"),
  offerController.deleteOffer
);

router.post(
  "/",
  authenticate,
  requireResponsibility("create_offer"),
  validateRequest([
    body("title").isString().notEmpty(),
    body("description").isString().notEmpty(),
    body("discountPercentage").isNumeric(),
    body("validFrom").isISO8601(),
    body("validTo").isISO8601(),
    body("outletId").isString().notEmpty(),
  ]),
  validateOfferDates,
  offerController.createOffer
);

router.patch(
  "/:id/restore",
  authenticate,
  requireResponsibility("restore_offer"),
  validateRequest([body("outletId").isString().notEmpty()]),
  offerController.restoreOffer
);

router.get(
  "/deleted",
  authenticate,
  requireResponsibility("view_deleted_offers"),
  offerController.getDeletedOffers
);

router.get(
  "/max-discount/:outletId",
  offerController.getMaxDiscountOfferByOutletId
);

export default router;
