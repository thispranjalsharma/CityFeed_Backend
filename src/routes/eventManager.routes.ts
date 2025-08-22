import { Router } from 'express';
import { EventManagerController } from '../controllers/eventManager.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const eventManagerController = new EventManagerController();

/**
 * @swagger
 * /api/event-managers:
 *   post:
 *     tags: [EventManagers]
 *     summary: Create a new event manager (event organizer only)
 *     description: Create a new event manager. Email and phone number must be unique across all event managers.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the event manager
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address (must be unique)
 *                 example: "manager@example.com"
 *               password:
 *                 type: string
 *                 description: Password (min 8 chars, 1 special char, 1 lowercase, 1 digit)
 *                 example: "Password123!"
 *               phone:
 *                 type: string
 *                 description: Phone number (must be exactly 10 digits and unique)
 *                 example: "1234567890"
 *     responses:
 *       201:
 *         description: Event manager created
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
 *                     _id:
 *                       type: string
 *                       example: "665f1f77bcf86cd799439099"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "manager@example.com"
 *                     phone:
 *                       type: string
 *                       example: "1234567890"
 *                     role:
 *                       type: string
 *                       example: "event_manager"
 *       400:
 *         description: Missing or invalid fields
 *       409:
 *         description: Email or phone number already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, authorize('event_organizer'), (req, res) => eventManagerController.createEventManager(req, res));

/**
 * @swagger
 * /api/event-managers/profile:
 *   get:
 *     tags: [EventManagers]
 *     summary: Get event manager profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         description: Unauthorized
 *   put:
 *     tags: [EventManagers]
 *     summary: Update event manager profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 *   delete:
 *     tags: [EventManagers]
 *     summary: Delete event manager profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 *       401:
 *         description: Unauthorized
 */
router.route('/profile')
  .get(authenticate, authorize('event_manager'), (req, res) => eventManagerController.getProfile(req, res))
  .put(authenticate, authorize('event_manager'), (req, res) => eventManagerController.updateProfile(req, res))
  .delete(authenticate, authorize('event_manager'), (req, res) => eventManagerController.deleteProfile(req, res));

/**
 * @swagger
 * /api/event-managers/dashboard:
 *   get:
 *     tags: [EventManagers]
 *     summary: Get dashboard metrics for event manager
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', authenticate, authorize('event_manager'), (req, res) => eventManagerController.getDashboardData(req, res));

/**
 * @swagger
 * /api/event-managers/{managerId}/activate:
 *   patch:
 *     tags: [EventManagers]
 *     summary: Activate an event manager (event organizer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event manager
 *     responses:
 *       200:
 *         description: Event manager activated
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
 *                   example: "Event manager activated."
 *                 data:
 *                   $ref: '#/components/schemas/EventManager'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event manager not found
 */
router.patch('/:managerId/activate', authenticate, authorize('event_organizer'), (req, res) => eventManagerController.activateEventManager(req, res));

/**
 * @swagger
 * /api/event-managers/{managerId}/deactivate:
 *   patch:
 *     tags: [EventManagers]
 *     summary: Deactivate an event manager (event organizer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event manager
 *     responses:
 *       200:
 *         description: Event manager deactivated
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
 *                   example: "Event manager deactivated."
 *                 data:
 *                   $ref: '#/components/schemas/EventManager'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event manager not found
 */
router.patch('/:managerId/deactivate', authenticate, authorize('event_organizer'), (req, res) => eventManagerController.deactivateEventManager(req, res));

/**
 * @swagger
 * /api/event-managers/events/{eventId}/ticket-bookings:
 *   get:
 *     summary: Get ticket bookings with user details for a managed event
 *     description: Retrieve all ticket bookings for an event managed by the authenticated event manager with detailed user information.
 *     tags: [EventManagers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event
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
 *         description: Number of tickets per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, used, invalidated, refunded]
 *         description: Filter tickets by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by name, email, or phone
 *     responses:
 *       200:
 *         description: Ticket bookings retrieved successfully
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
 *                     event:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         date:
 *                           type: string
 *                           format: date-time
 *                         startTime:
 *                           type: string
 *                         endTime:
 *                           type: string
 *                         venue:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             address:
 *                               type: string
 *                             capacity:
 *                               type: integer
 *                     tickets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ticketId:
 *                             type: string
 *                           orderId:
 *                             type: string
 *                           status:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           issuedAt:
 *                             type: string
 *                             format: date-time
 *                           scannedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           qrCodeUrl:
 *                             type: string
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                               membershipType:
 *                                 type: string
 *                               membershipExpiryDate:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               profilePicture:
 *                                 type: string
 *                                 nullable: true
 *                               address:
 *                                 type: object
 *                                 nullable: true
 *                           ticketTier:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                               description:
 *                                 type: string
 *                           scannedBy:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         used:
 *                           type: integer
 *                         invalidated:
 *                           type: integer
 *                         totalQuantity:
 *                           type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Event manager can only access events they manage
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/events/:eventId/ticket-bookings', authenticate, authorize('event_manager'), (req, res) => eventManagerController.getManagedEventTicketBookings(req, res));

// Removed /event-managers/event-staff endpoint; use /api/events/:eventId/staff instead.

export default router; 