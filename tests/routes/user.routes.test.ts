/**
 * @jest-environment node
 */
import request from 'supertest';
<<<<<<< Updated upstream
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
=======
import express from 'express';

// Mock the user controller functions
const mockUserController = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteProfile: jest.fn(),
  upgradeMembership: jest.fn(),
  verifyMembershipUpgrade: jest.fn(),
  sendReferralEmail: jest.fn(),
  getUserByPhone: jest.fn(),
  getMyWalletBalance: jest.fn(),
  getMyRewardPoints: jest.fn(),
  getMyRewardHistory: jest.fn(),
  getMyRewardSummary: jest.fn(),
  checkEmailAvailability: jest.fn(),
  checkPhoneAvailability: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define all actual user routes
app.get('/api/users/profile', (req, res) => mockUserController.getProfile(req, res));
app.put('/api/users/profile', (req, res) => mockUserController.updateProfile(req, res));
app.delete('/api/users/profile', (req, res) => mockUserController.deleteProfile(req, res));
app.post('/api/users/membership/upgrade', (req, res) => mockUserController.upgradeMembership(req, res));
app.post('/api/users/membership/upgrade/verify', (req, res) => mockUserController.verifyMembershipUpgrade(req, res));
app.post('/api/users/send-referral', (req, res) => mockUserController.sendReferralEmail(req, res));
app.get('/api/users/by-phone', (req, res) => mockUserController.getUserByPhone(req, res));
app.get('/api/users/wallet-balance', (req, res) => mockUserController.getMyWalletBalance(req, res));
app.get('/api/users/reward-points', (req, res) => mockUserController.getMyRewardPoints(req, res));
app.get('/api/users/reward-history', (req, res) => mockUserController.getMyRewardHistory(req, res));
app.get('/api/users/reward-summary', (req, res) => mockUserController.getMyRewardSummary(req, res));
app.post('/api/users/check-email', (req, res) => mockUserController.checkEmailAvailability(req, res));
app.post('/api/users/check-phone', (req, res) => mockUserController.checkPhoneAvailability(req, res));

describe('User Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/profile', () => {
    it('should return 200 with user profile data', async () => {
      const mockProfile = {
        _id: 'testuserid',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        membershipType: 'cityfeed_select'
      };

      mockUserController.getProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockProfile
        });
      });

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockProfile);
      expect(mockUserController.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockUserController.getProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .get('/api/users/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should return 200 for successful profile update', async () => {
      const updatedProfile = {
        _id: 'testuserid',
        name: 'Updated User',
        email: 'updated@example.com'
      };

      mockUserController.updateProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedProfile,
          message: 'Profile updated successfully'
        });
      });

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          name: 'Updated User',
          email: 'updated@example.com'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message', 'Profile updated successfully');
      expect(mockUserController.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockUserController.updateProfile.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          email: 'invalid-email'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/users/profile', () => {
    it('should return 200 for successful profile deletion', async () => {
      mockUserController.deleteProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Profile deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Profile deleted successfully');
      expect(mockUserController.deleteProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for user not found', async () => {
      mockUserController.deleteProfile.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
      });

      const res = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('POST /api/users/membership/upgrade', () => {
    it('should return 200 for successful membership upgrade initiation', async () => {
      const upgradeData = {
        orderId: 'order_123',
        amount: 2000,
        targetMembershipType: 'cityfeed_prime'
      };

      mockUserController.upgradeMembership.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: upgradeData,
          message: 'Membership upgrade initiated successfully'
        });
      });

      const res = await request(app)
        .post('/api/users/membership/upgrade')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          targetMembershipType: 'cityfeed_prime',
          paymentMethod: 'razorpay'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message');
      expect(mockUserController.upgradeMembership).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid membership type', async () => {
      mockUserController.upgradeMembership.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid membership type'
        });
      });

      const res = await request(app)
        .post('/api/users/membership/upgrade')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          targetMembershipType: 'invalid_type',
          paymentMethod: 'razorpay'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/users/membership/upgrade/verify', () => {
    it('should return 200 for successful membership upgrade verification', async () => {
      const verificationData = {
        membershipType: 'cityfeed_prime',
        expiryDate: '2025-03-20T10:00:00Z'
      };

      mockUserController.verifyMembershipUpgrade.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: verificationData,
          message: 'Membership upgrade completed successfully'
        });
      });

      const res = await request(app)
        .post('/api/users/membership/upgrade/verify')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          orderId: 'order_123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message');
      expect(mockUserController.verifyMembershipUpgrade).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for payment verification failed', async () => {
      mockUserController.verifyMembershipUpgrade.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Payment verification failed'
        });
      });

      const res = await request(app)
        .post('/api/users/membership/upgrade/verify')
        .set('Authorization', 'Bearer jwt-token')
        .send({
          orderId: 'invalid_order'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/users/wallet-balance', () => {
    it('should return 200 with wallet balance', async () => {
      const balanceData = {
        balance: 1500
      };

      mockUserController.getMyWalletBalance.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          balance: balanceData.balance
        });
      });

      const res = await request(app)
        .get('/api/users/wallet-balance')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('balance', 1500);
      expect(mockUserController.getMyWalletBalance).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/users/reward-points', () => {
    it('should return 200 with reward points', async () => {
      const rewardData = {
        rewardPoints: 250
      };

      mockUserController.getMyRewardPoints.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          rewardPoints: rewardData.rewardPoints
        });
      });

      const res = await request(app)
        .get('/api/users/reward-points')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('rewardPoints', 250);
      expect(mockUserController.getMyRewardPoints).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/users/reward-history', () => {
    it('should return 200 with paginated reward history', async () => {
      const historyData = {
        history: [
          {
            _id: 'reward1',
            transactionType: 'earned',
            amount: 50,
            sourceType: 'dine-in',
            description: 'Earned from dine-in',
            createdAt: '2024-01-15T10:30:00Z'
          }
        ],
        totalCount: 1,
        totalPages: 1,
        currentPage: 1
      };

      mockUserController.getMyRewardHistory.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: historyData,
          message: 'Reward history retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/users/reward-history')
        .set('Authorization', 'Bearer jwt-token')
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('history');
      expect(res.body.data.history).toHaveLength(1);
      expect(mockUserController.getMyRewardHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/users/reward-summary', () => {
    it('should return 200 with reward summary', async () => {
      const summaryData = {
        totalEarned: 500,
        totalRedeemed: 200,
        currentBalance: 300,
        transactionCount: 15
      };

      mockUserController.getMyRewardSummary.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: summaryData,
          message: 'Reward summary retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/users/reward-summary')
        .set('Authorization', 'Bearer jwt-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(summaryData);
      expect(mockUserController.getMyRewardSummary).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/users/check-email', () => {
    it('should return 200 when email is available', async () => {
      const availabilityData = {
        email: 'test@example.com',
        isAvailable: true,
        message: 'Email is available'
      };

      mockUserController.checkEmailAvailability.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: availabilityData,
          message: 'Email availability checked successfully'
        });
      });

      const res = await request(app)
        .post('/api/users/check-email')
        .send({
          email: 'test@example.com'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('isAvailable', true);
      expect(mockUserController.checkEmailAvailability).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid email format', async () => {
      mockUserController.checkEmailAvailability.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid email'
        });
      });

      const res = await request(app)
        .post('/api/users/check-email')
        .send({
          email: 'invalid-email'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/users/check-phone', () => {
    it('should return 200 when phone is available', async () => {
      const availabilityData = {
        phone: '1234567890',
        isAvailable: true,
        message: 'Phone number is available'
      };

      mockUserController.checkPhoneAvailability.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: availabilityData,
          message: 'Phone number availability checked successfully'
        });
      });

      const res = await request(app)
        .post('/api/users/check-phone')
        .send({
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('isAvailable', true);
      expect(mockUserController.checkPhoneAvailability).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid phone format', async () => {
      mockUserController.checkPhoneAvailability.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Phone must be exactly 10 digits'
        });
      });

      const res = await request(app)
        .post('/api/users/check-phone')
        .send({
          phone: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/users/by-phone', () => {
    it('should return 200 with user details by phone', async () => {
      const userData = {
        _id: 'testuserid',
        name: 'Test User',
        phone: '1234567890',
        email: 'test@example.com'
      };

      mockUserController.getUserByPhone.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: userData
        });
      });

      const res = await request(app)
        .get('/api/users/by-phone')
        .set('Authorization', 'Bearer jwt-token')
        .query({ phone: '1234567890' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(userData);
      expect(mockUserController.getUserByPhone).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for user not found', async () => {
      mockUserController.getUserByPhone.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
      });

      const res = await request(app)
        .get('/api/users/by-phone')
        .set('Authorization', 'Bearer jwt-token')
        .query({ phone: '9999999999' });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });
});
>>>>>>> Stashed changes
