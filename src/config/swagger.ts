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
            date: { type: 'string', format: 'date', example: '2024-07-15' },
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
      { name: 'TicketTiers', description: 'Ticket tier management endpoints' }
    ]
  },
  apis: [
    './src/routes/auth.routes.ts',
    './src/controllers/auth.controller.ts',
    './src/routes/user.routes.ts',
    './src/routes/admin.routes.ts',
    './src/routes/offer.routes.ts',
    './src/routes/payment.routes.ts',
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
    './src/routes/ticketTier.routes.ts'
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

export { swaggerSpec }; 