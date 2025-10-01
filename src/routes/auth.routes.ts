import { Router } from "express";
import container from "../inversify.config";
import { AuthController, loginEmployee } from "../controllers/auth.controller";
import { validateRequest } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { SuperAdminController } from "../controllers/superAdmin.controller";
import { OutletAdminController } from "../controllers/outletAdmin.controller";

const router = Router();
const authController = container.get(AuthController);
const superAdminController = container.get(SuperAdminController); // Assuming SuperAdminController is also bound to AuthController for simplicity
const outletAdminController = container.get(OutletAdminController); // Assuming OutletAdminController is also bound to AuthController for simplicity

const handleLoginEmployee = (req, res, next) => {
  loginEmployee(req, res, next);
};

router.post("/login-employee", handleLoginEmployee);
// User registration
router.post(
  "/register/user",
  validateRequest([
    body("email").isEmail().withMessage("Please provide a valid email"),

    body("name").isString().withMessage("Name is required"),
    body("dob").isISO8601().withMessage("Date of birth must be a valid date"),
    body("gender")
      .isIn(["male", "female", "other"])
      .withMessage("Gender must be male, female, or other"),

    body("membershipType")
      .isIn(["cityfeed_select", "cityfeed_edge", "cityfeed_prime"])
      .withMessage(
        "Membership type must be cityfeed_select, cityfeed_edge, or cityfeed_prime"
      ),
    body("referralCode")
      .optional()
      .isString()
      .withMessage("Referral code must be a string"),
  ]),
  authController.registerUser
);

// User login
router.post("/login", authController.login);

// Email verification for users
router.post("/verify-email/:token", authController.verifyEmail);

// Forgot password
router.post(
  "/forgot-password",
  validateRequest([body("email").isEmail()]),
  authController.forgotPassword
);

// User logout
router.post("/logout", authenticate, authController.logout);

// SuperAdmin registration/login/verification/approval
router.post("/register/super-admin", superAdminController.registerSuperAdmin);
router.post("/login/super-admin", superAdminController.loginSuperAdmin);
router.get(
  "/verify-email/super-admin",
  superAdminController.verifySuperAdminEmail
);
router.patch(
  "/approve-super-admin/:id",
  superAdminController.approveSuperAdmin
);

// Outlet admin login
router.post("/login-outlet-admin", outletAdminController.loginOutletAdmin);

// Employee registration/login
router.post(
  "/register-employee",
  authenticate,
  authController.registerEmployee
);
router.post("/login-employee", handleLoginEmployee);

// Change password
router.post(
  "/change-password",
  authenticate,
  validateRequest([
    body("currentPassword").isString(),
    body("newPassword").isLength({ min: 6 }),
    body("role").isIn([
      "user",
      "super_admin",
      "employee",
      "outlet_admin",
      "event_organizer",
      "event_manager",
      "event_staff",
    ]),
  ]),
  authController.changePassword
);

// Reset password
router.post("/reset-password/:token", authController.resetPassword);
router.post("/reset-password", authController.resetPassword);

// Resend verification
router.post("/resend-verification", authController.resendVerification);

// First login: change password
router.post(
  "/first-login-change-password",
  authenticate,
  validateRequest([
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    body("role")
      .isIn([
        "outlet_admin",
        "employee",
        "event_organizer",
        "event_manager",
        "event_staff",
      ])
      .withMessage(
        "Role must be outlet_admin, employee, event_organizer, event_manager, or event_staff"
      ),
  ]),
  authController.firstLoginChangePassword
);

// Guest login and OTP verification
router.post("/guest-login", authController.guestLogin);
router.post("/verify-otp", authController.verifyGuestOtp);

export default router;
