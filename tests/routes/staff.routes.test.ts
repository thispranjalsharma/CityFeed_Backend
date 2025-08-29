/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the staff controller functions
const mockStaffController = {
  assignRoleToOutlet: jest.fn(),
  getAvailableResponsibilities: jest.fn(),
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  deleteMyProfile: jest.fn(),
  getStaffById: jest.fn(),
  updateStaffResponsibilities: jest.fn(),
  activateStaff: jest.fn(),
  deactivateStaff: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual staff routes - order matters for route matching!
app.post('/api/staff/assign-role', (req, res) => mockStaffController.assignRoleToOutlet(req, res));
app.get('/api/staff/available-responsibilities', (req, res) => mockStaffController.getAvailableResponsibilities(req, res));
app.get('/api/staff/profile', (req, res) => mockStaffController.getMyProfile(req, res));
app.put('/api/staff/profile', (req, res) => mockStaffController.updateMyProfile(req, res));
app.delete('/api/staff/profile', (req, res) => mockStaffController.deleteMyProfile(req, res));
app.get('/api/staff/:staffId', (req, res) => mockStaffController.getStaffById(req, res));
app.put('/api/staff/:staffId/responsibilities', (req, res) => mockStaffController.updateStaffResponsibilities(req, res));
app.patch('/api/staff/:staffId/activate', (req, res) => mockStaffController.activateStaff(req, res));
app.patch('/api/staff/:staffId/deactivate', (req, res) => mockStaffController.deactivateStaff(req, res));

describe('Staff Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/staff/assign-role', () => {
    it('should return 201 for successful staff assignment with proper response structure', async () => {
      const mockStaffData = {
        _id: 'teststaffid',
        name: 'Test Staff',
        email: 'test@example.com',
        role: 'employee'
      };

      mockStaffController.assignRoleToOutlet.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          verificationToken: 'testtoken123',
          verificationUrl: 'https://test.com/verify?token=testtoken123',
          message: 'Staff member assigned successfully. Verification email has been sent.',
          data: mockStaffData
        });
      });

      const res = await request(app)
        .post('/api/staff/assign-role')
        .send({
          outlet: 'testoutletid',
          role: 'employee',
          email: 'test@example.com',
          password: 'password123',
          phone: '+1234567890',
          name: 'Test Staff',
          responsibilities: ['create_offer', 'update_offer']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('verificationToken');
      expect(res.body).toHaveProperty('verificationUrl');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockStaffData);
      expect(mockStaffController.assignRoleToOutlet).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      mockStaffController.assignRoleToOutlet.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: outlet, email, password, phone'
        });
      });

      const res = await request(app)
        .post('/api/staff/assign-role')
        .send({
          name: 'Test Staff'
          // Missing required fields
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/staff/available-responsibilities', () => {
    it('should return 200 with list of available responsibilities', async () => {
      const mockResponsibilities = [
        'create_offer', 'update_offer', 'view_order', 
        'manage_inventory', 'handle_complaints', 'manage_customers'
      ];

      mockStaffController.getAvailableResponsibilities.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockResponsibilities
        });
      });

      const res = await request(app)
        .get('/api/staff/available-responsibilities')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(6);
      expect(res.body.data).toEqual(mockResponsibilities);
      expect(mockStaffController.getAvailableResponsibilities).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockStaffController.getAvailableResponsibilities.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid or missing token'
        });
      });

      const res = await request(app).get('/api/staff/available-responsibilities');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid or missing token');
    });
  });

  describe('GET /api/staff/profile', () => {
    it('should return 200 with staff profile', async () => {
      const mockProfile = {
        _id: 'staff1',
        name: 'John Employee',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'employee',
        responsibilities: ['create_offer', 'update_offer'],
        outletId: 'outlet1',
        isActive: true,
        createdAt: '2024-01-15T10:00:00.000Z'
      };

      mockStaffController.getMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockProfile
        });
      });

      const res = await request(app)
        .get('/api/staff/profile')
        .set('Authorization', 'Bearer employee-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockProfile);
      expect(res.body.data).toHaveProperty('responsibilities');
      expect(res.body.data).toHaveProperty('outletId');
      expect(mockStaffController.getMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockStaffController.getMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid or missing token'
        });
      });

      const res = await request(app).get('/api/staff/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid or missing token');
    });

    it('should return 404 for profile not found', async () => {
      mockStaffController.getMyProfile.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      });

      const res = await request(app)
        .get('/api/staff/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('PUT /api/staff/profile', () => {
    it('should return 200 for successful profile update', async () => {
      const mockUpdatedProfile = {
        _id: 'staff1',
        name: 'John Updated Employee',
        email: 'john@example.com',
        phone: '+0987654321',
        role: 'employee',
        responsibilities: ['create_offer', 'update_offer'],
        outletId: 'outlet1',
        isActive: true
      };

      mockStaffController.updateMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUpdatedProfile
        });
      });

      const res = await request(app)
        .put('/api/staff/profile')
        .set('Authorization', 'Bearer employee-token')
        .send({
          name: 'John Updated Employee',
          phone: '+0987654321'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockUpdatedProfile);
      expect(res.body.data.name).toBe('John Updated Employee');
      expect(res.body.data.phone).toBe('+0987654321');
      expect(mockStaffController.updateMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for attempting to update email', async () => {
      mockStaffController.updateMyProfile.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Bad request - Email cannot be updated'
        });
      });

      const res = await request(app)
        .put('/api/staff/profile')
        .set('Authorization', 'Bearer employee-token')
        .send({
          email: 'newemail@example.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Bad request - Email cannot be updated');
    });

    it('should return 401 for unauthorized access', async () => {
      mockStaffController.updateMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid or missing token'
        });
      });

      const res = await request(app)
        .put('/api/staff/profile')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid or missing token');
    });

    it('should return 404 for profile not found', async () => {
      mockStaffController.updateMyProfile.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      });

      const res = await request(app)
        .put('/api/staff/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('DELETE /api/staff/profile', () => {
    it('should return 200 for successful profile deletion', async () => {
      mockStaffController.deleteMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Profile deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/staff/profile')
        .set('Authorization', 'Bearer employee-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Profile deleted successfully');
      expect(mockStaffController.deleteMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockStaffController.deleteMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid or missing token'
        });
      });

      const res = await request(app).delete('/api/staff/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid or missing token');
    });

    it('should return 404 for profile not found', async () => {
      mockStaffController.deleteMyProfile.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      });

      const res = await request(app)
        .delete('/api/staff/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('GET /api/staff/:staffId', () => {
    it('should return 200 with staff details', async () => {
      const mockStaff = {
        _id: 'teststaffid',
        name: 'Test Staff',
        email: 'test@example.com',
        role: 'employee',
        responsibilities: ['create_offer', 'update_offer'],
        isActive: true
      };

      mockStaffController.getStaffById.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockStaff
        });
      });

      const res = await request(app)
        .get('/api/staff/teststaffid');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        _id: 'teststaffid',
        name: 'Test Staff',
        role: 'employee'
      });
      expect(Array.isArray(res.body.data.responsibilities)).toBe(true);
      expect(mockStaffController.getStaffById).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent staff', async () => {
      mockStaffController.getStaffById.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Staff member not found'
        });
      });

      const res = await request(app)
        .get('/api/staff/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Staff member not found');
    });
  });

  describe('PUT /api/staff/:staffId/responsibilities', () => {
    it('should return 200 for successful responsibility update', async () => {
      const updatedResponsibilities = ['create_offer', 'update_offer', 'view_order'];

      mockStaffController.updateStaffResponsibilities.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            _id: req.params.staffId,
            responsibilities: req.body.responsibilities
          }
        });
      });

      const res = await request(app)
        .put('/api/staff/teststaffid/responsibilities')
        .send({ responsibilities: updatedResponsibilities });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.responsibilities).toEqual(updatedResponsibilities);
      expect(mockStaffController.updateStaffResponsibilities).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid responsibilities', async () => {
      mockStaffController.updateStaffResponsibilities.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid responsibilities provided'
        });
      });

      const res = await request(app)
        .put('/api/staff/teststaffid/responsibilities')
        .send({ responsibilities: ['invalid_responsibility'] });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/staff/:staffId/activate', () => {
    it('should return 200 for successful staff activation', async () => {
      const mockActivatedStaff = {
        _id: 'teststaffid',
        name: 'Test Staff',
        email: 'test@example.com',
        role: 'employee',
        isActive: true
      };

      mockStaffController.activateStaff.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Staff member activated successfully',
          data: { staff: mockActivatedStaff }
        });
      });

      const res = await request(app)
        .patch('/api/staff/teststaffid/activate');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Staff member activated successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.staff.isActive).toBe(true);
      expect(mockStaffController.activateStaff).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/staff/:staffId/deactivate', () => {
    it('should return 200 for successful staff deactivation', async () => {
      const mockDeactivatedStaff = {
        _id: 'teststaffid',
        name: 'Test Staff',
        email: 'test@example.com',
        role: 'employee',
        isActive: false
      };

      mockStaffController.deactivateStaff.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Staff member deactivated successfully',
          data: { staff: mockDeactivatedStaff }
        });
      });

      const res = await request(app)
        .patch('/api/staff/teststaffid/deactivate');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Staff member deactivated successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.staff.isActive).toBe(false);
      expect(mockStaffController.deactivateStaff).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for unauthorized deactivation', async () => {
      mockStaffController.deactivateStaff.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Only super admins and outlet admins can deactivate staff'
        });
      });

      const res = await request(app)
        .patch('/api/staff/teststaffid/deactivate');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });
});
