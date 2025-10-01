import express, { Router } from "express";
import { ReviewController } from "../controllers/review.controller";
import { authenticate, userAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { check } from "express-validator";
import container from "../inversify.config";

const router: Router = express.Router();
const reviewController = container.get(ReviewController); // Dependency injection

router.post(
  "/",
  validateRequest([
    check("dineInSessionId")
      .notEmpty()
      .withMessage("Dine-in session ID is required"),
    check("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    check("comment").notEmpty().withMessage("Comment is required"),
  ]),
  reviewController.createReview
);

router.get(
  "/session/:dineInSessionId",
  reviewController.getReviewsByDineInSession
);

router.get("/outlet/:outletId", reviewController.getReviewsByOutlet);

router.get("/public/outlet/:outletId", reviewController.getPublicOutletReviews);

router.get("/user", authenticate, userAuth, reviewController.getReviewsByUser);

router.put(
  "/:id",
  authenticate,
  userAuth,
  validateRequest([
    check("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    check("comment")
      .optional()
      .notEmpty()
      .withMessage("Comment cannot be empty"),
  ]),
  reviewController.updateReview
);

router.delete("/:id", authenticate, reviewController.deleteReview);

router.get("/all", reviewController.getAllReviewsPaginated);

export default router;
