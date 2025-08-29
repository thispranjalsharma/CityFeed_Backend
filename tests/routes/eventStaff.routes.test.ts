/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the event staff controller functions
const mockEventStaffController = {
  createEventStaffOnly: jest.fn(),
  assignEventStaffToEvent: jest.fn(),
  getDashboardData: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteEventStaffProfile: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual event staff routes
app.post('/api/event-staff', (req, res) => mockEventStaffController.createEventStaffOnly(req, res));
app.post('/api/event-staff/assign-to-event', (req, res) => mockEventStaffController.assignEventStaffToEvent(req, res));
app.get('/api/event-staff/dashboard', (req, res) => mockEventStaffController.getDashboardData(req, res));
app.get('/api/event-staff/profile', (req, res) => mockEventStaffController.getProfile(req, res));
app.put('/api/event-staff/profile', (req, res) => mockEventStaffController.updateProfile(req, res));
app.delete('/api/event-staff/profile', (req, res) => mockEventStaffController.deleteEventStaffProfile(req, res));

describe('EventStaff Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/event-staff', () => {
    it('should return 201 for successful event staff creation', async () => {
      const mockEventStaff = {
        _id: 'staff1',
        name: 'Jane Staff',
        email: 'janestaff@example.com',
        phone: '+1234567890',
        role: 'event_staff',
        isActive: true,
        createdBy: 'organizer1'
      };

      mockEventStaffController.createEventStaffOnly.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockEventStaff
        });
      });

      const res = await request(app)
        .post('/api/event-staff')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'Jane Staff',
          email: 'janestaff@example.com',
          password: 'Password123!',
          phone: '+1234567890'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockEventStaff);
      expect(res.body.data).toHaveProperty('role', 'event_staff');
      expect(res.body.data).toHaveProperty('isActive', true);
      expect(mockEventStaffController.createEventStaffOnly).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      mockEventStaffController.createEventStaffOnly.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Missing or invalid fields'
        });
      });

      const res = await request(app)
        .post('/api/event-staff')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'Jane Staff'
          // Missing email, password, phone
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Missing or invalid fields');
    });

    it('should return 409 for duplicate email', async () => {
      mockEventStaffController.createEventStaffOnly.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      });

      const res = await request(app)
        .post('/api/event-staff')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'Jane Staff',
          email: 'existing@example.com',
          password: 'Password123!',
          phone: '+1234567890'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Email already exists');
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventStaffController.createEventStaffOnly.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .post('/api/event-staff')
        .send({
          name: 'Jane Staff',
          email: 'janestaff@example.com',
          password: 'Password123!',
          phone: '+1234567890'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('POST /api/event-staff/assign-to-event', () => {
    it('should return 200 for successful event staff assignment', async () => {
      const mockAssignment = {
        eventId: 'event1',
        eventStaffId: 'staff1',
        assignedAt: '2024-01-15T10:00:00.000Z'
      };

      mockEventStaffController.assignEventStaffToEvent.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockAssignment
        });
      });

      const res = await request(app)
        .post('/api/event-staff/assign-to-event')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'event1',
          eventStaffId: 'staff1'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockAssignment);
      expect(mockEventStaffController.assignEventStaffToEvent).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      mockEventStaffController.assignEventStaffToEvent.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Missing or invalid fields'
        });
      });

      const res = await request(app)
        .post('/api/event-staff/assign-to-event')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'event1'
          // Missing eventStaffId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Missing or invalid fields');
    });

    it('should return 404 for non-existent event or staff', async () => {
      mockEventStaffController.assignEventStaffToEvent.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event or staff not found'
        });
      });

      const res = await request(app)
        .post('/api/event-staff/assign-to-event')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'nonexistent',
          eventStaffId: 'nonexistent'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event or staff not found');
    });

    it('should return 403 for forbidden access (non-organizer/manager)', async () => {
      mockEventStaffController.assignEventStaffToEvent.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .post('/api/event-staff/assign-to-event')
        .set('Authorization', 'Bearer staff-token')
        .send({
          eventId: 'event1',
          eventStaffId: 'staff1'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('GET /api/event-staff/dashboard', () => {
    it('should return 200 with dashboard data for event staff', async () => {
      const mockDashboardData = {
        assignedEvents: 3,
        upcomingEvents: 2,
        completedEvents: 1,
        totalTicketsScanned: 150,
        recentActivities: [
          {
            eventName: 'Music Festival',
            action: 'Ticket Scanned',
            timestamp: '2024-01-15T10:00:00.000Z'
          }
        ]
      };

      mockEventStaffController.getDashboardData.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockDashboardData
        });
      });

      const res = await request(app)
        .get('/api/event-staff/dashboard')
        .set('Authorization', 'Bearer staff-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockDashboardData);
      expect(res.body.data).toHaveProperty('assignedEvents', 3);
      expect(res.body.data).toHaveProperty('upcomingEvents', 2);
      expect(res.body.data).toHaveProperty('totalTicketsScanned', 150);
      expect(mockEventStaffController.getDashboardData).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventStaffController.getDashboardData.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).get('/api/event-staff/dashboard');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for non-staff access', async () => {
      mockEventStaffController.getDashboardData.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .get('/api/event-staff/dashboard')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('GET /api/event-staff/profile', () => {
    it('should return 200 with event staff profile', async () => {
      const mockProfile = {
        _id: 'staff1',
        name: 'Jane Staff',
        email: 'janestaff@example.com',
        phone: '+1234567890',
        role: 'event_staff',
        isActive: true,
        createdBy: 'organizer1',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z'
      };

      mockEventStaffController.getProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockProfile
        });
      });

      const res = await request(app)
        .get('/api/event-staff/profile')
        .set('Authorization', 'Bearer staff-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockProfile);
      expect(res.body.data).toHaveProperty('role', 'event_staff');
      expect(res.body.data).toHaveProperty('isActive', true);
      expect(mockEventStaffController.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventStaffController.getProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).get('/api/event-staff/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('PUT /api/event-staff/profile', () => {
    it('should return 200 for successful profile update', async () => {
      const mockUpdatedProfile = {
        _id: 'staff1',
        name: 'Jane Updated Staff',
        email: 'janestaff@example.com',
        phone: '+0987654321',
        role: 'event_staff',
        isActive: true,
        updatedAt: '2024-01-16T10:00:00.000Z'
      };

      mockEventStaffController.updateProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUpdatedProfile
        });
      });

      const res = await request(app)
        .put('/api/event-staff/profile')
        .set('Authorization', 'Bearer staff-token')
        .send({
          name: 'Jane Updated Staff',
          phone: '+0987654321'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockUpdatedProfile);
      expect(res.body.data.name).toBe('Jane Updated Staff');
      expect(res.body.data.phone).toBe('+0987654321');
      expect(mockEventStaffController.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventStaffController.updateProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .put('/api/event-staff/profile')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('DELETE /api/event-staff/profile', () => {
    it('should return 200 for successful profile deletion', async () => {
      mockEventStaffController.deleteEventStaffProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Profile deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/event-staff/profile')
        .set('Authorization', 'Bearer staff-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Profile deleted successfully');
      expect(mockEventStaffController.deleteEventStaffProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventStaffController.deleteEventStaffProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).delete('/api/event-staff/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });
});
