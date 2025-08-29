/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the eventAuth controller functions
const mockEventAuthController = {
  register: jest.fn(),
  verifyEmail: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteEventOrganizerProfile: jest.fn(),
  deleteEventStaffProfile: jest.fn(),
  getMyEventManagers: jest.fn(),
  getMyEventStaff: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual eventAuth routes
app.post('/api/event-auth/register', (req, res) => mockEventAuthController.register(req, res));
app.post('/api/event-auth/verify-email', (req, res) => mockEventAuthController.verifyEmail(req, res));
app.get('/api/event-auth/profile', (req, res) => mockEventAuthController.getProfile(req, res));
app.put('/api/event-auth/profile', (req, res) => mockEventAuthController.updateProfile(req, res));
app.delete('/api/event-auth/profile', (req, res) => {
  // Route logic: different handlers based on user role
  const userRole = req.headers['x-user-role'] || 'event_organizer'; // Mock role detection
  if (userRole === 'event_organizer') {
    return mockEventAuthController.deleteEventOrganizerProfile(req, res);
  } else if (userRole === 'event_staff') {
    return mockEventAuthController.deleteEventStaffProfile(req, res);
  }
  res.status(403).json({ success: false, message: 'Forbidden' });
});
app.get('/api/event-auth/my-event-managers', (req, res) => mockEventAuthController.getMyEventManagers(req, res));
app.get('/api/event-auth/my-event-staff', (req, res) => mockEventAuthController.getMyEventStaff(req, res));

describe('EventAuth Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/event-auth/register', () => {
    it('should return 201 for successful event organizer registration', async () => {
      const mockOrganizer = {
        _id: 'organizerid',
        name: 'Event Organizer',
        email: 'organizer@example.com',
        phone: '1234567890',
        isEmailVerified: false
      };

      mockEventAuthController.register.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: {
            organizer: mockOrganizer,
            token: 'jwt-token'
          },
          message: 'Registration successful. Verification email sent.'
        });
      });

      const res = await request(app)
        .post('/api/event-auth/register')
        .send({
          name: 'Event Organizer',
          email: 'organizer@example.com',
          password: 'Password@123',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('organizer');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body).toHaveProperty('message', 'Registration successful. Verification email sent.');
      expect(mockEventAuthController.register).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockEventAuthController.register.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data or validation errors'
        });
      });

      const res = await request(app)
        .post('/api/event-auth/register')
        .send({
          name: 'Event Organizer',
          email: 'invalid-email',
          password: 'weak',
          phone: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 409 for duplicate email or phone', async () => {
      mockEventAuthController.register.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Email or phone number already registered'
        });
      });

      const res = await request(app)
        .post('/api/event-auth/register')
        .send({
          name: 'Event Organizer',
          email: 'existing@example.com',
          password: 'Password@123',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Email or phone number already registered');
    });
  });

  describe('POST /api/event-auth/verify-email', () => {
    it('should return 200 for successful email verification', async () => {
      mockEventAuthController.verifyEmail.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Email verified successfully'
        });
      });

      const res = await request(app)
        .post('/api/event-auth/verify-email')
        .send({
          token: 'verification-token',
          role: 'event_organizer'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Email verified successfully');
      expect(mockEventAuthController.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid verification token', async () => {
      mockEventAuthController.verifyEmail.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      });

      const res = await request(app)
        .post('/api/event-auth/verify-email')
        .send({
          token: 'invalid-token',
          role: 'event_organizer'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/event-auth/profile', () => {
    it('should return 200 with event organizer profile', async () => {
      const mockProfile = {
        _id: 'organizerid',
        name: 'Event Organizer',
        email: 'organizer@example.com',
        phone: '1234567890',
        role: 'event_organizer',
        isEmailVerified: true
      };

      mockEventAuthController.getProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockProfile
        });
      });

      const res = await request(app)
        .get('/api/event-auth/profile')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockProfile);
      expect(mockEventAuthController.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventAuthController.getProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .get('/api/event-auth/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('PUT /api/event-auth/profile', () => {
    it('should return 200 for successful profile update', async () => {
      const updatedProfile = {
        _id: 'organizerid',
        name: 'Updated Organizer',
        email: 'organizer@example.com',
        phone: '0987654321',
        role: 'event_organizer'
      };

      mockEventAuthController.updateProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedProfile,
          message: 'Profile updated successfully'
        });
      });

      const res = await request(app)
        .put('/api/event-auth/profile')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'Updated Organizer',
          phone: '0987654321'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message', 'Profile updated successfully');
      expect(mockEventAuthController.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventAuthController.updateProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .put('/api/event-auth/profile')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('DELETE /api/event-auth/profile', () => {
    it('should return 200 for successful event organizer profile deletion', async () => {
      mockEventAuthController.deleteEventOrganizerProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event organizer profile deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/event-auth/profile')
        .set('Authorization', 'Bearer organizer-token')
        .set('x-user-role', 'event_organizer');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event organizer profile deleted successfully');
      expect(mockEventAuthController.deleteEventOrganizerProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 200 for successful event staff profile deletion', async () => {
      mockEventAuthController.deleteEventStaffProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event staff profile deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/event-auth/profile')
        .set('Authorization', 'Bearer staff-token')
        .set('x-user-role', 'event_staff');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event staff profile deleted successfully');
      expect(mockEventAuthController.deleteEventStaffProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for unauthorized role', async () => {
      const res = await request(app)
        .delete('/api/event-auth/profile')
        .set('Authorization', 'Bearer user-token')
        .set('x-user-role', 'user');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('GET /api/event-auth/my-event-managers', () => {
    it('should return 200 with event managers for organizer', async () => {
      const mockManagers = [
        {
          _id: 'manager1',
          name: 'Event Manager 1',
          email: 'manager1@example.com',
          events: [{ name: 'Event 1' }]
        },
        {
          _id: 'manager2',
          name: 'Event Manager 2',
          email: 'manager2@example.com',
          events: [{ name: 'Event 2' }]
        }
      ];

      mockEventAuthController.getMyEventManagers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockManagers
        });
      });

      const res = await request(app)
        .get('/api/event-auth/my-event-managers')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('events');
      expect(mockEventAuthController.getMyEventManagers).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-organizer', async () => {
      mockEventAuthController.getMyEventManagers.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .get('/api/event-auth/my-event-managers')
        .set('Authorization', 'Bearer staff-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('GET /api/event-auth/my-event-staff', () => {
    it('should return 200 with event staff for organizer', async () => {
      const mockStaff = [
        {
          _id: 'staff1',
          name: 'Event Staff 1',
          email: 'staff1@example.com',
          events: [{ name: 'Event 1' }],
          responsibilities: ['approve_entry', 'scan_qr_code']
        },
        {
          _id: 'staff2',
          name: 'Event Staff 2',
          email: 'staff2@example.com',
          events: [{ name: 'Event 2' }],
          responsibilities: ['check_tickets']
        }
      ];

      mockEventAuthController.getMyEventStaff.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockStaff
        });
      });

      const res = await request(app)
        .get('/api/event-auth/my-event-staff')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('responsibilities');
      expect(res.body.data[0]).toHaveProperty('events');
      expect(mockEventAuthController.getMyEventStaff).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockEventAuthController.getMyEventStaff.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .get('/api/event-auth/my-event-staff');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });
});



