import { Router } from 'express';
import { authenticate, userAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const paymentController = new PaymentController();

// Public membership payment routes
router.post('/membership/initiate', (req, res) => paymentController.initiateMembershipPayment(req as any, res));
router.post('/membership/verify', (req, res) => paymentController.verifyMembershipPayment(req as any, res));

/**
 * @swagger
 * components:
 *   schemas:
 *     RechargeRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           description: Amount to recharge in INR
 *           minimum: 1
 *           example: 100
 *     RechargeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: Razorpay order ID
 *               example: "order_123456789"
 *             amount:
 *               type: number
 *               description: Amount in paise
 *               example: 10000
 *             currency:
 *               type: string
 *               description: Currency code
 *               example: "INR"
 *             receipt:
 *               type: string
 *               description: Receipt ID
 *               example: "receipt_123456789"
 *             status:
 *               type: string
 *               description: Order status
 *               example: "created"
 *     VerifyRechargeRequest:
 *       type: object
 *       required:
 *         - razorpay_order_id
 *         - razorpay_payment_id
 *         - razorpay_signature
 *       properties:
 *         razorpay_order_id:
 *           type: string
 *           description: Razorpay order ID
 *           example: "order_123456789"
 *         razorpay_payment_id:
 *           type: string
 *           description: Razorpay payment ID
 *           example: "pay_123456789"
 *         razorpay_signature:
 *           type: string
 *           description: Razorpay signature for verification
 *           example: "abc123def456"
 *     VerifyRechargeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             amount:
 *               type: number
 *               description: Amount credited to wallet
 *               example: 100
 *             coins:
 *               type: number
 *               description: Updated wallet balance
 *               example: 500
 *         message:
 *           type: string
 *           example: "Wallet recharged successfully"
 */

/**
 * @swagger
 * /api/payments/unified:
 *   post:
 *     summary: Unified payment endpoint for all order types (event, dine-in, etc.) using wallet coins and/or Razorpay (hybrid payment supported)
 *     description: |
 *       Unified payment endpoint for all order types (event, dine-in, etc.).
 *       - Users can pay fully with coins, fully with Razorpay, or use a hybrid payment (part coins, part Razorpay).
 *       - For hybrid payment, specify both `coinsToUse` and `paymentMethod: 'razorpay'`. The system will deduct coins first, then create a Razorpay order for the remaining amount.
 *       - If coins cover the full amount, no Razorpay payment is needed.
 *       - If coins are used, an OTP will be sent to the user's phone number for verification.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderType:
 *                 type: string
 *                 enum: [event, dine-in]
 *                 description: Type of order (event or dine-in)
 *               orderId:
 *                 type: string
 *                 description: Order/session ID
 *               paymentMethod:
 *                 type: string
 *                 enum: [wallet, razorpay]
 *                 description: Payment method to use. Use 'razorpay' for hybrid payment.
 *               coinsToUse:
 *                 type: number
 *                 description: Number of coins to use (optional, for hybrid payment)
 *               otp:
 *                 type: string
 *                 description: OTP for verification (required if using coins)
 *     responses:
 *       200:
 *         description: Payment processed successfully or Razorpay order created for hybrid payment
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Insufficient coins
 *       404:
 *         description: User or order not found
 */
router.post(
  '/unified',
  authenticate,
  (req, res) => paymentController.processUnifiedPayment(req as any, res)
);

/**
 * @swagger
 * /api/payments/transactions:
 *   get:
 *     tags: [Payments]
 *     summary: Get user's complete transaction history
 *     description: |
 *       Retrieve all transactions for the authenticated user.
 *       This includes:
 *       - Dine-in payments
 *       - Wallet recharges
 *       - Refunds
 *       The transactions are sorted by date (newest first).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439011"
 *                       userId:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439012"
 *                       outletId:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439013"
 *                           name:
 *                             type: string
 *                             example: "Outlet Name"
 *                           businessName:
 *                             type: string
 *                             example: "My Outlet"
 *                       amount:
 *                         type: number
 *                         example: 1000
 *                       type:
 *                         type: string
 *                         enum: [recharge, dine-in, refund, membership_upgrade]
 *                         example: "dine-in"
 *                       status:
 *                         type: string
 *                         enum: [pending, completed, failed, refunded]
 *                         example: "completed"
 *                       paymentMethod:
 *                         type: string
 *                         enum: [wallet, razorpay]
 *                         example: "wallet"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-03-20T10:00:00Z"
 *       401:
 *         description: Unauthorized - User not logged in
 */
router.get(
  '/transactions',
  authenticate,
  userAuth,
  (req, res) => paymentController.getTransactionHistory(req as any, res)
);

/**
 * @swagger
 * /api/payments/transactions/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get details of a specific transaction
 *     description: |
 *       Retrieve detailed information about a specific transaction.
 *       The user can only view their own transactions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details
 *       401:
 *         description: Unauthorized - User not logged in
 *       403:
 *         description: Not authorized to view this transaction
 *       404:
 *         description: Transaction not found
 */
router.get(
  '/transactions/:id',
  authenticate,
  userAuth,
  (req, res) => paymentController.getTransactionById(req as any, res)
);

/**
 * @swagger
 * /api/payments/dine-in/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get user's dine-in payment history
 *     description: |
 *       Retrieve only dine-in related transactions for the authenticated user.
 *       This shows all past dine-in payments made by the user.
 *       The transactions are sorted by date (newest first).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of dine-in transactions
 *       401:
 *         description: Unauthorized - User not logged in
 */
router.get(
  '/dine-in/history',
  authenticate,
  userAuth,
  (req, res) => paymentController.getDineInHistory(req as any, res)
);

/**
 * @swagger
 * /api/payments/recharge:
 *   post:
 *     summary: Create wallet recharge order
 *     description: |
 *       Create a new Razorpay order for wallet recharge.
 *       The amount should be in INR (minimum ₹1).
 *       Returns Razorpay order details needed for payment processing.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RechargeRequest'
 *     responses:
 *       200:
 *         description: Recharge order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RechargeResponse'
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Unauthorized - User not authenticated
 *       503:
 *         description: Payment service not configured
 */
router.post(
  '/recharge',
  authenticate,
  userAuth,
  validateRequest([
    body('amount').isNumeric().isFloat({ min: 1 })
  ]),
  (req, res) => paymentController.createRechargeOrder(req as any, res)
);

/**
 * @swagger
 * /api/payments/recharge/verify:
 *   post:
 *     summary: Verify wallet recharge payment
 *     description: |
 *       Verify the payment and credit the amount to user's wallet.
 *       This endpoint is called by the frontend after successful payment.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID from the recharge request
 *                 example: "order_xxx"
 *     responses:
 *       200:
 *         description: Payment verified and wallet recharged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                       description: Amount credited to wallet
 *                       example: 100
 *                     coins:
 *                       type: number
 *                       description: Updated wallet balance
 *                       example: 500
 *                 message:
 *                   type: string
 *                   example: "Wallet recharged successfully"
 *       400:
 *         description: Invalid order ID or payment not found
 *       401:
 *         description: Unauthorized - User not authenticated
 *       503:
 *         description: Payment service not configured
 */
router.post(
  '/recharge/verify',
  authenticate,
  userAuth,
  validateRequest([
    body('orderId').isString().notEmpty().withMessage('Order ID is required')
  ]),
  (req, res) => paymentController.verifyRecharge(req as any, res)
);

/**
 * @swagger
 * /api/payments/direct/initiate:
 *   post:
 *     summary: Initiate direct payment for event using Razorpay
 *     description: |
 *       Initiate a direct payment using Razorpay for an event order. This endpoint is for event payments only and does not interact with the user's wallet. Registered users can also use coins via the standard payment endpoint.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderType
 *               - orderId
 *             properties:
 *               orderType:
 *                 type: string
 *                 enum: [event]
 *                 example: event
 *               orderId:
 *                 type: string
 *                 description: Event order ID
 *                 example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                       description: Event order info
 *                     payment:
 *                       type: object
 *                       description: Payment record
 *                     amount:
 *                       type: number
 *                       description: Total amount to pay
 *                     razorpayOrder:
 *                       type: object
 *                       description: Razorpay order object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       503:
 *         description: Payment service not configured
 */
router.post(
  '/direct/initiate',
  authenticate,
  userAuth,
  validateRequest([
    body('orderType').isString().notEmpty().withMessage('Order type is required').isIn(['event']).withMessage('Order type must be "event"'),
    body('orderId').isString().notEmpty().withMessage('Order ID is required')
  ]),
  (req, res) => paymentController.initiateDirectPayment(req as any, res)
);

/**
 * @swagger
 * /api/payments/direct/verify:
 *   post:
 *     summary: Verify direct payment for event
 *     description: |
 *       Verify the Razorpay payment for a direct event payment. This endpoint should be called after successful payment on Razorpay.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - razorpayPaymentId
 *               - razorpayOrderId
 *               - razorpaySignature
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Event order ID
 *                 example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *               razorpayPaymentId:
 *                 type: string
 *                 description: Razorpay payment ID
 *                 example: "pay_123456789"
 *               razorpayOrderId:
 *                 type: string
 *                 description: Razorpay order ID
 *                 example: "order_123456789"
 *               razorpaySignature:
 *                 type: string
 *                 description: Razorpay signature for verification
 *                 example: "abc123def456"
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "completed"
 *                     amount:
 *                       type: number
 *                       description: Amount paid
 *       400:
 *         description: Payment verification failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment record not found
 *       503:
 *         description: Payment service not configured
 */
router.post(
  '/direct/verify',
  authenticate,
  userAuth,
  validateRequest([
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('razorpayPaymentId').isString().notEmpty().withMessage('Razorpay payment ID is required'),
    body('razorpayOrderId').isString().notEmpty().withMessage('Razorpay order ID is required'),
    body('razorpaySignature').isString().notEmpty().withMessage('Razorpay signature is required')
  ]),
  (req, res) => paymentController.verifyDirectPayment(req as any, res)
);

/**
 * @swagger
 * /api/payments/outlet/:outletId/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get dine-in payment history for a specific outlet
 *     description: Retrieve dine-in payment history for a specific outlet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: outletId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of dine-in transactions
 *       401:
 *         description: Unauthorized - User not logged in
 */
router.get(
  '/outlet/:outletId/history',
  authenticate,
  (req, res) => paymentController.getOutletDineInHistory(req as any, res)
);

/**
 * @swagger
 * /api/payments/merchant-dinein:
 *   post:
 *     summary: Merchant-initiated dine-in payment
 *     description: |
 *       Allows a merchant (superadmin, outletadmin, or assigned employee) to process a dine-in payment for a user by phone number. The merchant enters the bill amount, splits payment between coins and cash/card, and verifies via OTP sent to the user if coins are used.
 *       Only merchants assigned to or who created the outlet can process payments for that outlet.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               outletId:
 *                 type: string
 *                 description: Outlet ID
 *               billAmount:
 *                 type: number
 *                 description: Total bill amount
 *               coinsToUse:
 *                 type: number
 *                 description: Amount to pay with coins
 *               cashAmount:
 *                 type: number
 *                 description: Amount to pay with cash/card
 *               otp:
 *                 type: string
 *                 description: OTP for verification (required if using coins)
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Payment processed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Insufficient coins
 *       403:
 *         description: Not authorized for this outlet
 *       404:
 *         description: User or outlet not found
 */
router.post('/merchant-dinein', authenticate, (req, res) => paymentController.merchantDineInPayment(req, res));

export default router; 