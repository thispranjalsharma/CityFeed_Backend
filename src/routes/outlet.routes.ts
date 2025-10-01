import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { body } from "express-validator";
import upload from "../middleware/upload.middleware";
import { Outlet } from "../models/outlet.model";
import { Review } from "../models/review.model";
import container from "../inversify.config";
import { OutletController } from "../controllers/outlet.controller";

const router = Router();

const outletController = container.get(OutletController);

router.get("/public", async (req, res) => {
  try {
    const outlets = await Outlet.find({
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    });
    // Get all outlet IDs
    const outletIds = outlets.map((outlet) => outlet._id);
    // Aggregate average ratings for all outlets
    const ratings = await Review.aggregate([
      { $match: { outletId: { $in: outletIds } } },
      {
        $group: {
          _id: "$outletId",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);
    // Map outletId to rating
    const ratingMap = {};
    ratings.forEach((r) => {
      ratingMap[r._id.toString()] = {
        avgRating: r.avgRating,
        reviewCount: r.reviewCount,
      };
    });
    // Attach rating to each outlet
    const outletsWithRating = outlets.map((outlet) => {
      const ratingInfo = ratingMap[outlet._id.toString()] || {
        avgRating: null,
        reviewCount: 0,
      };
      return {
        ...outlet.toObject(),
        avgRating: ratingInfo.avgRating,
        reviewCount: ratingInfo.reviewCount,
      };
    });
    res.status(200).json({ success: true, data: outletsWithRating });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  "/",
  authenticate,
  upload.array("images", 5),
  validateRequest([
    body("businessName").isString().notEmpty(),
    body("businessType").isString().notEmpty(),
    body("businessDescription").isString().notEmpty(),
    body("category").isString().notEmpty(),
    body("address").isString().notEmpty(),
    body("location").isString().notEmpty(),
    body("defaultMaxDiscount").isNumeric(),
    body("adminEmail").isString().notEmpty(),
    body("adminPassword").isString().notEmpty(),
    body("adminPhone").isString().notEmpty(),
    body("createDefaultOffer").optional().isBoolean(),
  ]),
  outletController.createOutlet
);

router.get("/", authenticate, outletController.getOutletsBySuperAdmin);

router.get("/search", async (req, res) => {
  try {
    const { businessName } = req.query;
    if (!businessName || typeof businessName !== "string") {
      return res.status(400).json({
        success: false,
        message: "businessName query parameter is required",
      });
    }
    // Use imported Outlet directly
    const outlets = await Outlet.find({
      businessName: { $regex: businessName, $options: "i" },
    });
    res.status(200).json({ success: true, data: outlets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get(
  "/status/:status",
  authenticate,
  outletController.getOutletsByStatus
);

router.get("/:outletId", authenticate, outletController.getOutletById);

router.put(
  "/:outletId",
  authenticate,
  upload.array("images", 5),
  validateRequest([
    body("businessName").optional().isString(),
    body("businessType").optional().isString(),
    body("businessDescription").optional().isString(),
    body("category").optional().isString(),
    body("address").optional().isString(),
    body("location").optional().isString(),
    body("defaultMaxDiscount").optional(),
    body("adminName").optional().isString(),
    body("adminEmail").optional(),
    body("adminPassword").optional().isString(),
    body("adminPhone").optional().isString(),
  ]),
  outletController.updateOutlet
);

router.delete("/:outletId", authenticate, outletController.deleteOutlet);

router.patch(
  "/:outletId/restore",
  authenticate,
  outletController.restoreOutlet
);

router.get("/deleted", authenticate, outletController.getDeletedOutlets);

router.patch(
  "/:outletId/status",
  authenticate,
  validateRequest([
    body("isActive").isBoolean().withMessage("isActive must be a boolean"),
  ]),
  outletController.updateOutletStatus
);

router.patch(
  "/assign-admin",
  authenticate,
  validateRequest([
    body("outletId").isString().withMessage("Invalid outlet ID"),
    body("adminId").isString().withMessage("Invalid admin ID"),
  ]),
  outletController.assignAdmin
);

router.patch(
  "/:outletId/remove-admin",
  authenticate,
  outletController.removeAdmin
);

router.post(
  "/:outletId/roles",
  authenticate,
  validateRequest([
    body("name").optional().isString().withMessage("Name must be a string"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("phone").isString().withMessage("Phone is required"),
    body("role").isString().withMessage("Role is required"),
    body("responsibilities")
      .isArray()
      .withMessage("Responsibilities must be an array"),
  ]),
  outletController.assignRoleToEmployee
);

router.post("/fix-status", authenticate, outletController.fixOutletStatus);

export default router;
