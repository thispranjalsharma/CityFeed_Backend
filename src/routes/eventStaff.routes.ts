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
router.post('/assign-to-event', authenticate, (req, res) => controller.assignEventStaffToEvent(req, res));

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

export default router; 