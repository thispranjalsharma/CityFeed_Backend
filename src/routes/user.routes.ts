import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { body } from "express-validator";
import { userAuth } from "../middleware/auth.middleware";
import container from "../inversify.config";

const router = Router();
const userController = container.get(UserController);

router.get("/profile", authenticate, userAuth, userController.getProfile);

router.put(
  "/profile",
  authenticate,
  userAuth,
  validateRequest([
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email address"),
    body("phone")
      .optional()
      .isLength({ min: 10, max: 10 })
      .withMessage("Phone must be exactly 10 digits")
      .isNumeric()
      .withMessage("Phone must be numeric"),
    body("name").optional().isString().withMessage("Name must be a string"),
    body("gender")
      .optional()
      .isIn(["male", "female", "other"])
      .withMessage("Gender must be male, female, or other"),
    body("membershipType")
      .optional()
      .isIn(["cityfeed_select", "cityfeed_edge", "cityfeed_prime"])
      .withMessage("Invalid membership type"),
    body("dob")
      .optional()
      .isISO8601()
      .withMessage("Date of birth must be a valid date"),
  ]),
  userController.updateProfile
);

router.delete("/profile", authenticate, userAuth, userController.deleteProfile);

router.post(
  "/membership/upgrade",
  authenticate,
  validateRequest([
    body("targetMembershipType")
      .isIn(["cityfeed_select", "cityfeed_edge", "cityfeed_prime"])
      .withMessage("Invalid membership type"),
    body("paymentMethod")
      .isIn(["wallet", "razorpay"])
      .withMessage("Invalid payment method"),
  ]),
  userController.upgradeMembership
);

router.post(
  "/membership/upgrade/verify",
  authenticate,
  validateRequest([
    body("orderId").isString().notEmpty().withMessage("Order ID is required"),
  ]),
  userController.verifyMembershipUpgrade
);

router.post(
  "/send-referral",
  authenticate,
  userAuth,
  userController.sendReferralEmail
);

router.get(
  "/by-phone",
  authenticate,
  (req, res, next) => {
    const allowedRoles = [
      "admin",
      "super_admin",
      "outlet_admin",
      "employee",
      "user",
    ];
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  },
  userController.getUserByPhone
);

router.get(
  "/wallet-balance",
  authenticate,
  userAuth,
  userController.getMyWalletBalance
);

router.get(
  "/reward-points",
  authenticate,
  userAuth,
  userController.getMyRewardPoints
);

router.get(
  "/reward-history",
  authenticate,
  userAuth,
  userController.getMyRewardHistory
);

router.get(
  "/reward-summary",
  authenticate,
  userAuth,
  userController.getMyRewardSummary
);

router.post(
  "/check-email",
  validateRequest([
    body("email").isEmail().withMessage("Please provide a valid email"),
  ]),
  userController.checkEmailAvailability
);

router.post(
  "/check-phone",
  validateRequest([
    body("phone")
      .isLength({ min: 10, max: 10 })
      .withMessage("Phone must be exactly 10 digits")
      .isNumeric()
      .withMessage("Phone must be numeric"),
  ]),
  userController.checkPhoneAvailability
);

router.get(
  "/booked-tickets",
  authenticate,
  userAuth,
  userController.getBookedTickets
);

export default router;
