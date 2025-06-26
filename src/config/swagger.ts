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
      { name: 'OutletRoleAssignment', description: 'Outlet role assignment endpoints' }
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
    './src/routes/outletAdmin.routes.ts'
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