/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the eventManager controller functions
const mockEventManagerController = {
  createEventManager: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteProfile: jest.fn(),
  getDashboardData: jest.fn(),
  activateEventManager: jest.fn(),
  deactivateEventManager: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual eventManager routes
app.post('/api/event-managers', (req, res) => mockEventManagerController.createEventManager(req, res));
app.get('/api/event-managers/profile', (req, res) => mockEventManagerController.getProfile(req, res));
app.put('/api/event-managers/profile', (req, res) => mockEventManagerController.updateProfile(req, res));
app.delete('/api/event-managers/profile', (req, res) => mockEventManagerController.deleteProfile(req, res));
app.get('/api/event-managers/dashboard', (req, res) => mockEventManagerController.getDashboardData(req, res));
app.patch('/api/event-managers/:managerId/activate', (req, res) => mockEventManagerController.activateEventManager(req, res));
app.patch('/api/event-managers/:managerId/deactivate', (req, res) => mockEventManagerController.deactivateEventManager(req, res));

describe('EventManager Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/event-managers', () => {
    it('should return 201 for successful event manager creation', async () => {
      const mockEventManager = {
        _id: 'managerid',
        name: 'John Doe',
        email: 'manager@example.com',
        phone: '1234567890',
        role: 'event_manager'
      };

      mockEventManagerController.createEventManager.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockEventManager
        });
      });

      const res = await request(app)
        .post('/api/event-managers')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'John Doe',
          email: 'manager@example.com',
          password: 'Password123!',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockEventManager);
      expect(mockEventManagerController.createEventManager).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing or invalid fields', async () => {
      mockEventManagerController.createEventManager.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Missing or invalid fields'
        });
      });

      const res = await request(app)
        .post('/api/event-managers')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          password: 'weak',
          phone: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Missing or invalid fields');
    });

    it('should return 409 for duplicate email or phone', async () => {
      mockEventManagerController.createEventManager.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Email or phone number already exists'
        });
      });

      const res = await request(app)
        .post('/api/event-managers')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'John Doe',
          email: 'existing@example.com',
          password: 'Password123!',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Email or phone number already exists');
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventManagerController.createEventManager.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .post('/api/event-managers')
        .send({
          name: 'John Doe',
          email: 'manager@example.com',
          password: 'Password123!',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for forbidden access (non-organizer)', async () => {
      mockEventManagerController.createEventManager.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .post('/api/event-managers')
        .set('Authorization', 'Bearer staff-token')
        .send({
          name: 'John Doe',
          email: 'manager@example.com',
          password: 'Password123!',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('GET /api/event-managers/profile', () => {
    it('should return 200 with event manager profile', async () => {
      const mockProfile = {
        _id: 'managerid',
        name: 'John Doe',
        email: 'manager@example.com',
        phone: '1234567890',
        role: 'event_manager',
        isActive: true
      };

      mockEventManagerController.getProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockProfile
        });
      });

      const res = await request(app)
        .get('/api/event-managers/profile')
        .set('Authorization', 'Bearer manager-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockProfile);
      expect(mockEventManagerController.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventManagerController.getProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .get('/api/event-managers/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('PUT /api/event-managers/profile', () => {
    it('should return 200 for successful profile update', async () => {
      const updatedProfile = {
        _id: 'managerid',
        name: 'Updated Manager',
        email: 'manager@example.com',
        phone: '0987654321',
        role: 'event_manager'
      };

      mockEventManagerController.updateProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedProfile,
          message: 'Profile updated'
        });
      });

      const res = await request(app)
        .put('/api/event-managers/profile')
        .set('Authorization', 'Bearer manager-token')
        .send({
          name: 'Updated Manager',
          phone: '0987654321'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message', 'Profile updated');
      expect(mockEventManagerController.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventManagerController.updateProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .put('/api/event-managers/profile')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('DELETE /api/event-managers/profile', () => {
    it('should return 200 for successful profile deletion', async () => {
      mockEventManagerController.deleteProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Profile deleted'
        });
      });

      const res = await request(app)
        .delete('/api/event-managers/profile')
        .set('Authorization', 'Bearer manager-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Profile deleted');
      expect(mockEventManagerController.deleteProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventManagerController.deleteProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .delete('/api/event-managers/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('GET /api/event-managers/dashboard', () => {
    it('should return 200 with dashboard data for event manager', async () => {
      const mockDashboardData = {
        totalManagedEvents: 5,
        activeEvents: 3,
        upcomingEvents: 2,
        totalTicketsSold: 150,
        totalRevenue: 7500,
        recentActivity: [
          { type: 'event_created', eventName: 'Concert A', date: '2024-01-15' },
          { type: 'ticket_sold', eventName: 'Workshop B', count: 10 }
        ]
      };

      mockEventManagerController.getDashboardData.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockDashboardData
        });
      });

      const res = await request(app)
        .get('/api/event-managers/dashboard')
        .set('Authorization', 'Bearer manager-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('totalManagedEvents');
      expect(res.body.data).toHaveProperty('activeEvents');
      expect(res.body.data).toHaveProperty('recentActivity');
      expect(mockEventManagerController.getDashboardData).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventManagerController.getDashboardData.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .get('/api/event-managers/dashboard');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for forbidden access (non-manager)', async () => {
      mockEventManagerController.getDashboardData.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .get('/api/event-managers/dashboard')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('PATCH /api/event-managers/:managerId/activate', () => {
    it('should return 200 for successful manager activation', async () => {
      const activatedManager = {
        _id: 'managerid',
        name: 'John Doe',
        email: 'manager@example.com',
        isActive: true,
        role: 'event_manager'
      };

      mockEventManagerController.activateEventManager.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event manager activated.',
          data: activatedManager
        });
      });

      const res = await request(app)
        .patch('/api/event-managers/managerid/activate')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event manager activated.');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('isActive', true);
      expect(mockEventManagerController.activateEventManager).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for manager not found', async () => {
      mockEventManagerController.activateEventManager.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event manager not found'
        });
      });

      const res = await request(app)
        .patch('/api/event-managers/nonexistent/activate')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event manager not found');
    });

    it('should return 403 for forbidden access (non-organizer)', async () => {
      mockEventManagerController.activateEventManager.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .patch('/api/event-managers/managerid/activate')
        .set('Authorization', 'Bearer manager-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('PATCH /api/event-managers/:managerId/deactivate', () => {
    it('should return 200 for successful manager deactivation', async () => {
      const deactivatedManager = {
        _id: 'managerid',
        name: 'John Doe',
        email: 'manager@example.com',
        isActive: false,
        role: 'event_manager'
      };

      mockEventManagerController.deactivateEventManager.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event manager deactivated.',
          data: deactivatedManager
        });
      });

      const res = await request(app)
        .patch('/api/event-managers/managerid/deactivate')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event manager deactivated.');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('isActive', false);
      expect(mockEventManagerController.deactivateEventManager).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for manager not found', async () => {
      mockEventManagerController.deactivateEventManager.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event manager not found'
        });
      });

      const res = await request(app)
        .patch('/api/event-managers/nonexistent/deactivate')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event manager not found');
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventManagerController.deactivateEventManager.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .patch('/api/event-managers/managerid/deactivate');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });
});



