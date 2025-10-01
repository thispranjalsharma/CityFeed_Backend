import { Router } from "express";
import container from "../inversify.config";
import { EventStaffController } from "../controllers/eventStaff.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = container.get(EventStaffController);

router.post("/", authenticate, controller.createEventStaffOnly);

router.post(
  "/assign-to-event",
  authenticate,
  authorize("event_organizer", "event_manager"),
  controller.assignEventStaffToEvent
);

router.get(
  "/dashboard",
  authenticate,
  authorize("event_staff"),
  controller.getDashboardData
);

router
  .route("/profile")
  .get(authenticate, authorize("event_staff"), controller.getProfile)
  .put(authenticate, authorize("event_staff"), controller.updateProfile)
  .delete(
    authenticate,
    authorize("event_staff"),
    controller.deleteEventStaffProfile
  );

router.get(
  "/events/:eventId/ticket-bookings",
  authenticate,
  authorize("event_staff"),
  controller.getAssignedEventTicketBookings
);

export default router;
