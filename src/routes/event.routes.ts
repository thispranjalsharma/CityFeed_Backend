import { Router } from "express";
import container from "../inversify.config";
import { EventController } from "../controllers/event.controller";
import { EventStaffController } from "../controllers/eventStaff.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { eventImageUpload } from "../middleware/upload.middleware";

const router = Router();

// Get controller instances from DI container
const eventController = container.get(EventController);
const eventStaffController = container.get(EventStaffController);

// List all events
router.get("/", eventController.listEvents);

// Event draft creation
router.post("/draft-flex", authenticate, eventController.createDraftFlex);

// Edit event
router.put("/:id/edit", authenticate, eventController.editEvent);

// Delete event
router.delete("/:id/delete", authenticate, eventController.deleteEvent);

// Update draft
router.patch("/:id", authenticate, eventController.updateDraft);

// Organizer/Manager/Staff views
router.get(
  "/my-events",
  authenticate,
  authorize("event_organizer"),
  eventController.getMyEvents
);

router.get(
  "/my-event-staff",
  authenticate,
  authorize("event_manager", "event_staff"),
  eventController.getMyEventStaff
);

router.get(
  "/managed-events",
  authenticate,
  authorize("event_manager"),
  eventController.getMyManagedEvents
);

router.get(
  "/staff-events",
  authenticate,
  authorize("event_staff"),
  eventController.getMyStaffEvents
);

router.get(
  "/dashboard",
  authenticate,
  authorize("event_organizer"),
  eventController.getDashboardData
);

// Event tiers and details
router.get("/:id/tiers", eventController.getEventTiers);

router.get("/:id", eventController.getEventById);

// Cover image upload
router.patch(
  "/:id/cover-images",
  authenticate,
  eventImageUpload,
  eventController.updateCoverImages
);

// Publish event
router.post("/:id/publish", authenticate, eventController.publishEvent);

// Event staff activation/deactivation
router.patch(
  "/staff/:staffId/activate",
  authenticate,
  authorize("event_organizer", "event_manager"),
  eventController.activateEventStaff
);

router.patch(
  "/staff/:staffId/deactivate",
  authenticate,
  authorize("event_organizer", "event_manager"),
  eventController.deactivateEventStaff
);

// Assign staff to event: pass eventId and staff fields to controller
router.post("/:eventId/assign-staff", authenticate, (req, res) => {
  req.body.eventId = req.params.eventId;
  // Make sure to also forward eventStaffId and responsibilities if needed
  return eventStaffController.assignEventStaffToEvent(req, res);
});

// Event bookings
router.get(
  "/:eventId/ticket-bookings",
  authenticate,
  eventController.getEventTicketBookings
);

router.post("/:eventId/cancel", authenticate, eventController.cancelEvent);

router.post(
  "/:eventId/cancel/request-otp",
  authenticate,
  eventController.requestCancellationOTP
);

router.get(
  "/:eventId/ticket-holders",
  authenticate,
  eventController.getEventTicketHolders
);

export default router;
