import { Router } from 'express';
import { authenticate, userAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { authorizeRoles } from '../middleware/authorizeRoles.middleware';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const paymentController = new PaymentController();

// Public membership payment routes
router.post('/membership/initiate', (req, res) => paymentController.initiateMembershipPayment(req as any, res));
router.post('/membership/verify', (req, res) => paymentController.verifyMembershipPayment(req as any, res));

/**
 * @swagger
 * /api/payments/scan-qr:
 *   post:
 *     summary: Get user details by userId for payment
 *     description: |
 *       Get user details using userId for payment processing.
 *       This endpoint is used by merchants to verify user identity before processing payment.
 *       **Authorization Required:** Only super admin, outlet admin, and employee roles can access this endpoint.
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to get details for
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QRCodeScanResponse'
 *       400:
 *         description: User ID is required
 *       401:
 *         description: Unauthorized - No user role found
 *       403:
 *         description: Forbidden - Insufficient permissions. Only super admin, outlet admin, and employee can access this endpoint.
 *       404:
 *         description: User not found
 */
router.post(
  '/scan-qr',
  authenticate,
  authorizeRoles(['super_admin', 'outlet_admin', 'employee']),
  validateRequest([
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('User ID must be a string')
  ]),
  (req, res) => paymentController.scanQRCode(req as any, res)
);

/**
 * @swagger
 * /api/payments/get-qr-data:
 *   get:
 *     summary: Get QR code data for a user (for testing purposes)
 *     description: |
 *       Get the QR code data for a specific user. This is for testing purposes
 *       to get the QR code text that should be scanned by merchants.
 *       **Authorization Required:** Only super admin, outlet admin, and employee roles can access this endpoint.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get QR code data for
 *     responses:
 *       200:
 *         description: QR code data retrieved successfully
 *       400:
 *         description: User ID is required
 *       401:
 *         description: Unauthorized - No user role found
 *       403:
 *         description: Forbidden - Insufficient permissions. Only super admin, outlet admin, and employee can access this endpoint.
 *       404:
 *         description: User not found
 */
router.get('/get-qr-data', authenticate, authorizeRoles(['super_admin', 'outlet_admin', 'employee']), (req, res) => paymentController.getQRCodeData(req as any, res));

/**
 * @swagger
 * components:
 *   schemas:
 *     MerchantDineInRequest:
 *       type: object
 *       required:
 *         - outletId
 *         - billAmount
 *         - maxDiscountPercentage
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID (required if phone or qrCodeData not provided)
 *           example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *         phone:
 *           type: string
 *           description: User's phone number (required if userId or qrCodeData not provided)
 *           example: "9999999999"
 *         qrCodeData:
 *           type: string
 *           description: QR code data string (required if userId or phone not provided)
 *           example: "user_64e1c2f1a2b3c4d5e6f7a8b9_outlet_123456789"
 *         outletId:
 *           type: string
 *           description: Outlet ID where the dine-in occurred
 *           example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *         billAmount:
 *           type: number
 *           description: Total bill amount in INR
 *           minimum: 1
 *           example: 1000
 *         maxDiscountPercentage:
 *           type: number
 *           description: Maximum discount percentage from active offers (must match outlet's active offer)
 *           minimum: 0
 *           maximum: 100
 *           example: 10
 *         coinsToUse:
 *           type: number
 *           description: Amount to pay with user's wallet coins (optional)
 *           minimum: 0
 *           example: 200
 *         cashAmount:
 *           type: number
 *           description: Amount to pay with cash/card (optional)
 *           minimum: 0
 *           example: 800
 *         paymentMethod:
 *           type: string
 *           enum: [upi, cash, card]
 *           description: Payment method used for non-coin portion (required if cashAmount > 0)
 *           example: "cash"
 *         otp:
 *           type: string
 *           description: OTP for verification (required if coinsToUse > 0)
 *           example: "123456"
 *     MerchantDineInSuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               example: "success"
 *             message:
 *               type: string
 *               example: "Payment processed successfully"
 *             payment:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *                 userId:
 *                   type: string
 *                   example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *                 outletId:
 *                   type: string
 *                   example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *                 amount:
 *                   type: number
 *                   example: 1000
 *                 coinsUsed:
 *                   type: number
 *                   example: 200
 *                 cashAmount:
 *                   type: number
 *                   example: 800
 *                 nonCoinPaymentMethod:
 *                   type: string
 *                   example: "cash"
 *                 type:
 *                   type: string
 *                   example: "dine-in"
 *                 status:
 *                   type: string
 *                   example: "completed"
 *                 dineInSessionId:
 *                   type: string
 *                   description: ID of the created DineInSession for review
 *                   example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *     MerchantDineInOTPResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               example: "otp_required"
 *             message:
 *               type: string
 *               example: "OTP sent to user phone and email"
 *             user:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *                 name:
 *                   type: string
 *                   example: "John Doe"
 *                 phone:
 *                   type: string
 *                   example: "9999999999"
 *                 coins:
 *                   type: number
 *                   example: 1000
 *                 membershipType:
 *                   type: string
 *                   example: "cityfeed_prime"
 *                 isActive:
 *                   type: boolean
 *                   example: true
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
 *       - Dine-in payments (with reward details)
 *       - Event payments (with discount and pricing details)
 *       - Wallet recharges
 *       - Refunds
 *       The transactions are sorted by date (newest first).
 *       For dine-in transactions, comprehensive details include reward points earned/redeemed, 
 *       total coins before/after, original bill amount, and final coins with rewards.
 *       For event transactions, pricing details include original amount, discount, and final amount.
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
 *                         enum: [recharge, dine-in, refund, membership_purchase, event, reward]
 *                         example: "dine-in"
 *                         description: "Transaction type - includes both payment and reward transactions"
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
 *                       dineInSessionId:
 *                         type: string
 *                         description: ID of the dine-in session (for dine-in transactions)
 *                         example: "507f1f77bcf86cd799439014"
 *                       transactionType:
 *                         type: string
 *                         enum: [payment, reward]
 *                         description: "Distinguishes between payment and reward transactions"
 *                         example: "payment"
 *                       originalType:
 *                         type: string
 *                         description: "Original transaction type (for payment transactions)"
 *                         example: "dine-in"
 *                       rewardDetails:
 *                         type: array
 *                         description: Reward details for dine-in transactions
 *                         items:
 *                           type: object
 *                           properties:
 *                             transactionType:
 *                               type: string
 *                               enum: [earned, redeemed, refund, adjustment]
 *                               example: "earned"
 *                             amount:
 *                               type: number
 *                               description: Reward points amount
 *                               example: 50
 *                             description:
 *                               type: string
 *                               description: Description of the reward transaction
 *                               example: "Earned 50 reward points from dine-in payment"
 *                             balanceAfter:
 *                               type: number
 *                               description: Balance after the reward transaction
 *                               example: 150
 *                             balanceBefore:
 *                               type: number
 *                               description: Balance before the reward transaction
 *                               example: 100
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                               example: "2024-03-20T10:00:00Z"
 *                       dineInDetails:
 *                         type: object
 *                         description: Additional dine-in transaction details
 *                         properties:
 *                           totalCoins:
 *                             type: number
 *                             description: User's total coins before the dine-in transaction
 *                             example: 500
 *                           totalBill:
 *                             type: number
 *                             description: Original bill amount before any discounts
 *                             example: 200
 *                           coinsAfterDineIn:
 *                             type: number
 *                             description: Coins remaining after the dine-in payment (before rewards)
 *                             example: 300
 *                           finalCoinsWithRewards:
 *                             type: number
 *                             description: Final coins after adding rewards earned from dine-in (includes all rewards)
 *                             example: 316
 *                       eventDetails:
 *                         type: object
 *                         description: Event details for event transactions
 *                         properties:
 *                           originalAmount:
 *                             type: number
 *                             description: Original ticket amount before discount
 *                             example: 1000
 *                           discountAmount:
 *                             type: number
 *                             description: Discount amount applied
 *                             example: 150
 *                           finalAmount:
 *                             type: number
 *                             description: Final amount after discount
 *                             example: 850
 *                           discountPercentage:
 *                             type: number
 *                             description: Discount percentage applied
 *                             example: 15
 *                           membershipType:
 *                             type: string
 *                             description: User's membership type
 *                             example: "cityfeed_prime"
 *                           balanceBefore:
 *                             type: number
 *                             description: User's wallet balance before the transaction (for wallet payments, this shows balance before deduction)
 *                             example: 5000
 *                           balanceAfter:
 *                             type: number
 *                             description: User's wallet balance after the transaction (for wallet payments, this shows balance after deduction)
 *                             example: 3000
 *                       ticketDetails:
 *                         type: array
 *                         description: Ticket details for event transactions
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               description: Unique ticket ID
 *                               example: "507f1f77bcf86cd799439011"
 *                             ticketTierName:
 *                               type: string
 *                               description: Name of the ticket tier or "General Admission" if no tier
 *                               example: "VIP Pass"
 *                             quantity:
 *                               type: number
 *                               description: Number of tickets in this tier
 *                               example: 2
 *                             status:
 *                               type: string
 *                               enum: [active, used, invalidated, refunded]
 *                               description: Current status of the ticket
 *                               example: "active"
 *                             qrCodeUrl:
 *                               type: string
 *                               description: URL to the QR code image for the ticket
 *                               example: "https://res.cloudinary.com/example/image/upload/tickets/qr123.png"
 *                             issuedAt:
 *                               type: string
 *                               format: date-time
 *                               description: When the ticket was issued
 *                               example: "2024-03-20T10:00:00Z"
 *                             scannedAt:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                               description: When the ticket was scanned (null if not scanned)
 *                               example: "2024-03-20T15:30:00Z"
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
 *     summary: Merchant-initiated dine-in payment (Optimized)
 *     description: |
 *       High-performance merchant dine-in payment processing. Allows a merchant (superadmin, outletadmin, or assigned employee) to process a dine-in payment for a user by phone number, QR code, or user ID.
 *       
 *       **Performance Optimizations:**
 *       - Parallel database queries for faster execution
 *       - Background processing for email and PDF generation
 *       - Optimized offer fetching with database-level filtering
 *       - Enhanced database indexes for better query performance
 *       
 *       **Payment Flow:**
 *       1. Merchant identifies user (phone/QR code/user ID)
 *       2. Enters bill amount and payment split (coins + cash/card)
 *       3. If coins are used, OTP verification is required
 *       4. Payment is processed and DineInSession is created
 *       5. User receives email summary with review link
 *       6. Reward points are calculated and added in background
 *       
 *       **Authorization:**
 *       - Super admin: Can process payments for outlets they created
 *       - Outlet admin: Can process payments for assigned outlets
 *       - Staff/Employee: Can process payments for assigned outlets
 *       
 *       **Expected Response Time:** 1-3 seconds (70-80% faster than before)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MerchantDineInRequest'
 *     responses:
 *       200:
 *         description: Payment processed successfully or OTP required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/MerchantDineInSuccessResponse'
 *                 - $ref: '#/components/schemas/MerchantDineInOTPResponse'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Either phone, qrCodeData, or userId, outletId, and billAmount are required"
 *       401:
 *         description: Unauthorized - invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       402:
 *         description: Insufficient coins - user doesn't have enough coins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient coins"
 *       403:
 *         description: Not authorized for this outlet - merchant doesn't have permission
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You are not authorized to process payment for this outlet."
 *       404:
 *         description: User or outlet not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post(
  '/merchant-dinein',
  authenticate,
  validateRequest([
    body('outletId').isString().notEmpty().withMessage('Outlet ID is required'),
    body('billAmount').isNumeric().notEmpty().withMessage('Bill amount is required'),
    body('paymentMethod').optional().isIn(['upi', 'cash', 'card']).withMessage('Payment method must be one of: upi, cash, card'),
    // phone and qrCodeData are optional - validation handled in controller
    // coinsToUse, cashAmount, otp are optional/conditional
  ]),
  (req, res) => paymentController.merchantDineInPayment(req, res)
);

export default router; 