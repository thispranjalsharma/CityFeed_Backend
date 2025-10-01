import express from "express";
import userRouter from "./user.routes";
import ticketRouter from "./ticket.routes";
import ticketTierRouter from "./ticketTier.routes";
import superAdminRouter from "./superAdmin.routes";
import reviewRouter from "./review.routes";
import paymentRouter from "./payment.routes";
import outletAdminRouter from "./outletAdmin.routes";
import outletRouter from "./outlet.routes";
import orderRouter from "./order.routes";
import offerRouter from "./offer.routes";
import healthRouter from "./health.routes";
import feedbackRouter from "./feedback.routes";
import eventStaffRouter from "./eventStaff.routes";
import eventManagerRouter from "./eventManager.routes";
import eventAuthRouter from "./eventAuth.routes";
import eventRouter from "./event.routes";
import employeeRouter from "./employee.routes";
import dineInRouter from "./dineIn.routes";
import authRouter from "./auth.routes";
import adminRouter from "./admin.routes";

const router = express.Router();

router.use("/user", userRouter); // done
router.use("/ticket", ticketRouter); // done
router.use("/ticket-tier", ticketTierRouter); // done
router.use("/super-admin", superAdminRouter); // done
router.use("/review", reviewRouter); // done
router.use("/payment", paymentRouter); // done
router.use("/outlet-admin", outletAdminRouter); // done
router.use("/outlet", outletRouter); // done
router.use("/order", orderRouter); // done
router.use("/offer", offerRouter); // done
router.use("/health", healthRouter); // done
router.use("/feedback", feedbackRouter); // done
router.use("/event-staff", eventStaffRouter); // done
router.use("/event-manager", eventManagerRouter); // done
router.use("/event-auth", eventAuthRouter); // done
router.use("/event", eventRouter); // done
router.use("/employee", employeeRouter); // done
router.use("/dine-in", dineInRouter); // done
router.use("/auth", authRouter); // done
router.use("/admin", adminRouter); // done

export default router;
