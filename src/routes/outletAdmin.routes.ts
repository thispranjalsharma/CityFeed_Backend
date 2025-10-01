import express, { Router } from "express";
import container from "../inversify.config";
import { OutletAdminController } from "../controllers/outletAdmin.controller";
import { OutletController } from "../controllers/outlet.controller";
import { StaffController } from "../controllers/staff.controller";
import { OfferController } from "../controllers/offer.controller";
import { authenticate, outletAdminAuth } from "../middleware/auth.middleware";
import {
  validateRequest,
  isValidPhone,
  isStrongPassword,
} from "../middleware/validation.middleware";
import { body } from "express-validator";
import { requireRole } from "../middleware/role.middleware";

const router: Router = express.Router();
const outletAdminController = container.get(OutletAdminController);
const outletController = container.get(OutletController);
const staffController = container.get(StaffController);
const offerController = container.get(OfferController);

// Normal routes using controller instances directly

router.get(
  "/my-outlet",
  authenticate,
  outletAdminAuth,
  outletController.getMyOutlets
);

router.get(
  "/my-employees",
  authenticate,
  outletAdminAuth,
  staffController.getMyEmployees
);

router.get(
  "/my-offers",
  authenticate,
  outletAdminAuth,
  offerController.getMyOffersForOutletAdmin
);

router.get(
  "/dashboard",
  authenticate,
  outletAdminAuth,
  outletAdminController.getDashboardData
);

router.get(
  "/profile",
  authenticate,
  outletAdminAuth,
  outletAdminController.getMyProfile
);

router.put(
  "/profile",
  authenticate,
  outletAdminAuth,
  validateRequest([
    body("name").optional().isString().withMessage("Name must be a string"),
    body("phone").optional().isString().withMessage("Phone must be a string"),
  ]),
  outletAdminController.updateMyProfile
);

router.delete(
  "/profile",
  authenticate,
  outletAdminAuth,
  outletAdminController.deleteMyProfile
);

// Super-admin only access routes
router.get(
  "/deleted",
  authenticate,
  requireRole(["super_admin"]),
  outletAdminController.getDeletedOutletAdmins
);

router.patch(
  "/:adminId/restore",
  authenticate,
  requireRole(["super_admin"]),
  outletAdminController.restoreOutletAdmin
);

router.delete(
  "/:adminId",
  authenticate,
  requireRole(["super_admin"]),
  outletAdminController.softDeleteOutletAdmin
);

router.post(
  "/register",
  authenticate,
  requireRole(["super_admin"]),
  validateRequest([
    body("name").isString().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
  ]),
  outletAdminController.registerOutletAdmin
);

export default router;
