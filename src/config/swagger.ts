import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CityFeed API',
      version,
      description: 'API documentation for the CityFeed application - Authentication, Users, SuperAdmin, Admins, Offers, Payments, Dine-in, OutletAdmin, OutletRoleAssignment',
      contact: {
        name: 'API Support',
        email: 'support@cityfeed.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://cityfeed-backend-production.up.railway.app'
          : 'http://localhost:3001',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        SuperAdmin: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Super Admin Name' },
            email: { type: 'string', example: 'superadmin@example.com' },
            phone: { type: 'string', example: '+1234567890' },
            isEmailVerified: { type: 'boolean', example: false },
            isApproved: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          }
        },
        EventOrganizer: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Event Organizer Name' },
            email: { type: 'string', example: 'organizer@example.com' },
            phone: { type: 'string', example: '+1234567890' },
            isEmailVerified: { type: 'boolean', example: false },
            isFirstLogin: { type: 'boolean', example: true },
            isApproved: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Tech Conference 2024' },
            description: { type: 'string', example: 'Annual technology conference featuring industry leaders' },
            type: { type: 'string', example: 'Conference' },
            coverImages: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['https://res.cloudinary.com/example/image1.jpg', 'https://res.cloudinary.com/example/image2.jpg']
            },
            date: { type: 'string', format: 'date', example: '2024-07-15', description: 'For single-day events only.' },
            startEventDate: { type: 'string', format: 'date', example: '2024-07-15', description: 'Start date for multi-day events.' },
            endEventDate: { type: 'string', format: 'date', example: '2024-07-17', description: 'End date for multi-day events.' },
            timezone: { type: 'string', example: 'Asia/Kolkata' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '18:00' },
            venue: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Grand Convention Center' },
                address: { type: 'string', example: '123 Main Street, City' },
                capacity: { type: 'number', example: 500 },
                location: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number', example: 12.9716 },
                    lng: { type: 'number', example: 77.5946 }
                  }
                }
              }
            },
            saleStart: { type: 'string', format: 'date-time', example: '2024-06-01T00:00:00Z' },
            saleEnd: { type: 'string', format: 'date-time', example: '2024-07-10T23:59:59Z' },
            maxTicketsPerPerson: { type: 'number', example: 4 },
            refundPolicy: { type: 'string', example: 'No refunds within 7 days of event' },
            specialInstructions: { type: 'string', example: 'Please bring valid ID' },
            status: { type: 'string', enum: ['draft', 'published'], example: 'published' },
            createdBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
            managerId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          },
          description: 'For multi-day events, use startEventDate and endEventDate. For single-day events, use date.',
          example: {
            name: 'Updated Multi-Day Event',
            description: 'Updated event description for multi-day event.',
            type: 'Conference',
            startEventDate: '2025-07-01',
            endEventDate: '2025-07-03',
            timezone: 'Asia/Kolkata',
            startTime: '09:00',
            endTime: '17:00',
            venue: {
              name: 'Grand Hall',
              address: '123 Main St',
              capacity: 500,
              location: { lat: 12.34, lng: 56.78 }
            },
            saleStart: '2025-06-01T00:00:00Z',
            saleEnd: '2025-06-30T23:59:59Z',
            maxTicketsPerPerson: 4,
            refundPolicy: 'No refunds',
            specialInstructions: 'Bring ID'
          }
        },
        EventManager: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Event Manager Name' },
            email: { type: 'string', example: 'manager@example.com' },
            phone: { type: 'string', example: '+1234567890' },
            isEmailVerified: { type: 'boolean', example: false },
            isFirstLogin: { type: 'boolean', example: true },
            isApproved: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          }
        },
        EventStaff: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Event Staff Name' },
            email: { type: 'string', example: 'staff@example.com' },
            phone: { type: 'string', example: '+1234567890' },
            role: { type: 'string', example: 'event_staff' },
            responsibilities: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['approve_entry', 'scan_qr_code']
            },
            event: { type: 'string', example: '507f1f77bcf86cd799439013' },
            isEmailVerified: { type: 'boolean', example: false },
            isFirstLogin: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          }
        },
        TicketTier: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Early Bird' },
            price: { type: 'number', example: 100 },
            quantity: { type: 'number', example: 50 },
            description: { type: 'string', example: 'Discounted early bird tickets' },
            order: { type: 'number', example: 1 },
            event: { type: 'string', example: '507f1f77bcf86cd799439012' },
            isActive: { type: 'boolean', example: true },
            soldCount: { type: 'number', example: 0 },
            available: { type: 'number', example: 50, description: 'Real-time available quantity (quantity - soldCount)' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          }
        },
        Ticket: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            orderId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439013' },
            eventId: { type: 'string', example: '507f1f77bcf86cd799439014' },
            ticketTierId: { type: 'string', example: '507f1f77bcf86cd799439015' },
            qrCodeUrl: { type: 'string', example: 'https://res.cloudinary.com/example/qr.png' },
            quantity: { type: 'number', example: 2 },
            status: { type: 'string', enum: ['active', 'used', 'invalidated'], example: 'active' },
            issuedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            scannedAt: { type: 'string', format: 'date-time', example: '2024-06-10T12:34:56Z' },
            scannedBy: { $ref: '#/components/schemas/EventStaff' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'SuperAdmin', description: 'Super admin endpoints' },
      { name: 'Admin', description: 'Admin management endpoints' },
      { name: 'Offers', description: 'Offer management endpoints' },
      { name: 'Payments', description: 'Payment management endpoints' },
      { name: 'DineIn', description: 'Dine-in management endpoints' },
      { name: 'OutletRoleAssignment', description: 'Outlet role assignment endpoints' },
      { name: 'Events', description: 'Event management endpoints' },
      { name: 'EventStaff', description: 'Event staff management endpoints' },
      { name: 'TicketTiers', description: 'Ticket tier management endpoints' },
      { name: 'Tickets', description: 'Ticket info and validation endpoints' },
      { name: 'Orders', description: 'Order management endpoints' }
    ]
  },
  apis: [
    './src/routes/auth.routes.ts',
    './src/controllers/auth.controller.ts',
    './src/routes/user.routes.ts',
    './src/routes/admin.routes.ts',
    './src/routes/offer.routes.ts',
    './src/routes/payment.routes.ts',
    './src/controllers/payment.controller.ts',
    './src/routes/dineIn.routes.ts',
    './src/routes/review.routes.ts',
    './src/routes/feedback.routes.ts',
    './src/routes/superAdmin.routes.ts',
    './src/routes/outletRoleAssignment.routes.ts',
    './src/routes/outlet.routes.ts',
    './src/routes/outletAdmin.routes.ts',
    './src/routes/employee.routes.ts',
    './src/routes/eventAuth.routes.ts',
    './src/routes/event.routes.ts',
    './src/routes/eventManager.routes.ts',
    './src/routes/eventStaff.routes.ts',
    './src/routes/ticketTier.routes.ts',
    './src/routes/order.routes.ts',
    './src/routes/ticket.routes.ts'
  ]
};

// Add base path to all paths
const swaggerSpec = swaggerJsdoc(options) as { paths: Record<string, any> };
Object.keys(swaggerSpec.paths).forEach(path => {
  // Only add /api prefix if it doesn't already exist
  if (!path.startsWith('/api')) {
    const newPath = `/api${path}`;
    swaggerSpec.paths[newPath] = swaggerSpec.paths[path];
    delete swaggerSpec.paths[path];
  }
});

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Process payment for any order type (event, dine-in, etc.)
 *     description: |
 *       Unified payment endpoint for all order types (event, dine-in, etc.) using wallet coins and/or reward points.
 *       For dine-in, this is equivalent to /api/payments/dine-in. For event, it processes event order payment.
 *       
 *       **Event Payments:**
 *       - After successful payment, digital tickets are generated for each ticket purchased.
 *       - Each ticket includes a QR code for event entry.
 *       - Ticket details and QR code images are sent to the user's email.
 *       - The API response also includes ticket info and QR code data.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderType
 *               - orderId
 *               - paymentMethod
 *             properties:
 *               orderType:
 *                 type: string
 *                 enum: [event, dine-in]
 *                 example: event
 *               orderId:
 *                 type: string
 *                 example: 64e1c2f1a2b3c4d5e6f7a8b9
 *               paymentMethod:
 *                 type: string
 *                 enum: [wallet, rewardPoints]
 *                 example: wallet
 *               rewardPointsToUse:
 *                 type: number
 *                 description: Number of reward points to use (optional, for rewardPoints method)
 *               otp:
 *                 type: string
 *                 description: OTP for reward points verification (optional)
 *               useRewardPoints:
 *                 type: boolean
 *                 description: Whether to use reward points (optional)
 *     responses:
 *       200:
 *         description: Payment processed successfully. For event payments, tickets are generated and sent to the user's email. The response includes ticket details and QR code data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                 payment:
 *                   type: object
 *                 discountAmount:
 *                   type: number
 *                 finalAmount:
 *                   type: number
 *                 rewardPointsDeducted:
 *                   type: number
 *                 tickets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       ticketTierId:
 *                         type: string
 *                       ticketTierName:
 *                         type: string
 *                       qrCodeData:
 *                         type: string
 *                         description: Base64 data URL for QR code image
 *                       status:
 *                         type: string
 *                       issuedAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Insufficient balance
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/auth/guest-login:
 *   post:
 *     summary: Guest login for event (phone + OTP)
 *     tags: [Auth]
 *     description: |
 *       Guest login for event flow. Step 1: Send phone to receive OTP. Step 2: Send phone and OTP to verify and login as a guest user. Guest users can only pay via Razorpay for events and do not receive discounts or reward points.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919999999999"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *           examples:
 *             RequestOTP:
 *               summary: Request OTP
 *               value:
 *                 phone: "+919999999999"
 *             VerifyOTP:
 *               summary: Verify OTP and login
 *               value:
 *                 phone: "+919999999999"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: Success (OTP sent or guest login successful)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       description: Guest user info
 *                     token:
 *                       type: string
 *                       description: JWT token for guest session
 *       400:
 *         description: Invalid input or OTP
 */

/**
 * @swagger
 * /api/events/{id}:
 *   patch:
 *     summary: Update a draft event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *           examples:
 *             SingleDayEvent:
 *               summary: Update single-day event
 *               value:
 *                 name: Updated Event Name
 *                 description: Updated event description.
 *                 type: Seminar
 *                 date: 2025-07-01
 *                 timezone: Asia/Kolkata
 *                 startTime: "10:00"
 *                 endTime: "18:00"
 *                 venue:
 *                   name: Grand Hall
 *                   address: 123 Main St
 *                   capacity: 500
 *                   location:
 *                     lat: 12.34
 *                     lng: 56.78
 *                 saleStart: 2025-06-01T00:00:00Z
 *                 saleEnd: 2025-06-30T23:59:59Z
 *                 maxTicketsPerPerson: 4
 *                 refundPolicy: No refunds
 *                 specialInstructions: Bring ID
 *             MultiDayEvent:
 *               summary: Update multi-day event
 *               value:
 *                 name: Updated Multi-Day Event
 *                 description: Updated event description for multi-day event.
 *                 type: Conference
 *                 startEventDate: 2025-07-01
 *                 endEventDate: 2025-07-03
 *                 timezone: Asia/Kolkata
 *                 startTime: "09:00"
 *                 endTime: "17:00"
 *                 venue:
 *                   name: Grand Hall
 *                   address: 123 Main St
 *                   capacity: 500
 *                   location:
 *                     lat: 12.34
 *                     lng: 56.78
 *                 saleStart: 2025-06-01T00:00:00Z
 *                 saleEnd: 2025-06-30T23:59:59Z
 *                 maxTicketsPerPerson: 4
 *                 refundPolicy: No refunds
 *                 specialInstructions: Bring ID
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */

export { swaggerSpec }; 