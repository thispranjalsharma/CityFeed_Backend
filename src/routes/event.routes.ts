import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/auth.middleware';
import { eventImageUpload } from '../middleware/upload.middleware';
import { authorize } from '../middleware/auth.middleware';

const router = Router();
const eventController = new EventController();

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List and search events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by event name
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by event date (YYYY-MM-DD)
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (venue address)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by event category/type
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum ticket price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum ticket price
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
 *         description: Number of events per page
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
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
 */
router.get('/', (req, res) => eventController.listEvents(req, res));

/**
 * @swagger
 * /api/events/draft-flex:
 *   post:
 *     tags: [Events]
 *     summary: Create a draft event with optional manager (ID or details)
 *     description: >-
 *       Create a draft event by providing event name and type. Optionally, you can assign an existing manager by ID or create a new manager by providing their details. If no manager is provided, the organizer manages the event.
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
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My Event"
 *               type:
 *                 type: string
 *                 example: "Seminar"
 *               manager:
 *                 oneOf:
 *                   - type: string
 *                     description: Existing manager's user ID
 *                     example: "665f1f77bcf86cd799439099"
 *                   - type: object
 *                     description: New manager details
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Jane Doe"
 *                       email:
 *                         type: string
 *                         example: "jane@example.com"
 *                       password:
 *                         type: string
 *                         example: "Password123!"
 *                       phone:
 *                         type: string
 *                         example: "+1234567890"
 *     responses:
 *       201:
 *         description: Draft event (and manager, if created) created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 event:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "eventId"
 *                     name:
 *                       type: string
 *                       example: "My Event"
 *                     type:
 *                       type: string
 *                       example: "Seminar"
 *                     manager:
 *                       type: string
 *                       example: "665f1f77bcf86cd799439099"
 *                 manager:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "665f1f77bcf86cd799439099"
 *                     name:
 *                       type: string
 *                       example: "Jane Doe"
 *                     email:
 *                       type: string
 *                       example: "jane@example.com"
 *                     phone:
 *                       type: string
 *                       example: "+1234567890"
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Manager not found
 *       409:
 *         description: Manager email already exists
 */
router.post('/draft-flex', authenticate, (req, res) => eventController.createDraftFlex(req, res));

/**
 * @swagger
 * /api/events/{id}:
 *   patch:
 *     tags: [Events]
 *     summary: Update a draft event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial event data to update
 *           example:
 *             name: "Updated Event Name"
 *             description: "Updated event description."
 *             type: "Seminar"
 *             date: "2025-07-01"
 *             timezone: "Asia/Kolkata"
 *             startTime: "10:00"
 *             endTime: "18:00"
 *             venue:
 *               name: "Grand Hall"
 *               address: "123 Main St"
 *               capacity: 500
 *               location:
 *                 lat: 12.34
 *                 lng: 56.78
 *             saleStart: "2025-06-01T00:00:00Z"
 *             saleEnd: "2025-06-30T23:59:59Z"
 *             maxTicketsPerPerson: 4
 *             refundPolicy: "No refunds"
 *             specialInstructions: "Bring ID"
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/events/{id}/edit:
 *   put:
 *     tags: [Events]
 *     summary: Edit an event (creator, assigned manager, or cityfeed admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event to edit
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial event data to update
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Event Name"
 *               description:
 *                 type: string
 *                 example: "Updated event description."
 *               type:
 *                 type: string
 *                 example: "Seminar"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-01"
 *               timezone:
 *                 type: string
 *                 example: "Asia/Kolkata"
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "18:00"
 *               venue:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Grand Hall"
 *                   address:
 *                     type: string
 *                     example: "123 Main St"
 *                   capacity:
 *                     type: number
 *                     example: 500
 *                   location:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 12.34
 *                       lng:
 *                         type: number
 *                         example: 56.78
 *               saleStart:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-01T00:00:00Z"
 *               saleEnd:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-30T23:59:59Z"
 *               maxTicketsPerPerson:
 *                 type: number
 *                 example: 4
 *               refundPolicy:
 *                 type: string
 *                 example: "No refunds"
 *               specialInstructions:
 *                 type: string
 *                 example: "Bring ID"
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to edit this event
 *       404:
 *         description: Event not found
 */
router.put('/:id/edit', authenticate, (req, res) => eventController.editEvent(req, res));

/**
 * @swagger
 * /api/events/{id}/delete:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event (creator or cityfeed admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event to delete
 *     responses:
 *       200:
 *         description: Event deleted successfully
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
 *                   example: "Event deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to delete this event
 *       404:
 *         description: Event not found
 */
router.delete('/:id/delete', authenticate, (req, res) => eventController.deleteEvent(req, res));

router.patch('/:id', authenticate, (req, res) => eventController.updateDraft(req, res));
/**
 * @swagger
 * /api/events/my-events:
 *   get:
 *     tags: [Events]
 *     summary: Get all events created by the logged-in event organizer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/my-events', authenticate, authorize('event_organizer'), (req, res) => eventController.getMyEvents(req, res));

/**
 * @swagger
 * /api/events/my-event-staff:
 *   get:
 *     tags: [Events]
 *     summary: Get all event staff for events managed by the logged-in event manager
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event staff with event details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only event managers can access this endpoint
 */
router.get('/my-event-staff', authenticate, authorize('event_manager', 'event_staff'), (req, res) => eventController.getMyEventStaff(req, res));

/**
 * @swagger
 * /api/events/managed-events:
 *   get:
 *     tags: [Events]
 *     summary: Get all events assigned to the logged-in event manager
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/managed-events', authenticate, authorize('event_manager'), (req, res) => eventController.getMyManagedEvents(req, res));

/**
 * @swagger
 * /api/events/staff-events:
 *   get:
 *     tags: [Events]
 *     summary: Get all events assigned to the logged-in event staff
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/staff-events', authenticate, authorize('event_staff'), (req, res) => eventController.getMyStaffEvents(req, res));

/**
 * @swagger
 * /api/events/{id}/tiers:
 *   get:
 *     summary: Get ticket tiers for an event (with real-time availability)
 *     description: Returns all ticket tiers for the specified event, including name, price, quantity, description, order, isActive, and available quantity (quantity - soldCount).
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event
 *     responses:
 *       200:
 *         description: List of ticket tiers for the event
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TicketTier'
 *       404:
 *         description: Event not found
 */
router.get('/:id/tiers', (req, res) => eventController.getEventTiers(req, res));

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get public event details by ID
 *     description: >-
 *       Retrieve full event details by ID. This endpoint is public and returns all event information, including ticket tiers if available.
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event to retrieve
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 */
router.get('/:id', (req, res) => eventController.getEventById(req, res));

/**
 * @swagger
 * /api/events/{id}/cover-images:
 *   patch:
 *     tags: [Events]
 *     summary: Upload or update cover images for an event
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               coverImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Upload 1 to 3 cover images."
 *                 minItems: 1
 *                 maxItems: 3
 *     responses:
 *       200:
 *         description: Cover images updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/cover-images', authenticate, eventImageUpload, (req, res) => eventController.updateCoverImages(req, res));

/**
 * @swagger
 * /api/events/{id}/publish:
 *   post:
 *     tags: [Events]
 *     summary: Publish a draft event (only creator or assigned manager)
 *     description: "Only the event creator or the assigned manager can publish the draft event."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Event published successfully"
 *       400:
 *         description: "Missing required fields or invalid data"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden: Not allowed to publish this event"
 *       404:
 *         description: "Draft event not found"
 */
router.post('/:id/publish', authenticate, (req, res) => eventController.publishEvent(req, res));

/**
 * @swagger
 * /api/events/{eventId}/staff:
 *   post:
 *     tags: [EventStaff]
 *     summary: Create event staff for a specific event (event manager or organizer only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event
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
 *               - responsibilities
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
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["approve_entry", "scan_qr_code"]
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
router.post('/:eventId/staff', authenticate, authorize('event_manager', 'event_organizer'), (req, res) => {
  req.body.eventId = req.params.eventId;
  return eventController.createEventStaff(req, res);
});

/**
 * @swagger
 * /api/events/staff/{staffId}/activate:
 *   patch:
 *     tags: [EventStaff]
 *     summary: Activate an event staff member (event organizer or manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event staff
 *     responses:
 *       200:
 *         description: Event staff activated
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
 *                   example: "Event staff activated."
 *                 data:
 *                   $ref: '#/components/schemas/EventStaff'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event staff or event not found
 */
router.patch('/staff/:staffId/activate', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => eventController.activateEventStaff(req, res));

/**
 * @swagger
 * /api/events/staff/{staffId}/deactivate:
 *   patch:
 *     tags: [EventStaff]
 *     summary: Deactivate an event staff member (event organizer or manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event staff
 *     responses:
 *       200:
 *         description: Event staff deactivated
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
 *                   example: "Event staff deactivated."
 *                 data:
 *                   $ref: '#/components/schemas/EventStaff'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event staff or event not found
 */
router.patch('/staff/:staffId/deactivate', authenticate, authorize('event_organizer', 'event_manager'), (req, res) => eventController.deactivateEventStaff(req, res));

export default router; 