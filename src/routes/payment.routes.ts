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
 * /api/payments:
 *   post:
 *     summary: Process payment for any order type (event, dine-in, etc.)
 *     description: |
 *       Unified payment endpoint for all order types (event, dine-in, etc.) using wallet coins and/or reward points.
 *       For dine-in, this is equivalent to /api/payments/dine-in. For event, it processes event order payment.
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
 *               - paymentMethod
 *             properties:
 *               orderType:
 *                 type: string
 *                 enum: [event, dine-in]
 *                 example: event
 *               orderId:
 *                 type: string
 *                 example: 64e1c2f1a2b3c4d5e6f7a8b9
 *               paymentMethod:
 *                 type: string
 *                 enum: [wallet, rewardPoints]
 *                 example: wallet
 *               rewardPointsToUse:
 *                 type: number
 *                 description: Number of reward points to use (optional, for rewardPoints method)
 *               otp:
 *                 type: string
 *                 description: OTP for reward points verification (optional)
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Insufficient balance
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.post(
  '/',
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
 *     summary: Initiate direct payment
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
 *               - outletId
 *               - offerId
 *               - totalBill
 *             properties:
 *               outletId:
 *                 type: string
 *                 description: ID of the outlet
 *               offerId:
 *                 type: string
 *                 description: ID of the offer being used
 *               totalBill:
 *                 type: number
 *                 description: Total bill amount
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Payment service not configured
 */
router.post(
  '/direct/initiate',
  authenticate,
  userAuth,
  validateRequest([
    body('outletId').isString().notEmpty(),
    body('offerId').isString().notEmpty(),
    body('totalBill').isNumeric()
  ]),
  (req, res) => paymentController.initiateDirectPayment(req as any, res)
);

/**
 * @swagger
 * /api/payments/direct/verify:
 *   post:
 *     summary: Verify direct payment
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
 *                 description: Razorpay order ID
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Payment not completed or invalid
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
    body('orderId').isString().notEmpty()
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

export default router; 