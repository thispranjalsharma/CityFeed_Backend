import { Router } from 'express';
import { EventStaffController } from '../controllers/eventStaff.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new EventStaffController();

/**
 * @swagger
 * /api/event-staff:
 *   post:
 *     tags: [EventStaff]
 *     summary: Create event staff (no event assignment)
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
 *                 example: "Jane Staff"
 *               email:
 *                 type: string
 *                 example: "janestaff@example.com"
 *               password:
 *                 type: string
 *                 example: "Password123!"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Event staff created
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
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     createdBy:
 *                       type: string
 *                       description: "ID of the user (organizer or manager) who created this staff"
 *       400:
 *         description: Missing or invalid fields
 *       409:
 *         description: Email already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, (req, res) => controller.createEventStaffOnly(req, res));

/**
 * @swagger
 * /api/event-staff/assign-to-event:
 *   post:
 *     tags: [EventStaff]
 *     summary: Assign event staff to event
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
 *               - eventStaffId
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *               eventStaffId:
 *                 type: string
 *                 example: "64e1c2f1a2b3c4d5e6f7a8b9"
 *     responses:
 *       200:
 *         description: Event staff assigned
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
 *       400:
 *         description: Missing or invalid fields
 *       404:
 *         description: Event or staff not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/assign-to-event', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => controller.assignEventStaffToEvent(req, res));

/**
 * @swagger
 * /api/event-staff/dashboard:
 *   get:
 *     tags: [EventStaff]
 *     summary: Get dashboard metrics for event staff
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
router.get('/dashboard', authenticate, authorize('event_staff'), (req, res) => controller.getDashboardData(req, res));

/**
 * @swagger
 * /api/event-staff/profile:
 *   get:
 *     tags: [EventStaff]
 *     summary: Get event staff profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         description: Unauthorized
 *   put:
 *     tags: [EventStaff]
 *     summary: Update event staff profile
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
 *     tags: [EventStaff]
 *     summary: Delete event staff profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 *       401:
 *         description: Unauthorized
 */
router.route('/profile')
  .get(authenticate, authorize('event_staff'), (req, res) => controller.getProfile(req, res))
  .put(authenticate, authorize('event_staff'), (req, res) => controller.updateProfile(req, res))
  .delete(authenticate, authorize('event_staff'), (req, res) => controller.deleteEventStaffProfile(req, res));

/**
 * @swagger
 * /api/event-staff/events/{eventId}/ticket-bookings:
 *   get:
 *     summary: Get ticket bookings with user details for an assigned event
 *     description: Retrieve all ticket bookings for an event assigned to the authenticated event staff with detailed user information.
 *     tags: [EventStaff]
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
 *         description: Forbidden - Event staff can only access events they are assigned to
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/events/:eventId/ticket-bookings', authenticate, authorize('event_staff'), (req, res) => controller.getAssignedEventTicketBookings(req, res));

export default router; 