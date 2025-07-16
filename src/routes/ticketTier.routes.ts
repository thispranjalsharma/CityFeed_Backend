import { Router } from 'express';
import { TicketTierController } from '../controllers/ticketTier.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/auth.middleware';

const router = Router();
const ticketTierController = new TicketTierController();

/**
 * @swagger
 * /api/ticket-tiers:
 *   post:
 *     tags: [TicketTiers]
 *     summary: Create a new ticket tier for an event (event organizer or manager only)
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
 *               - name
 *               - price
 *               - quantity
 *               - order
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               name:
 *                 type: string
 *                 example: "Early Bird"
 *               price:
 *                 type: number
 *                 example: 100
 *               quantity:
 *                 type: number
 *                 example: 50
 *               description:
 *                 type: string
 *                 example: "Discounted early bird tickets"
 *               order:
 *                 type: number
 *                 example: 1
 *     responses:
 *       201:
 *         description: Ticket tier created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TicketTier'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to create ticket tiers for this event
 *       404:
 *         description: Event not found
 *       409:
 *         description: Order already exists for this event
 */
router.post('/', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => ticketTierController.createTicketTier(req, res));

/**
 * @swagger
 * /api/ticket-tiers/{eventId}:
 *   get:
 *     tags: [TicketTiers]
 *     summary: Get all ticket tiers for an event (event organizer or manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event
 *     responses:
 *       200:
 *         description: List of ticket tiers
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
 *                     $ref: '#/components/schemas/TicketTier'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to view ticket tiers for this event
 *       404:
 *         description: Event not found
 */
router.get('/:eventId', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => ticketTierController.getTicketTiers(req, res));

/**
 * @swagger
 * /api/ticket-tiers/{ticketTierId}:
 *   put:
 *     tags: [TicketTiers]
 *     summary: Update a ticket tier (event organizer or manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketTierId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the ticket tier
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Early Bird"
 *               price:
 *                 type: number
 *                 example: 120
 *               quantity:
 *                 type: number
 *                 example: 40
 *               description:
 *                 type: string
 *                 example: "Updated early bird tickets"
 *               order:
 *                 type: number
 *                 example: 2
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Ticket tier updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TicketTier'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to update ticket tiers for this event
 *       404:
 *         description: Ticket tier not found
 *       409:
 *         description: Order already exists for this event
 */
router.put('/:ticketTierId', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => ticketTierController.updateTicketTier(req, res));

/**
 * @swagger
 * /api/ticket-tiers/{ticketTierId}:
 *   delete:
 *     tags: [TicketTiers]
 *     summary: Delete a ticket tier (event organizer or manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketTierId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the ticket tier
 *     responses:
 *       200:
 *         description: Ticket tier deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Ticket tier deleted successfully"
 *       400:
 *         description: Cannot delete ticket tier with sold tickets
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to delete ticket tiers for this event
 *       404:
 *         description: Ticket tier not found
 */
router.delete('/:ticketTierId', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => ticketTierController.deleteTicketTier(req, res));

/**
 * @swagger
 * /api/ticket-tiers/bulk:
 *   post:
 *     tags: [TicketTiers]
 *     summary: Bulk create ticket tiers for an event (event organizer or manager only)
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
 *               - tiers
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               tiers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - price
 *                     - quantity
 *                     - order
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "VIP Pass"
 *                     price:
 *                       type: number
 *                       example: 100
 *                     quantity:
 *                       type: number
 *                       example: 50
 *                     description:
 *                       type: string
 *                       example: "VIP access"
 *                     order:
 *                       type: number
 *                       example: 1
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       201:
 *         description: Ticket tiers created successfully
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
 *                     $ref: '#/components/schemas/TicketTier'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to create ticket tiers for this event
 *       404:
 *         description: Event not found
 *       409:
 *         description: Order already exists for this event
 */
router.post('/bulk', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => ticketTierController.bulkCreateTicketTiers(req, res));

/**
 * @swagger
 * /api/events/{eventId}/tiers:
 *   get:
 *     tags: [TicketTiers]
 *     summary: Get an event and all its ticket tiers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event
 *     responses:
 *       200:
 *         description: Event and its ticket tiers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *                 tiers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TicketTier'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Event not found
 */
router.get('/events/:eventId/tiers', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => ticketTierController.getEventWithTiers(req, res));

export default router; 