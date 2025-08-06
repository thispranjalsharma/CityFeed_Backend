import { Router } from 'express';
import { EventAuthController } from '../controllers/eventAuth.controller';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new EventAuthController();

/**
 * @swagger
 * /api/event-auth/register:
 *   post:
 *     tags: [EventAuth]
 *     summary: Register as an event organizer, manager, or staff
 *     description: >-
 *       Register a new event organizer, manager, or staff. After registration, a verification email will be sent with a token. Use the /api/auth/verify-email/{token} endpoint to verify the email.
 *       Email and phone number must be unique across all event organizers.
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
 *                 description: Full name of the event organizer
 *                 example: "Event Org Name"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address (must be unique)
 *                 example: "org@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password (min 8 chars, 1 special char, 1 lowercase, 1 digit)
 *                 example: "yourPassword"
 *               phone:
 *                 type: string
 *                 description: Phone number (must be exactly 10 digits and unique)
 *                 example: "1234567890"
 *     responses:
 *       201:
 *         description: Registration successful. Verification email sent.
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
 *                     organizer:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         isEmailVerified:
 *                           type: boolean
 *                     token:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: Registration successful. Verification email sent.
 *       400:
 *         description: Invalid input data or validation errors
 *       409:
 *         description: Email or phone number already registered
 */
// Custom password validation middleware
function validatePassword(req, res, next) {
  const password = req.body.password;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Password is required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
  }
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one lowercase letter' });
  }
  if (!/\d/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one digit' });
  }
  if (!/[^A-Za-z\d]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one special character' });
  }
  next();
}

router.post(
  '/register',
  validateRequest([
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    // password validation handled by custom middleware
    body('phone')
      .isLength({ min: 10, max: 10 }).withMessage('Phone must be exactly 10 digits')
      .isNumeric().withMessage('Phone must be numeric')
  ]),
  validatePassword,
  (req, res) => controller.register(req, res)
);

router.post('/verify-email', (req, res) => controller.verifyEmail(req, res));

/**
 * @swagger
 * /api/event-auth/profile:
 *   get:
 *     tags: [EventAuth]
 *     summary: Get event organizer or event staff profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         description: Unauthorized
 *   put:
 *     tags: [EventAuth]
 *     summary: Update event organizer or event staff profile
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
 *     tags: [EventAuth]
 *     summary: Delete event organizer or event staff profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted
 *       401:
 *         description: Unauthorized
 */
router.route('/profile')
  .get(authenticate, authorize('event_organizer', 'event_staff'), (req, res) => controller.getProfile(req, res))
  .put(authenticate, authorize('event_organizer', 'event_staff'), (req, res) => controller.updateProfile(req, res))
  .delete(authenticate, authorize('event_organizer'), (req, res) => controller.deleteEventOrganizerProfile(req, res))
  .delete(authenticate, authorize('event_staff'), (req, res) => controller.deleteEventStaffProfile(req, res));

/**
 * @swagger
 * /api/event-auth/my-event-managers:
 *   get:
 *     tags: [EventAuth]
 *     summary: Get all event managers for the logged-in event organizer's events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event managers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/my-event-managers', authenticate, authorize('event_organizer'), (req, res) => controller.getMyEventManagers(req, res));

/**
 * @swagger
 * /api/event-auth/my-event-staff:
 *   get:
 *     tags: [EventAuth]
 *     summary: Get all event staff for the logged-in event organizer's events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event staff
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/my-event-staff', authenticate, authorize('event_organizer'), (req, res) => controller.getMyEventStaff(req, res));

export default router; 