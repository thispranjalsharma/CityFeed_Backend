import express, { Router } from "express";
import { OfferController } from "../controllers/offer.controller";
import {
  authenticate,
  superAdminAuth,
  adminAuth,
} from "../middleware/auth.middleware";
import * as expressValidator from "express-validator";
import {
  validateRequest,
  isValidPhone,
  isStrongPassword,
} from "../middleware/validation.middleware";
import { SuperAdminController } from "../controllers/superAdmin.controller";
import container from "../inversify.config";
import { OutletController } from "../controllers/outlet.controller";
import { OutletAdminController } from "../controllers/outletAdmin.controller";
import { StaffController } from "../controllers/staff.controller";

const { body } = expressValidator;

const router: Router = express.Router();
const offerController = container.get(OfferController);

const superAdminController = container.get(SuperAdminController);
const outletController = container.get(OutletController);
const outletAdminController = container.get(OutletAdminController);
const staffController = container.get(StaffController);

router.post(
  "/register",
  validateRequest([
    body("name").isString().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    (body("password") as any)
      .custom(isStrongPassword)
      .withMessage(
        "Password must be at least 8 characters, include 1 special character, 1 lowercase letter, and 1 digit"
      ),
    (body("phone") as any)
      .custom(isValidPhone)
      .withMessage("Phone number must be valid 10 digits"),
  ]),
  superAdminController.registerSuperAdmin
);

router.get(
  "/my-outlets",
  authenticate,
  superAdminAuth,
  outletController.getMyOutlets
);

router.get(
  "/my-outlet-admins",
  authenticate,
  superAdminAuth,
  outletAdminController.getMyOutletAdmins
);

router.get(
  "/my-employees",
  authenticate,
  superAdminAuth,
  staffController.getMyEmployeesForSuperAdmin
);

router.get(
  "/outlet-employees",
  authenticate,
  superAdminAuth,
  staffController.getEmployeesForOutletBySuperAdmin
);

router.get(
  "/my-offers",
  authenticate,
  superAdminAuth,
  offerController.getMyOffers
);

router.get(
  "/profile",
  authenticate,
  superAdminAuth,
  superAdminController.getMyProfile
);

router.put(
  "/profile",
  authenticate,
  superAdminAuth,
  validateRequest([
    body("name").optional().isString().withMessage("Name must be a string"),
    body("phone").optional().isString().withMessage("Phone must be a string"),
  ]),
  superAdminController.updateMyProfile
);

router.delete(
  "/profile",
  authenticate,
  superAdminAuth,
  superAdminController.deleteMyProfile
);

router.patch(
  "/disapprove/:id",
  authenticate,
  adminAuth,
  superAdminController.disapproveSuperAdmin
);

router.get(
  "/dashboard",
  authenticate,
  superAdminAuth,
  superAdminController.getDashboardData
);

export default router;
