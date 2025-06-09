import { Router } from 'express';
import { authenticate, userAuth, merchantAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const paymentController = new PaymentController();

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
 *     tags: [Payments]
 *     summary: Get merchant's dine-in payment history
 *     description: |
 *       Retrieve all dine-in transactions for the authenticated merchant.
 *       This shows all dine-in payments received by the merchant.
 *       The transactions are sorted by date (newest first).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of merchant's dine-in transactions
 *       401:
 *         description: Unauthorized - Merchant not logged in
 */
router.get(
  '/merchant/history',
  authenticate,
  merchantAuth,
  paymentController.getMerchantDineInHistory
);

/**
 * @swagger
 * /api/payments/recharge:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate wallet recharge
 *     description: Create a new wallet recharge order
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/recharge',
  authenticate,
  userAuth,
  validateRequest([
    body('amount').isNumeric()
  ]),
  paymentController.createRechargeOrder
);

/**
 * @swagger
 * /api/payments/verify-recharge:
 *   post:
 *     tags: [Payments]
 *     summary: Verify wallet recharge payment
 *     description: Verify and process a wallet recharge payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyRechargeRequest'
 *     responses:
 *       200:
 *         description: Recharge verified and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     coinsAdded:
 *                       type: number
 *                     newBalance:
 *                       type: number
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid payment data
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/verify-recharge',
  authenticate,
  userAuth,
  validateRequest([
    body('paymentId').isString().notEmpty(),
    body('razorpay_order_id').isString().notEmpty(),
    body('razorpay_payment_id').isString().notEmpty(),
    body('razorpay_signature').isString().notEmpty()
  ]),
  paymentController.verifyRecharge
);

export default router; 