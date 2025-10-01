import { Router } from "express";
import container from "../inversify.config";
import { FeedbackController } from "../controllers/feedback.controller";
import { authenticate } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();
const feedbackController = container.get(FeedbackController);

router.post(
  "/",
  authenticate,
  validateRequest([
    body("category")
      .isIn(["general", "bug", "feature", "complaint"])
      .withMessage("Invalid category"),
    body("description").notEmpty().withMessage("Description is required"),
  ]),
  feedbackController.createFeedback
);

router.get("/my-feedback", authenticate, feedbackController.getUserFeedback);

router.get("/all", feedbackController.getAllFeedback);

export default router;
