import { Router } from "express";
import container from "../inversify.config";
import { EventManagerController } from "../controllers/eventManager.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const eventManagerController = container.get(EventManagerController);

router.post(
  "/",
  authenticate,
  authorize("event_organizer"),
  eventManagerController.createEventManager
);

router
  .route("/profile")
  .get(
    authenticate,
    authorize("event_manager"),
    eventManagerController.getProfile
  )
  .put(
    authenticate,
    authorize("event_manager"),
    eventManagerController.updateProfile
  )
  .delete(
    authenticate,
    authorize("event_manager"),
    eventManagerController.deleteProfile
  );

router.get(
  "/dashboard",
  authenticate,
  authorize("event_manager"),
  eventManagerController.getDashboardData
);

router.patch(
  "/:managerId/activate",
  authenticate,
  authorize("event_organizer"),
  eventManagerController.activateEventManager
);

router.patch(
  "/:managerId/deactivate",
  authenticate,
  authorize("event_organizer"),
  eventManagerController.deactivateEventManager
);

router.get(
  "/events/:eventId/ticket-bookings",
  authenticate,
  authorize("event_manager"),
  eventManagerController.getManagedEventTicketBookings
);

export default router;
