import { Router } from "express";
import container from "../inversify.config";
import { EventAuthController } from "../controllers/eventAuth.controller";
import { body } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// Resolve the controller from the DI container
const controller = container.get(EventAuthController);

// Custom password middleware (unchanged; can be extracted and reused)
function validatePassword(req, res, next) {
  const password = req.body.password;
  if (!password || typeof password !== "string")
    return res.status(400).json({ message: "Password is required" });
  if (password.length < 8)
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  if (!/[A-Z]/.test(password))
    return res
      .status(400)
      .json({ message: "Password must contain at least one uppercase letter" });
  if (!/[a-z]/.test(password))
    return res
      .status(400)
      .json({ message: "Password must contain at least one lowercase letter" });
  if (!/\d/.test(password))
    return res
      .status(400)
      .json({ message: "Password must contain at least one digit" });
  if (!/[^A-Za-z\d]/.test(password))
    return res.status(400).json({
      message: "Password must contain at least one special character",
    });
  next();
}

// Event organizer/staff registration
router.post(
  "/register",
  validateRequest([
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    // password handled by custom middleware below
    body("phone")
      .isLength({ min: 10, max: 10 })
      .withMessage("Phone must be exactly 10 digits")
      .isNumeric()
      .withMessage("Phone must be numeric"),
  ]),
  validatePassword,
  controller.register
);

router.post("/verify-email", controller.verifyEmail);

// Profile operations for organizer & staff
router
  .route("/profile")
  .get(
    authenticate,
    authorize("event_organizer", "event_staff"),
    controller.getProfile
  )
  .put(
    authenticate,
    authorize("event_organizer", "event_staff"),
    controller.updateProfile
  )
  // These are overlapping DELETE, but you may want to have distinct endpoints in practice
  .delete(
    authenticate,
    authorize("event_organizer"),
    controller.deleteEventOrganizerProfile
  )
  .delete(
    authenticate,
    authorize("event_staff"),
    controller.deleteEventStaffProfile
  );

// Organizer endpoints for event managers and staff
router.get(
  "/my-event-managers",
  authenticate,
  authorize("event_organizer"),
  controller.getMyEventManagers
);

router.get(
  "/my-event-staff",
  authenticate,
  authorize("event_organizer"),
  controller.getMyEventStaff
);

export default router;
