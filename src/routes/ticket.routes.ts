import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";

import { TicketController } from "../controllers/ticket.controller";
import container from "../inversify.config";
const router = Router();

const ticketController = container.get(TicketController);

router.get("/:ticketId", ticketController.getTicketInfo);

router.post(
  "/scan",
  authenticate,
  authorize("event_staff", "event_manager", "event_organizer"),
  ticketController.scanTicket
);

router.get("/my", authenticate, ticketController.getMyTickets);

export default router;
