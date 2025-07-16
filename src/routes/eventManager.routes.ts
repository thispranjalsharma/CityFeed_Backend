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
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "manager@example.com"
 *               password:
 *                 type: string
 *                 example: "Password123!"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
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
 *                       example: "+1234567890"
 *                     role:
 *                       type: string
 *                       example: "event_manager"
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

// Removed /event-managers/event-staff endpoint; use /api/events/:eventId/staff instead.

export default router; 