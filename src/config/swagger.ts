import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CityFeed API',
      version,
      description: 'API documentation for the CityFeed application - Authentication, Users, SuperAdmin, Admins, Offers, Payments, Dine-in, OutletAdmin, Staff',
      contact: {
        name: 'API Support',
        email: 'support@cityfeed.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server'
      },
      {
        url: 'https://web-production-22800.up.railway.app',
        description: 'Production server'
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
            date: { type: 'string', format: 'date', example: '2025-07-01', description: 'Event date in YYYY-MM-DD format.' },
            startEventDate: { type: 'string', format: 'date', example: '2025-07-01', description: 'Start date for multi-day events in YYYY-MM-DD format.' },
            endEventDate: { type: 'string', format: 'date', example: '2025-07-03', description: 'End date for multi-day events in YYYY-MM-DD format.' },
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
            refundPolicy: { type: 'string', example: 'No refunds within 7 days of event' },
            specialInstructions: { type: 'string', example: 'Please bring valid ID' },
            status: { type: 'string', enum: ['draft', 'published'], example: 'published' },
            createdBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
            managerId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            totalSeats: { type: 'number', example: 350, description: 'Total number of seats for the event. Sum of ticket tier quantities, or venue capacity if no tiers.' },
            availableSeats: { type: 'number', example: 350, description: 'Total available seats for the event. Sum of available in all ticket tiers, or venue capacity if no tiers.' },
            totalSoldCount: { type: 'number', example: 0, description: 'Total number of tickets sold for the event. Sum of soldCount in all ticket tiers, or 0 if no tiers.' },
            ticketPrice: { type: 'number', example: 100, description: 'Optional. Ticket price for events without ticket tiers. Ignored if ticket tiers exist.' }
        },
          description: 'For multi-day events, use startEventDate and endEventDate. For single-day events, use date. availableSeats and totalSoldCount are always present, even if no ticket tiers exist (in which case they reflect venue capacity and 0 sold).',
          example: {
            name: 'Updated Multi-Day Event',
            description: 'Updated event description for multi-day event.',
            type: 'Conference',
            startEventDate: '2025-07-01',
            endEventDate: '2025-07-03',
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
            refundPolicy: 'No refunds',
            specialInstructions: 'Bring ID',
            totalSeats: 350,
            availableSeats: 350,
            totalSoldCount: 0,
            ticketPrice: 100,
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
        Staff: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            outlet: { type: 'string', example: '507f1f77bcf86cd799439012', description: 'Outlet ID this staff member belongs to' },
            role: { type: 'string', example: 'employee', enum: ['manager', 'staff', 'other'] },
            responsibilities: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['create_offer', 'update_offer', 'view_order', 'manage_inventory'],
              description: 'List of responsibilities assigned to this staff member'
            },
            email: { type: 'string', example: 'employee@restaurant.com', format: 'email' },
            password: { type: 'string', example: 'hashedPassword123', description: 'Hashed password' },
            phone: { type: 'string', example: '+1234567890' },
            name: { type: 'string', example: 'John Employee' },
            isEmailVerified: { type: 'boolean', example: false },
            isFirstLogin: { type: 'boolean', example: true },
            isActive: { type: 'boolean', example: true, description: 'Activation status of the staff member' },
            isDeleted: { type: 'boolean', example: false, description: 'Soft delete flag' },
            deletedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z', description: 'Soft delete timestamp' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          },
          description: 'Staff members for restaurant/food outlet employees. Separate from EventStaff which is for event staff.'
        },
        OutletAdmin: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Outlet Admin Name' },
            email: { type: 'string', example: 'outletadmin@example.com', format: 'email' },
            password: { type: 'string', example: 'hashedPassword123', description: 'Hashed password' },
            phone: { type: 'string', example: '+1234567890' },
            role: { type: 'string', example: 'outlet_admin', enum: ['outlet_admin'] },
            isActive: { type: 'boolean', example: true },
            isEmailVerified: { type: 'boolean', example: false },
            isFirstLogin: { type: 'boolean', example: true },
            isDeleted: { type: 'boolean', example: false, description: 'Soft delete flag' },
            deletedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z', description: 'Soft delete timestamp' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          },
          description: 'Outlet admin users who manage specific restaurant/food outlets.'
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
        },
        UserIdScanRequest: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to get details for',
              example: '507f1f77bcf86cd799439011'
            }
          }
        },
        QRCodeScanResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                preferences: {
                  type: 'object',
                  properties: {
                    notifications: { type: 'boolean', example: true },
                    language: { type: 'string', example: 'en' },
                    theme: { type: 'string', example: 'light' }
                  }
                },
                referredBy: { type: 'string', nullable: true, example: null },
                _id: { type: 'string', example: '684970af30ef39f08449c231' },
                name: { type: 'string', example: 'hariom' },
                email: { type: 'string', example: 'hariommourya1008@gmail.com' },
                password: { type: 'string', example: '$2a$10$wOgg2L4R.CgQwgeSX2dgauOgjyXtVl.wbW5rOYYv/nXiX5XFcgXmW' },
                dob: { type: 'string', format: 'date-time', example: '2000-06-11T00:00:00.000Z' },
                gender: { type: 'string', example: 'male' },
                phone: { type: 'string', example: '7000097609' },
                membershipType: { type: 'string', example: 'cityfeed_edge' },
                role: { type: 'string', example: 'user' },
                coins: { type: 'number', example: 71685 },
                isActive: { type: 'boolean', example: true },
                isEmailVerified: { type: 'boolean', example: true },
                isPhoneVerified: { type: 'boolean', example: false },
                loginAttempts: { type: 'number', example: 0 },
                createdAt: { type: 'string', format: 'date-time', example: '2025-06-11T12:03:59.768Z' },
                updatedAt: { type: 'string', format: 'date-time', example: '2025-08-05T10:32:53.963Z' },
                membershipExpiryDate: { type: 'string', format: 'date-time', example: '2026-07-24T05:58:07.049Z' },
                reward_points: { type: 'number', example: 518 },
                isApproved: { type: 'boolean', example: false },
                isDeleted: { type: 'boolean', example: false },
                isGuest: { type: 'boolean', example: false }
              }
            }
          }
        },
        UserRegistrationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                    name: { type: 'string', example: 'john doe' },
                    email: { type: 'string', example: 'john@example.com' },
                    phone: { type: 'string', example: '9876543210' },
                    qrCodeUrl: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/user_qr/qr_code.png' },
                    membershipType: { type: 'string', example: 'cityfeed_prime' }
                  }
                },
                token: { type: 'string', example: 'jwt_token_here' }
              }
            }
          }
        },
        OutletAdminDashboardResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                totalTransactionAmount: {
                  type: 'number',
                  example: 150000,
                  description: 'Total transaction amount for current financial year'
                },
                activeOfferCount: {
                  type: 'number',
                  example: 5,
                  description: 'Number of active offers for the outlet'
                },
                totalEmployeesCount: {
                  type: 'number',
                  example: 12,
                  description: 'Total number of employees assigned to the outlet'
                },
                totalDineInSessionCount: {
                  type: 'number',
                  example: 45,
                  description: 'Total number of dine-in sessions for the outlet'
                },
                monthlyRevenue: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      month: { type: 'number', example: 4 },
                      year: { type: 'number', example: 2024 },
                      total: { type: 'number', example: 25000 }
                    }
                  },
                  description: 'Monthly revenue breakdown for current financial year'
                },
                recentTransactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                      amount: { type: 'number', example: 1500 },
                      createdAt: { 
                        type: 'string', 
                        format: 'date-time', 
                        example: '2024-01-15T10:30:00.000Z' 
                      },
                      userId: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
                          name: { type: 'string', example: 'John Doe' },
                          phone: { type: 'string', example: '9876543210' }
                        }
                      }
                    }
                  },
                  description: 'Recent transactions (last 10) with user details'
                },
                outletDetails: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
                    businessName: { type: 'string', example: 'Restaurant Name' },
                    businessType: { type: 'string', example: 'Restaurant' },
                    address: { type: 'string', example: '123 Main St, City' },
                    isActive: { type: 'boolean', example: true },
                    createdAt: { 
                      type: 'string', 
                      format: 'date-time', 
                      example: '2024-01-01T00:00:00.000Z' 
                    }
                  },
                  description: 'Details of the outlet assigned to the outlet admin'
                }
              }
            }
          }
        },
        EventOrganizerDashboardResponse: {
          type: 'object',
          properties: {
            activeEventCount: { type: 'integer', example: 5 },
            eventManagerCount: { type: 'integer', example: 2 },
            eventStaffCount: { type: 'integer', example: 10 },
            totalTicketsSold: { type: 'integer', example: 500 },
            monthlySales: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'integer', example: 6 },
                  year: { type: 'integer', example: 2024 },
                  total: { type: 'number', example: 10000 }
                }
              }
            },
            recentTicketSales: {
              type: 'array',
              items: { $ref: '#/components/schemas/Event' }
            },
            upcomingEvents: {
              type: 'array',
              items: { $ref: '#/components/schemas/Event' }
            }
          }
        },
        EventManagerDashboardResponse: {
          type: 'object',
          properties: {
            activeEventCount: { type: 'integer', example: 3 },
            eventStaffCount: { type: 'integer', example: 7 },
            totalTicketsSold: { type: 'integer', example: 300 },
            monthlySales: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'integer', example: 6 },
                  year: { type: 'integer', example: 2024 },
                  total: { type: 'number', example: 6000 }
                }
              }
            },
            recentTicketSales: {
              type: 'array',
              items: { $ref: '#/components/schemas/Event' }
            },
            upcomingEvents: {
              type: 'array',
              items: { $ref: '#/components/schemas/Event' }
            }
          }
        },
        EventStaffDashboardResponse: {
          type: 'object',
          properties: {
            totalAssignedEvents: { type: 'integer', example: 4 },
            totalTicketsChecked: { type: 'integer', example: 120 },
            upcomingEvents: {
              type: 'array',
              items: { $ref: '#/components/schemas/Event' }
            },
            recentActivity: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  eventId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                  scannedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
                  status: { type: 'string', example: 'used' }
                }
              }
            }
          }
        },
        PreRegistrationPayment: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', example: 'user@example.com' },
            membershipType: { 
              type: 'string', 
              enum: ['cityfeed_select', 'cityfeed_edge', 'cityfeed_prime'],
              example: 'cityfeed_edge'
            },
            amount: { type: 'number', example: 999 },
            razorpayOrderId: { type: 'string', example: 'order_123456789' },
            status: { 
              type: 'string', 
              enum: ['pending', 'success', 'failed', 'consumed'],
              example: 'success'
            },
            consumedAt: { 
              type: 'string', 
              format: 'date-time', 
              example: '2024-06-01T12:00:00Z',
              description: 'Timestamp when payment was consumed for registration'
            },
            userId: { 
              type: 'string', 
              example: '507f1f77bcf86cd799439012',
              description: 'Reference to user account created from this payment'
            },
            paymentId: { 
              type: 'string', 
              example: '507f1f77bcf86cd799439013',
              description: 'Reference to payment record created in main Payment collection'
            },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          },
          description: 'Pre-registration payment records for user membership purchase'
        },
        RewardHistory: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            transactionType: { 
              type: 'string', 
              enum: ['earned', 'used', 'adjustment', 'refund'],
              example: 'earned'
            },
            amount: { type: 'number', example: 100 },
            sourceType: { 
              type: 'string', 
              enum: ['dine-in', 'event', 'referral', 'membership', 'adjustment', 'refund'],
              example: 'membership'
            },
            sourceId: { type: 'string', example: '507f1f77bcf86cd799439013' },
            outletId: { type: 'string', example: '507f1f77bcf86cd799439014' },
            eventId: { type: 'string', example: '507f1f77bcf86cd799439015' },
            description: { type: 'string', example: 'Joining reward points for cityfeed_edge membership' },
            balanceBefore: { type: 'number', example: 0 },
            balanceAfter: { type: 'number', example: 100 },
            referredUserId: { type: 'string', example: '507f1f77bcf86cd799439016' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-06-01T12:00:00Z' }
          },
          description: 'Reward point transaction history for users'
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
      { name: 'OutletAdmin', description: 'Outlet admin management endpoints' },
      { name: 'Offers', description: 'Offer management endpoints' },
      { name: 'Payments', description: 'Payment management endpoints' },
      { name: 'DineIn', description: 'Dine-in management endpoints' },
      { name: 'Staff', description: 'Staff management endpoints' },
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
    './src/routes/dineIn.routes.ts',
    './src/routes/review.routes.ts',
    './src/routes/feedback.routes.ts',
    './src/routes/superAdmin.routes.ts',
    './src/routes/staff.routes.ts',
    './src/routes/outlet.routes.ts',
    './src/routes/outletAdmin.routes.ts',
    
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
 *                 refundPolicy: No refunds
 *                 specialInstructions: Bring ID
 *                 ticketPrice: 100
 *             MultiDayEvent:
 *               summary: Update multi-day event
 *               value:
 *                 name: Updated Multi-Day Event
 *                 description: Updated event description for multi-day event.
 *                 type: Conference
 *                 startEventDate: 2025-07-01
 *                 endEventDate: 2025-07-03
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
 *                 refundPolicy: No refunds
 *                 specialInstructions: Bring ID
 *                 ticketPrice: 100
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

/**
 * @swagger
 * /api/events/dashboard:
 *   get:
 *     summary: Get dashboard metrics for event organizer
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventOrganizerDashboardResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/event-managers/dashboard:
 *   get:
 *     summary: Get dashboard metrics for event manager
 *     tags: [EventManagers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventManagerDashboardResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/event-staff/dashboard:
 *   get:
 *     summary: Get dashboard metrics for event staff
 *     tags: [EventStaff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventStaffDashboardResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

export { swaggerSpec }; 