/**
 * @jest-environment node
 */
import request from 'supertest';
import App from '../../src/app';
import mongoose from 'mongoose';
import { User } from '../../src/models/user.model';
import { Ticket } from '../../src/models/ticket.model';
import { Event } from '../../src/models/event.model';
import { TicketTier } from '../../src/models/ticketTier.model';
import jwt from 'jsonwebtoken';

// Use the correct type for Express app
let app: import('express').Application;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const appInstance = new App();
  app = appInstance.getApp();
});

afterAll(async () => {
  await mongoose.disconnect();
});

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
  userAuth: (req, res, next) => next(),
  adminAuth: (req, res, next) => next(),
  superAdminAuth: (req, res, next) => next(),
  outletAdminAuth: (req, res, next) => next(),
  employeeAuth: (req, res, next) => next(),
  authorize: (...roles) => (req, res, next) => next(),
}));

describe('GET /api/users/booked-tickets', () => {
  let testUser: any;
  let testEvent: any;
  let testTicketTier: any;
  let userToken: string;
  let testTickets: any[];
  let otherUser: any;

  beforeEach(async () => {
    // Clean up previous test data
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await Event.deleteMany({});
    await TicketTier.deleteMany({});

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      phone: '1234567890',
      password: 'password123',
      membershipType: 'cityfeed_prime'
    });

    // Create another user to test isolation
    otherUser = await User.create({
      name: 'Other User',
      email: 'otheruser@example.com',
      phone: '0987654321',
      password: 'password123',
      membershipType: 'cityfeed_select'
    });

    // Create test event
    testEvent = await Event.create({
      name: 'Test Event',
      description: 'Test event description',
      date: new Date('2024-12-25'),
      startTime: '18:00',
      endTime: '22:00',
      venue: {
        name: 'Test Venue',
        address: 'Test Address',
        capacity: 100
      },
      status: 'published',
      createdBy: testUser._id
    });

    // Create test ticket tier
    testTicketTier = await TicketTier.create({
      name: 'VIP Ticket',
      price: 100,
      quantity: 50,
      description: 'VIP access',
      order: 1,
      event: testEvent._id,
      isActive: true
    });

    // Create test tickets with different dates and statuses
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    testTickets = await Ticket.create([
      {
        orderId: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        eventId: testEvent._id,
        ticketTierId: testTicketTier._id,
        qrCodeUrl: 'qr1',
        quantity: 2,
        status: 'active',
        issuedAt: now
      },
      {
        orderId: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        eventId: testEvent._id,
        ticketTierId: testTicketTier._id,
        qrCodeUrl: 'qr2',
        quantity: 1,
        status: 'used',
        issuedAt: threeMonthsAgo,
        scannedAt: now
      },
      {
        orderId: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        eventId: testEvent._id,
        ticketTierId: testTicketTier._id,
        qrCodeUrl: 'qr3',
        quantity: 3,
        status: 'invalidated',
        issuedAt: sixMonthsAgo
      },
      // Create a ticket for another user to test isolation
      {
        orderId: new mongoose.Types.ObjectId(),
        userId: otherUser._id,
        eventId: testEvent._id,
        ticketTierId: testTicketTier._id,
        qrCodeUrl: 'qr4',
        quantity: 1,
        status: 'active',
        issuedAt: now
      }
    ]);

    // Generate JWT token for test user
    userToken = jwt.sign(
      { _id: testUser._id, role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('Default behavior', () => {
    it('should return only authenticated user tickets from last 3 months by default', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tickets).toHaveLength(2); // Only tickets from last 3 months for authenticated user
      expect(response.body.data.statistics.total).toBe(2);
      expect(response.body.data.pagination.total).toBe(2);
      
      // Verify all returned tickets belong to the authenticated user
      response.body.data.tickets.forEach((ticket: any) => {
        expect(ticket.user.id).toBe(testUser._id.toString());
      });
    });

    it('should not return tickets from other users', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should not include the ticket created for otherUser
      const otherUserTicket = response.body.data.tickets.find((ticket: any) => 
        ticket.user.id === otherUser._id.toString()
      );
      expect(otherUserTicket).toBeUndefined();
    });

    it('should include all required fields in response', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const ticket = response.body.data.tickets[0];
      expect(ticket).toHaveProperty('ticketId');
      expect(ticket).toHaveProperty('orderId');
      expect(ticket).toHaveProperty('status');
      expect(ticket).toHaveProperty('quantity');
      expect(ticket).toHaveProperty('issuedAt');
      expect(ticket).toHaveProperty('qrCodeUrl');
      expect(ticket).toHaveProperty('event');
      expect(ticket).toHaveProperty('ticketTier');
      expect(ticket).toHaveProperty('user');
    });
  });

  describe('Date filtering', () => {
    it('should filter tickets by start date', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ startDate: '2024-11-01' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1); // Only recent ticket
    });

    it('should filter tickets by end date', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ endDate: '2024-09-01' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1); // Only old ticket
    });

    it('should filter tickets by date range', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ 
          startDate: '2024-09-01',
          endDate: '2024-11-01'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ startDate: 'invalid-date' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid date format');
    });

    it('should return 400 when start date is after end date', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ 
          startDate: '2024-12-31',
          endDate: '2024-01-01'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Start date cannot be after end date');
    });
  });

  describe('Status filtering', () => {
    it('should filter tickets by active status', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.tickets[0].status).toBe('active');
    });

    it('should filter tickets by used status', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ status: 'used' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.tickets[0].status).toBe('used');
    });

    it('should filter tickets by invalidated status', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ status: 'invalidated' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.tickets[0].status).toBe('invalidated');
    });
  });

  describe('Pagination', () => {
    it('should return paginated results', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should return second page', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .query({ page: 2, limit: 1 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      const response = await request(app)
        .get('/api/users/booked-tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const stats = response.body.data.statistics;
      expect(stats.total).toBe(2); // Only tickets from last 3 months
      expect(stats.active).toBe(1);
      expect(stats.used).toBe(1);
      expect(stats.invalidated).toBe(0);
      expect(stats.totalQuantity).toBe(3); // 2 + 1
    });
  });
}); 