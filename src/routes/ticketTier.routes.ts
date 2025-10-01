import { Router } from "express";
import { TicketTierController } from "../controllers/ticketTier.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/auth.middleware";
import container from "../inversify.config";
// import {container} from "../inversify.config"

const router = Router();
const ticketTierController = container.get(TicketTierController);

router.post(
  "/",
  authenticate,
  authorize("event_organizer", "event_manager"),
  ticketTierController.createTicketTier
);

router.get(
  "/:eventId",
  authenticate,
  authorize("event_organizer", "event_manager"),
  ticketTierController.getTicketTiers
);

router.put(
  "/:ticketTierId",
  authenticate,
  authorize("event_organizer", "event_manager"),
  ticketTierController.updateTicketTier
);

router.delete(
  "/:ticketTierId",
  authenticate,
  authorize("event_organizer", "event_manager"),
  ticketTierController.deleteTicketTier
);

router.post(
  "/bulk",
  authenticate,
  authorize("event_organizer", "event_manager"),
  ticketTierController.bulkCreateTicketTiers
);

router.get(
  "/events/:eventId/tiers",
  authenticate,
  authorize("event_organizer", "event_manager"),
  ticketTierController.getEventWithTiers
);

export default router;
