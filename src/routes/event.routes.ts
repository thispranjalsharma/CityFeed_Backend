import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/auth.middleware';
import { eventImageUpload } from '../middleware/upload.middleware';
import { authorize } from '../middleware/auth.middleware';
import { EventStaffController } from '../controllers/eventStaff.controller';

const router = Router();
const eventController = new EventController();
const eventStaffController = new EventStaffController();

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
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Filter for upcoming events only (true/false)
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
 *     description: Update a draft event with partial data. All fields are optional and only provided fields will be updated.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the draft event to update
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
 *                 description: Event name
 *                 example: "Updated Event Name"
 *               description:
 *                 type: string
 *                 description: Event description
 *                 example: "Updated event description."
 *               type:
 *                 type: string
 *                 description: Event type/category
 *                 example: "Seminar"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Event date (for single-day events)
 *                 example: "2025-07-01"
 *               startEventDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for multi-day events
 *                 example: "2025-07-01"
 *               endEventDate:
 *                 type: string
 *                 format: date
 *                 description: End date for multi-day events
 *                 example: "2025-07-03"
 *               startTime:
 *                 type: string
 *                 description: Event start time (24-hour format)
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 description: Event end time (24-hour format)
 *                 example: "18:00"
 *               venue:
 *                 type: object
 *                 description: Venue information
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Venue name
 *                     example: "Grand Hall"
 *                   address:
 *                     type: string
 *                     description: Venue address
 *                     example: "123 Main St"
 *                   capacity:
 *                     type: number
 *                     description: Venue capacity
 *                     example: 500
 *                   location:
 *                     type: object
 *                     description: Venue coordinates
 *                     properties:
 *                       lat:
 *                         type: number
 *                         description: Latitude
 *                         example: 12.34
 *                       lng:
 *                         type: number
 *                         description: Longitude
 *                         example: 56.78
 *               saleStart:
 *                 type: string
 *                 format: date-time
 *                 description: When ticket sales begin
 *                 example: "2025-06-01T00:00:00Z"
 *               saleEnd:
 *                 type: string
 *                 format: date-time
 *                 description: When ticket sales end
 *                 example: "2025-06-30T23:59:59Z"
 *               maxTicketsPerPerson:
 *                 type: number
 *                 description: Maximum number of tickets one person can purchase
 *                 minimum: 1
 *                 example: 4
 *               refundPolicy:
 *                 type: string
 *                 description: Event refund policy
 *                 example: "No refunds"
 *               specialInstructions:
 *                 type: string
 *                 description: Special instructions for attendees
 *                 example: "Bring ID"
 *               coverImages:
 *                 type: array
 *                 description: Array of cover image URLs (1-3 images)
 *                 items:
 *                   type: string
 *                   format: uri
 *                 minItems: 1
 *                 maxItems: 3
 *                 example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *               ticketPrice:
 *                 type: number
 *                 description: Default ticket price (if no tiers specified)
 *                 minimum: 0
 *                 example: 100
 *               ticketTiers:
 *                 type: array
 *                 description: List of ticket tiers with different prices and quantities
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Tier name
 *                       example: "VIP"
 *                     price:
 *                       type: number
 *                       description: Tier price
 *                       minimum: 0
 *                       example: 200
 *                     quantity:
 *                       type: number
 *                       description: Available tickets for this tier
 *                       minimum: 1
 *                       example: 50
 *                     description:
 *                       type: string
 *                       description: Tier description
 *                       example: "VIP access with premium seating"
 *                     order:
 *                       type: number
 *                       description: Display order for the tier
 *                       minimum: 1
 *                       example: 1
 *                     isActive:
 *                       type: boolean
 *                       description: Whether this tier is available for purchase
 *                       example: true
 *               managerId:
 *                 type: string
 *                 description: ID of the assigned event manager
 *                 example: "665f1f77bcf86cd799439099"
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
 *       404:
 *         description: Event not found
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
 *               ticketTiers:
 *                 type: array
 *                 description: List of ticket tiers for the event
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "VIP"
 *                     price:
 *                       type: number
 *                       example: 200
 *                     quantity:
 *                       type: number
 *                       example: 50
 *                     description:
 *                       type: string
 *                       example: "VIP access tier"
 *                     order:
 *                       type: number
 *                       example: 1
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     soldCount:
 *                       type: number
 *                       example: 0
 *                 example:
 *                   - name: "VIP"
 *                     price: 200
 *                     quantity: 50
 *                     description: "VIP access tier"
 *                     order: 1
 *                     isActive: true
 *                     soldCount: 0
 *                   - name: "General"
 *                     price: 100
 *                     quantity: 100
 *                     description: "General admission"
 *                     order: 2
 *                     isActive: true
 *                     soldCount: 0
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
 * /api/events/dashboard:
 *   get:
 *     tags: [Events]
 *     summary: Get dashboard metrics for event organizer
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
router.get('/dashboard', authenticate, authorize('event_organizer'), (req, res) => eventController.getDashboardData(req, res));

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
 *     description: Upload or update cover images for both draft and published events. Only the event creator or assigned manager can update cover images.
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
 *         description: The ID of the event (draft or published)
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
 *                 example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not allowed to update this event
 *       404:
 *         description: Event not found
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

/**
 * @swagger
 * /api/events/{eventId}/assign-staff:
 *   post:
 *     tags: [Events]
 *     summary: Assign event staff to an event with responsibilities
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
 *               - eventStaffId
 *               - responsibilities
 *             properties:
 *               eventStaffId:
 *                 type: string
 *                 example: "687f92340a4ffadd47ad0c7a"
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["approve_entry", "scan_qr_code"]
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
router.post('/:eventId/assign-staff', authenticate, async (req, res) => {
  // Forward eventId from params and rest from body
  const { eventStaffId, responsibilities } = req.body;
  req.body.eventId = req.params.eventId;
  req.body.eventStaffId = eventStaffId;
  req.body.responsibilities = responsibilities;
  return eventStaffController.assignEventStaffToEvent(req, res);
});

/**
 * @swagger
 * /api/events/{eventId}/ticket-bookings:
 *   get:
 *     summary: Get ticket bookings with user details for a specific event
 *     description: Retrieve all ticket bookings for an event with detailed user information. Accessible by event organizers, managers, and staff assigned to the event.
 *     tags: [Events]
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
 *         description: Forbidden - User does not have permission to access this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/:eventId/ticket-bookings', authenticate, (req, res) => eventController.getEventTicketBookings(req, res));

export default router; 