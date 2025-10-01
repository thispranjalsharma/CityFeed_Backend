import express, { Router } from "express";
import { authenticate, userAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { authorizeRoles } from "../middleware/authorizeRoles.middleware";
import { body } from "express-validator";
import { PaymentController } from "../controllers/payment.controller";
import container from "../inversify.config";

const router: Router = express.Router();
const paymentController = container.get(PaymentController);

// Public membership payment routes
router.post(
  "/membership/initiate",
  paymentController.initiateMembershipPayment
);
router.post("/membership/verify", paymentController.verifyMembershipPayment);

router.post(
  "/scan-qr",
  authenticate,
  authorizeRoles(["super_admin", "outlet_admin", "employee"]),
  validateRequest([
    body("userId")
      .notEmpty()
      .withMessage("User ID is required")
      .isString()
      .withMessage("User ID must be a string"),
  ]),
  paymentController.scanQRCode
);

router.get(
  "/get-qr-data",
  authenticate,
  authorizeRoles(["super_admin", "outlet_admin", "employee"]),
  paymentController.getQRCodeData
);

router.post("/unified", authenticate, paymentController.processUnifiedPayment);

router.get(
  "/transactions",
  authenticate,
  userAuth,
  paymentController.getTransactionHistory
);

router.get(
  "/transactions/:id",
  authenticate,
  userAuth,
  paymentController.getTransactionById
);

router.get(
  "/dine-in/history",
  authenticate,
  userAuth,
  paymentController.getDineInHistory
);

router.post(
  "/recharge",
  authenticate,
  userAuth,
  validateRequest([body("amount").isNumeric().isFloat({ min: 1 })]),
  paymentController.createRechargeOrder
);

router.post(
  "/recharge/verify",
  authenticate,
  userAuth,
  validateRequest([
    body("orderId").isString().notEmpty().withMessage("Order ID is required"),
  ]),
  paymentController.verifyRecharge
);

router.post(
  "/direct/initiate",
  authenticate,
  userAuth,
  validateRequest([
    body("orderType")
      .isString()
      .notEmpty()
      .withMessage("Order type is required")
      .isIn(["event"])
      .withMessage('Order type must be "event"'),
    body("orderId").isString().notEmpty().withMessage("Order ID is required"),
  ]),
  paymentController.initiateDirectPayment
);

router.post(
  "/direct/verify",
  authenticate,
  userAuth,
  validateRequest([
    body("orderId").isString().notEmpty().withMessage("Order ID is required"),
    body("razorpayPaymentId")
      .isString()
      .notEmpty()
      .withMessage("Razorpay payment ID is required"),
    body("razorpayOrderId")
      .isString()
      .notEmpty()
      .withMessage("Razorpay order ID is required"),
    body("razorpaySignature")
      .isString()
      .notEmpty()
      .withMessage("Razorpay signature is required"),
  ]),
  paymentController.verifyDirectPayment
);

router.get(
  "/outlet/:outletId/history",
  authenticate,
  paymentController.getOutletDineInHistory
);

router.post(
  "/merchant-dinein",
  authenticate,
  validateRequest([
    body("outletId").isString().notEmpty().withMessage("Outlet ID is required"),
    body("billAmount")
      .isNumeric()
      .notEmpty()
      .withMessage("Bill amount is required"),
    body("paymentMethod")
      .optional()
      .isIn(["upi", "cash", "card"])
      .withMessage("Payment method must be one of: upi, cash, card"),
  ]),
  paymentController.merchantDineInPayment
);

export default router;
