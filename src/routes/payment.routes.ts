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
 *       Allows a merchant (superadmin, outletadmin, or assigned employee) to process a dine-in payment for a user by phone number. The merchant enters the bill amount, splits payment between coins and cash/card, and verifies via OTP sent to the user's phone and email if coins are used.
 *       After successful payment, a DineInSession is created and linked to the payment. The user will receive an email with a summary and a link to submit a review for this dine-in session.
 *       Only merchants assigned to or who created the outlet can process payments for that outlet.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outletId
 *               - billAmount
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (required if phone or qrCodeData not provided)
 *               phone:
 *                 type: string
 *                 description: User's phone number (required if userId or qrCodeData not provided)
 *               qrCodeData:
 *                 type: string
 *                 description: QR code data string (required if userId or phone not provided)
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [upi, cash, card]
 *                 description: Payment method used for non-coin portion (optional)
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
 *                 payment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     outletId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     coinsUsed:
 *                       type: number
 *                     cashAmount:
 *                       type: number
 *                     nonCoinPaymentMethod:
 *                       type: string
 *                     type:
 *                       type: string
 *                     status:
 *                       type: string
 *                     dineInSessionId:
 *                       type: string
 *                       description: ID of the created DineInSession for review
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