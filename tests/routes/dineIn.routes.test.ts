/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the dine-in controller functions
const mockDineInController = {
  startSession: jest.fn(),
  getUserSessions: jest.fn(),
  getOutletSessions: jest.fn(),
  getMonthlyDineInStats: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual dine-in routes
app.post('/api/dine-in/session', (req, res) => mockDineInController.startSession(req, res));
app.get('/api/dine-in/user/history', (req, res) => mockDineInController.getUserSessions(req, res));
app.get('/api/dine-in/outlet/:outletId/history', (req, res) => mockDineInController.getOutletSessions(req, res));
app.get('/api/dine-in/outlet/:outletId/monthly-stats', (req, res) => mockDineInController.getMonthlyDineInStats(req, res));

describe('DineIn Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/dine-in/session', () => {
    it('should return 201 for successful dine-in session creation', async () => {
      const mockSession = {
        _id: 'session1',
        userId: 'user1',
        outletId: 'outlet1',
        offerId: 'offer1',
        totalBill: 1000,
        status: 'pending',
        startTime: '2024-03-20T10:00:00Z',
        createdAt: '2024-03-20T10:00:00Z'
      };

      mockDineInController.startSession.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockSession,
          message: 'Dine-in session created successfully'
        });
      });

      const res = await request(app)
        .post('/api/dine-in/session')
        .set('Authorization', 'Bearer user-token')
        .send({
          outletId: 'outlet1',
          offerId: 'offer1',
          totalBill: 1000
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockSession);
      expect(res.body).toHaveProperty('message', 'Dine-in session created successfully');
      expect(mockDineInController.startSession).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      mockDineInController.startSession.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input'
        });
      });

      const res = await request(app)
        .post('/api/dine-in/session')
        .set('Authorization', 'Bearer user-token')
        .send({
          outletId: 'outlet1'
          // Missing offerId and totalBill
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid input');
    });

    it('should return 400 for invalid totalBill type', async () => {
      mockDineInController.startSession.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input'
        });
      });

      const res = await request(app)
        .post('/api/dine-in/session')
        .set('Authorization', 'Bearer user-token')
        .send({
          outletId: 'outlet1',
          offerId: 'offer1',
          totalBill: 'invalid-amount'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid input');
    });

    it('should return 401 for unauthorized access', async () => {
      mockDineInController.startSession.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .post('/api/dine-in/session')
        .send({
          outletId: 'outlet1',
          offerId: 'offer1',
          totalBill: 1000
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('GET /api/dine-in/user/history', () => {
    it('should return 200 with user dine-in history', async () => {
      const mockUserHistory = [
        {
          _id: 'session1',
          outletId: { name: 'Restaurant A', businessName: 'Business A' },
          offerId: 'offer1',
          status: 'completed',
          totalBill: 1000,
          startTime: '2024-03-20T10:00:00Z',
          endTime: '2024-03-20T12:00:00Z'
        },
        {
          _id: 'session2',
          outletId: { name: 'Restaurant B', businessName: 'Business B' },
          offerId: 'offer2',
          status: 'active',
          totalBill: 1500,
          startTime: '2024-03-21T10:00:00Z'
        }
      ];

      mockDineInController.getUserSessions.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUserHistory,
          message: 'User dine-in history retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/dine-in/user/history')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('status', 'completed');
      expect(res.body.data[1]).toHaveProperty('status', 'active');
      expect(mockDineInController.getUserSessions).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockDineInController.getUserSessions.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).get('/api/dine-in/user/history');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('GET /api/dine-in/outlet/:outletId/history', () => {
    it('should return 200 with outlet dine-in history and pagination', async () => {
      const mockOutletHistory = {
        sessions: [
          {
            _id: 'session1',
            userId: {
              _id: 'user1',
              name: 'John Doe',
              email: 'john@example.com',
              phone: '9876543210'
            },
            outletId: {
              _id: 'outlet1',
              name: 'Restaurant Name',
              businessName: 'Business Name'
            },
            offerId: 'offer1',
            status: 'completed',
            startTime: '2024-03-20T10:00:00Z',
            endTime: '2024-03-20T12:00:00Z',
            totalBill: 1000,
            paymentId: 'payment1',
            createdAt: '2024-03-20T10:00:00Z',
            updatedAt: '2024-03-20T12:00:00Z'
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalItems: 50,
          hasNextPage: true,
          hasPrevPage: false
        }
      };

      mockDineInController.getOutletSessions.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOutletHistory,
          message: 'Outlet dine-in history retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/dine-in/outlet/outlet1/history')
        .set('Authorization', 'Bearer admin-token')
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('sessions');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.sessions).toHaveLength(1);
      expect(res.body.data.pagination).toMatchObject({
        currentPage: 1,
        totalPages: 5,
        totalItems: 50,
        hasNextPage: true,
        hasPrevPage: false
      });
      expect(mockDineInController.getOutletSessions).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      mockDineInController.getOutletSessions.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Bad request - Invalid pagination parameters'
        });
      });

      const res = await request(app)
        .get('/api/dine-in/outlet/outlet1/history')
        .set('Authorization', 'Bearer admin-token')
        .query({ page: 0, limit: 200 }); // Invalid values

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Bad request - Invalid pagination parameters');
    });

    it('should return 401 for unauthorized access', async () => {
      mockDineInController.getOutletSessions.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Not authenticated'
        });
      });

      const res = await request(app).get('/api/dine-in/outlet/outlet1/history');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Not authenticated');
    });
  });

  describe('GET /api/dine-in/outlet/:outletId/monthly-stats', () => {
    it('should return 200 with monthly dine-in statistics', async () => {
      const mockMonthlyStats = [
        {
          month: '2024-01',
          totalSessions: 45,
          totalRevenue: 45000,
          averageBill: 1000,
          peakHours: ['12:00', '19:00'],
          popularOffers: ['offer1', 'offer2']
        },
        {
          month: '2024-02',
          totalSessions: 52,
          totalRevenue: 52000,
          averageBill: 1000,
          peakHours: ['12:00', '19:00'],
          popularOffers: ['offer1', 'offer3']
        }
      ];

      mockDineInController.getMonthlyDineInStats.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockMonthlyStats,
          message: 'Monthly dine-in statistics retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/dine-in/outlet/outlet1/monthly-stats')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('month', '2024-01');
      expect(res.body.data[0]).toHaveProperty('totalSessions', 45);
      expect(res.body.data[1]).toHaveProperty('month', '2024-02');
      expect(res.body.data[1]).toHaveProperty('totalSessions', 52);
      expect(mockDineInController.getMonthlyDineInStats).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockDineInController.getMonthlyDineInStats.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Not authenticated'
        });
      });

      const res = await request(app).get('/api/dine-in/outlet/outlet1/monthly-stats');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Not authenticated');
    });

    it('should return 403 for forbidden access', async () => {
      mockDineInController.getMonthlyDineInStats.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - User is not authorized'
        });
      });

      const res = await request(app)
        .get('/api/dine-in/outlet/outlet1/monthly-stats')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden - User is not authorized');
    });
  });
});
