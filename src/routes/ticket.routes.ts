import { Router } from 'express';
import { getTicketInfo, scanTicket, getMyTickets } from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket details by ID (public)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         schema:
 *           type: string
 *         required: true
 *         description: The unique ID of the ticket
 *     responses:
 *       200:
 *         description: Ticket details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticketId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 quantity:
 *                   type: integer
 *                 issuedAt:
 *                   type: string
 *                   format: date-time
 *                 scannedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 qrCodeUrl:
 *                   type: string
 *                 event:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     venue:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         address:
 *                           type: string
 *                         capacity:
 *                           type: integer
 *                         location:
 *                           type: object
 *                           properties:
 *                             lat:
 *                               type: number
 *                             lng:
 *                               type: number
 *                     description:
 *                       type: string
 *                     coverImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                     type:
 *                       type: string
 *                     refundPolicy:
 *                       type: string
 *                     specialInstructions:
 *                       type: string
 *                 ticketTier:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     description:
 *                       type: string
 *                 user:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                 scannedBy:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                 orderId:
 *                   type: string
 *       404:
 *         description: Ticket not found
 */
router.get('/:ticketId', getTicketInfo);

/**
 * @swagger
 * /api/tickets/scan:
 *   post:
 *     summary: Scan and validate a ticket (staff only)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketId:
 *                 type: string
 *                 description: The unique ID of the ticket to scan
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Ticket validated and marked as used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 ticket:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Ticket already used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 scannedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Ticket not found
 */
router.post('/scan', authenticate, authorize('event_staff', 'event_manager', 'event_organizer'), scanTicket);

/**
 * @swagger
 * /api/tickets/my:
 *   get:
 *     summary: Get all tickets for the authenticated user
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tickets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticate, getMyTickets);

export default router; 