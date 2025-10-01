import { Router } from "express";

import { authenticate, authorize } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { body } from "express-validator";
import container from "../inversify.config";
import { StaffController } from "../controllers/staff.controller";

const router = Router();

const staffController = container.get(StaffController);

router.post(
  "/assign-role",
  authenticate,
  authorize("outlet_admin", "super_admin"),
  staffController.assignRoleToOutlet
);

router.get(
  "/available-responsibilities",
  authenticate,
  authorize("super_admin", "outlet_admin"),
  staffController.getAvailableResponsibilities
);

router
  .route("/profile")
  .get(authenticate, authorize("employee"), staffController.getMyProfile)
  .put(
    authenticate,
    authorize("employee"),
    validateRequest([
      body("name").optional().isString().withMessage("Name must be a string"),
      body("phone").optional().isString().withMessage("Phone must be a string"),
    ]),
    staffController.updateMyProfile
  )
  .delete(authenticate, authorize("employee"), staffController.deleteMyProfile);

router.get(
  "/:staffId",
  authenticate,
  authorize("super_admin", "outlet_admin"),
  staffController.getStaffById
);

router.put(
  "/:staffId/responsibilities",
  authenticate,
  authorize("super_admin", "outlet_admin"),
  staffController.updateStaffResponsibilities
);

router.patch(
  "/:staffId/activate",
  authenticate,
  authorize("super_admin", "outlet_admin"),
  (req, res) => staffController.activateStaff(req as any, res)
);

router.patch(
  "/:staffId/deactivate",
  authenticate,
  authorize("super_admin", "outlet_admin"),
  (req, res) => staffController.deactivateStaff(req as any, res)
);

export default router;
