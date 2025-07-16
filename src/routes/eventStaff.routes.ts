import { Router } from 'express';
import { EventAuthController } from '../controllers/eventAuth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new EventAuthController();

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