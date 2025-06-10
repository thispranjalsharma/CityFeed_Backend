import { Router } from 'express';
import { authenticate, userAuth, merchantAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const paymentController = new PaymentController();

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
 * /api/payments/dine-in:
 *   post:
 *     tags: [Payments]
 *     summary: Process dine-in payment using wallet coins
 *     description: |
 *       Process payment for a dine-in session using the user's wallet coins.
 *       This endpoint is used when a user wants to pay for their dine-in meal using their wallet coins.
 *       The system will check if the user has sufficient coins before processing the payment.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - offerId
 *               - totalBill
 *             properties:
 *               merchantId:
 *                 type: string
 *                 description: ID of the restaurant where the user is dining
 *               offerId:
 *                 type: string
 *                 description: ID of the offer being used for this dine-in
 *               totalBill:
 *                 type: number
 *                 description: Total bill amount in coins
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - User not logged in
 *       402:
 *         description: Insufficient coins in wallet
 */
router.post(
  '/dine-in',
  authenticate,
  userAuth,
  validateRequest([
    body('merchantId').isString().notEmpty(),
    body('offerId').isString().notEmpty(),
    body('totalBill').isNumeric()
  ]),
  paymentController.processDineInPayment
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
 *       401:
 *         description: Unauthorized - User not logged in
 */
router.get(
  '/transactions',
  authenticate,
  userAuth,
  paymentController.getTransactionHistory
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
  paymentController.getTransactionById
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
  paymentController.getDineInHistory
);

/**
 * @swagger
 * /api/payments/merchant/history:
 *   get:
 *     summary: Get merchant's dine-in history
 *     description: Retrieve all dine-in transactions for the authenticated merchant
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of dine-in transactions
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
 *                     $ref: '#/components/schemas/DineInPayment'
 *       401:
 *         description: Unauthorized - Merchant not authenticated
 *       403:
 *         description: Forbidden - User is not a merchant
 */
router.get('/merchant/history', authenticate, merchantAuth, paymentController.getMerchantDineInHistory);

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
  paymentController.createRechargeOrder
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
  paymentController.verifyRecharge
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
 *               - merchantId
 *               - offerId
 *               - totalBill
 *             properties:
 *               merchantId:
 *                 type: string
 *                 description: ID of the merchant
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
    body('merchantId').isString().notEmpty(),
    body('offerId').isString().notEmpty(),
    body('totalBill').isNumeric()
  ]),
  paymentController.initiateDirectPayment
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
  paymentController.verifyDirectPayment
);

export default router; 