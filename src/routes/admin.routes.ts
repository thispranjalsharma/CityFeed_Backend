import { Router } from "express";
import container from "../inversify.config";

import { AdminController } from "../controllers/admin.controller";
import { authenticate, adminAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { check } from "express-validator";
import { SuperAdminController } from "../controllers/superAdmin.controller";
import { OutletAdminController } from "../controllers/outletAdmin.controller";
import { OutletController } from "../controllers/outlet.controller";
import { StaffController } from "../controllers/staff.controller";
import { UserController } from "../controllers/user.controller";

const router = Router();
// Get singleton controller from Inversify container
const adminController = container.get(AdminController);
const superAdminController = container.get(SuperAdminController);
const outletAdminController = container.get(OutletAdminController); // Assuming OutletAdminController is also bound to SuperAdminController for simplicity
const outletController = container.get(OutletController);
const staffController = container.get(StaffController); // Assuming StaffController is also bound to getAllEmployees for simplicity
const userController = container.get(UserController); // Replace 'UserController' with actual identifier if available

router.get("/users", authenticate, adminAuth, adminController.getUsers);

router.post(
  "/users/:userId/deactivate",
  authenticate,
  adminAuth,
  adminController.deactivateUser
);

router.post(
  "/login",
  validateRequest([
    check("email").isEmail().withMessage("Please provide a valid email"),
    check("password").notEmpty().withMessage("Password is required"),
  ]),
  adminController.login
);

router.get(
  "/super-admins",
  authenticate,
  adminAuth,
  superAdminController.getAllSuperAdmins
);

router.get(
  "/outlet-admins",
  authenticate,
  adminAuth,
  outletAdminController.getAllOutletAdmins
);

router.get("/outlets", authenticate, adminAuth, outletController.getAllOutlets);

router.get(
  "/employees",
  authenticate,
  adminAuth,
  staffController.getAllEmployees
);

router.patch(
  "/users/activate/:id",
  authenticate,
  adminAuth,
  userController.activateUserByAdmin
);

router.get(
  "/event-organizers",
  authenticate,
  adminAuth,
  adminController.getAllEventOrganizers
);

router.post(
  "/event-organizers/:organizerId/approve",
  authenticate,
  adminAuth,
  adminController.approveEventOrganizer
);

router.post(
  "/event-organizers/:organizerId/disapprove",
  authenticate,
  adminAuth,
  adminController.disapproveEventOrganizer
);

// Implement and uncomment if/when controller method is ready
// router.post('/cleanup/trigger', authenticate, adminAuth, adminController.triggerCleanup);

router.get(
  "/cleanup/stats",
  authenticate,
  adminAuth,
  adminController.getCleanupStats
);

router.get(
  "/pre-registration-payments",
  authenticate,
  adminAuth,
  adminController.getPreRegistrationPayments
);

export default router;
