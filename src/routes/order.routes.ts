import { Router } from "express";
import {
  OrderController,
  resendOrderTickets,
} from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";
import container from "../inversify.config";

const router = Router();
const orderController = container.get(OrderController);

router.post("/", authenticate, orderController.createOrder);

router.post("/pay-with-coins", authenticate, orderController.payWithCoins);

router.get("/my", authenticate, orderController.getMyOrders);

router.post("/:orderId/resend-tickets", authenticate, resendOrderTickets);

router.post(
  "/:orderId/cancel",
  authenticate,
  orderController.requestOrderCancellation
);

export default router;
