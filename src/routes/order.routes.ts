import { Router } from 'express';
import { OrderController, resendOrderTickets } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const orderController = new OrderController();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a ticket order (start purchase)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - tickets
 *             properties:
 *               eventId:
 *                 type: string
 *               tickets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - ticketTierId
 *                     - quantity
 *                   properties:
 *                     ticketTierId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *           example:
 *             eventId: "68710229866eb564d6a73174"
 *             tickets:
 *               - ticketTierId: "64f1a2b3c4d5e6f7a8b9c0d1"
 *                 quantity: 2
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid input or insufficient tickets
 *       401:
 *         description: Unauthorized - A valid bearer token is required
 *       404:
 *         description: Event or ticket tier not found
 */
router.post('/', authenticate, (req, res) => orderController.createOrder(req, res));

/**
 * @swagger
 * /api/orders/pay-with-coins:
 *   post:
 *     summary: Pay for an order using wallet coins
 *     tags: [Orders]
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
 *           example:
 *             orderId: "64f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       200:
 *         description: Payment successful
 *       400:
 *         description: Invalid order or already paid
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Insufficient coins in wallet
 *       403:
 *         description: Forbidden - Not your order
 *       404:
 *         description: Order not found
 */
router.post('/pay-with-coins', authenticate, (req, res) => orderController.payWithCoins(req, res));

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Get all orders for the authenticated user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter orders by status (e.g., 'paid', 'pending')
 *     responses:
 *       200:
 *         description: List of user's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticate, (req, res) => orderController.getMyOrders(req, res));

/**
 * @swagger
 * /api/orders/{orderId}/resend-tickets:
 *   post:
 *     summary: Resend tickets for an order (invalidate old QR codes)
 *     description: |
 *       Resends tickets for the given order. All previous tickets are invalidated and new QR codes are generated and emailed to the user. Only the latest QR codes are valid for event entry.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to resend tickets for.
 *     responses:
 *       200:
 *         description: Tickets resent successfully. The response includes the new tickets and QR code URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 tickets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       ticketTierId:
 *                         type: string
 *                       ticketTierName:
 *                         type: string
 *                       qrCodeUrl:
 *                         type: string
 *                         description: Cloudinary URL for the new QR code image
 *                       status:
 *                         type: string
 *                       issuedAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid order or already resent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your order
 *       404:
 *         description: Order not found
 */
router.post('/:orderId/resend-tickets', authenticate, resendOrderTickets);

/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   post:
 *     summary: Request cancellation/refund for an order (instant refund)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to cancel
 *     responses:
 *       200:
 *         description: Order refunded, tickets cancelled, and coins returned to user.
 *       400:
 *         description: Already cancelled or refunded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.post('/:orderId/cancel', authenticate, (req, res) => orderController.requestOrderCancellation(req, res));

export default router; 