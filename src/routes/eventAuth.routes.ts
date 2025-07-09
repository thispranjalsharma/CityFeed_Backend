import { Router } from 'express';
import { EventAuthController } from '../controllers/eventAuth.controller';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';

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
 *                 example: "Event Org Name"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "org@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "yourPassword"
 *               phone:
 *                 type: string
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
 *         description: Invalid input data
 *       409:
 *         description: Email already registered
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

export default router; 