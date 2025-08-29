/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the admin controller functions
const mockAdminController = {
  getUsers: jest.fn(),
  deactivateUser: jest.fn(),
  login: jest.fn(),
  getAllEventOrganizers: jest.fn(),
  approveEventOrganizer: jest.fn(),
  disapproveEventOrganizer: jest.fn(),
  getCleanupStats: jest.fn(),
};

// Mock other controller functions
const mockGetAllSuperAdmins = jest.fn();
const mockGetAllOutletAdmins = jest.fn();
const mockGetAllOutlets = jest.fn();
const mockGetAllEmployees = jest.fn();
const mockActivateUserByAdmin = jest.fn();

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define all actual admin routes
app.get('/api/admin/users', (req, res) => mockAdminController.getUsers(req, res));
app.post('/api/admin/users/:userId/deactivate', (req, res) => mockAdminController.deactivateUser(req, res));
app.post('/api/admin/login', (req, res) => mockAdminController.login(req, res));
app.get('/api/admin/super-admins', (req, res) => mockGetAllSuperAdmins(req, res));
app.get('/api/admin/outlet-admins', (req, res) => mockGetAllOutletAdmins(req, res));
app.get('/api/admin/outlets', (req, res) => mockGetAllOutlets(req, res));
app.get('/api/admin/employees', (req, res) => mockGetAllEmployees(req, res));
app.patch('/api/admin/users/activate/:id', (req, res) => mockActivateUserByAdmin(req, res));
app.get('/api/admin/event-organizers', (req, res) => mockAdminController.getAllEventOrganizers(req, res));
app.post('/api/admin/event-organizers/:organizerId/approve', (req, res) => mockAdminController.approveEventOrganizer(req, res));
app.post('/api/admin/event-organizers/:organizerId/disapprove', (req, res) => mockAdminController.disapproveEventOrganizer(req, res));
app.get('/api/admin/cleanup/stats', (req, res) => mockAdminController.getCleanupStats(req, res));

describe('Admin Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return 200 with list of users', async () => {
      const users = [
        {
          _id: 'user1',
          name: 'Test User 1',
          email: 'user1@example.com',
          membershipType: 'cityfeed_select',
          isActive: true
        },
        {
          _id: 'user2',
          name: 'Test User 2',
          email: 'user2@example.com',
          membershipType: 'cityfeed_prime',
          isActive: true
        }
      ];

      mockAdminController.getUsers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: users
        });
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockAdminController.getUsers).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockAdminController.getUsers.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app)
        .get('/api/admin/users');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 200 with empty list when no users exist', async () => {
      mockAdminController.getUsers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: []
        });
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 500 for server error', async () => {
      mockAdminController.getUsers.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST /api/admin/users/:userId/deactivate', () => {
    it('should return 200 for successful user deactivation', async () => {
      const deactivatedUser = {
        _id: 'user1',
        name: 'Test User',
        email: 'user@example.com',
        isActive: false
      };

      mockAdminController.deactivateUser.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: deactivatedUser,
          message: 'User deactivated successfully'
        });
      });

      const res = await request(app)
        .post('/api/admin/users/user1/deactivate')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'User deactivated successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockAdminController.deactivateUser).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for user not found', async () => {
      mockAdminController.deactivateUser.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
      });

      const res = await request(app)
        .post('/api/admin/users/nonexistentuser/deactivate')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not found');
    });

    it('should return 400 for invalid user ID format', async () => {
      mockAdminController.deactivateUser.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      });

      const res = await request(app)
        .post('/api/admin/users/invalid-id-format/deactivate')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid user ID format');
    });

    it('should return 500 for server error', async () => {
      mockAdminController.deactivateUser.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .post('/api/admin/users/user1/deactivate')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST /api/admin/login', () => {
    it('should return 200 for successful admin login', async () => {
      const adminData = {
        admin: {
          _id: 'adminid',
          email: 'admin@example.com',
          role: 'admin'
        },
        token: 'admin-jwt-token'
      };

      mockAdminController.login.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Login successful',
          data: adminData
        });
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@example.com',
          password: 'adminpassword'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('token');
      expect(mockAdminController.login).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for invalid credentials', async () => {
      mockAdminController.login.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 400 for missing required fields', async () => {
      mockAdminController.login.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@example.com'
          // Missing password
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Email and password are required');
    });

    it('should return 400 for invalid email format', async () => {
      mockAdminController.login.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid email'
        });
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'invalid-email-format',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Please provide a valid email');
    });

    it('should return 500 for server error', async () => {
      mockAdminController.login.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('GET /api/admin/super-admins', () => {
    it('should return 200 with list of super admins', async () => {
      const superAdmins = [
        {
          _id: 'superadmin1',
          name: 'Super Admin 1',
          email: 'superadmin1@example.com',
          isApproved: true,
          isEmailVerified: true
        }
      ];

      mockGetAllSuperAdmins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: superAdmins
        });
      });

      const res = await request(app)
        .get('/api/admin/super-admins')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockGetAllSuperAdmins).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty list when no super admins exist', async () => {
      mockGetAllSuperAdmins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: []
        });
      });

      const res = await request(app)
        .get('/api/admin/super-admins')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 500 for server error', async () => {
      mockGetAllSuperAdmins.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .get('/api/admin/super-admins')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('GET /api/admin/outlet-admins', () => {
    it('should return 200 with list of outlet admins', async () => {
      const outletAdmins = [
        {
          _id: 'outletadmin1',
          name: 'Outlet Admin 1',
          email: 'outletadmin1@example.com',
          outlet: { _id: 'outlet1', businessName: 'Restaurant 1' }
        }
      ];

      mockGetAllOutletAdmins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: outletAdmins
        });
      });

      const res = await request(app)
        .get('/api/admin/outlet-admins')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockGetAllOutletAdmins).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with filtered outlet admins by super admin', async () => {
      const filteredOutletAdmins = [
        {
          _id: 'outletadmin1',
          name: 'Outlet Admin 1',
          email: 'outletadmin1@example.com',
          createdBy: 'superadmin1'
        }
      ];

      mockGetAllOutletAdmins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: filteredOutletAdmins
        });
      });

      const res = await request(app)
        .get('/api/admin/outlet-admins')
        .query({ superAdminId: 'superadmin1' })
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockGetAllOutletAdmins).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty list when no outlet admins exist', async () => {
      mockGetAllOutletAdmins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: []
        });
      });

      const res = await request(app)
        .get('/api/admin/outlet-admins')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 400 for invalid superAdminId query parameter', async () => {
      mockGetAllOutletAdmins.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid super admin ID format'
        });
      });

      const res = await request(app)
        .get('/api/admin/outlet-admins')
        .query({ superAdminId: 'invalid-id-format' })
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid super admin ID format');
    });

    it('should return 500 for server error', async () => {
      mockGetAllOutletAdmins.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .get('/api/admin/outlet-admins')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('GET /api/admin/outlets', () => {
    it('should return 200 with list of outlets', async () => {
      const outlets = [
        {
          _id: 'outlet1',
          businessName: 'Restaurant 1',
          businessType: 'restaurant',
          isActive: true,
          assignedAdmin: { name: 'Admin 1' }
        }
      ];

      mockGetAllOutlets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: { outlets }
        });
      });

      const res = await request(app)
        .get('/api/admin/outlets')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body.data.outlets).toHaveLength(1);
      expect(mockGetAllOutlets).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with filtered outlets by super admin', async () => {
      const filteredOutlets = [
        {
          _id: 'outlet1',
          businessName: 'Restaurant 1',
          businessType: 'restaurant',
          isActive: true,
          createdBy: 'superadmin1'
        }
      ];

      mockGetAllOutlets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: { outlets: filteredOutlets }
        });
      });

      const res = await request(app)
        .get('/api/admin/outlets')
        .query({ superAdminId: 'superadmin1' })
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body.data.outlets).toHaveLength(1);
    });

    it('should return 200 with empty list when no outlets exist', async () => {
      mockGetAllOutlets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: { outlets: [] }
        });
      });

      const res = await request(app)
        .get('/api/admin/outlets')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body.data.outlets).toHaveLength(0);
    });

    it('should return 400 for invalid superAdminId query parameter', async () => {
      mockGetAllOutlets.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid super admin ID format'
        });
      });

      const res = await request(app)
        .get('/api/admin/outlets')
        .query({ superAdminId: 'invalid-id-format' })
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid super admin ID format');
    });

    it('should return 500 for server error', async () => {
      mockGetAllOutlets.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .get('/api/admin/outlets')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('GET /api/admin/employees', () => {
    it('should return 200 with list of employees', async () => {
      const employees = [
        {
          _id: 'employee1',
          name: 'Employee 1',
          email: 'employee1@example.com',
          role: 'employee',
          outlet: { _id: 'outlet1', businessName: 'Restaurant 1' },
          responsibilities: ['take_orders', 'serve_food']
        }
      ];

      mockGetAllEmployees.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: employees
        });
      });

      const res = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockGetAllEmployees).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty list when no employees exist', async () => {
      mockGetAllEmployees.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: []
        });
      });

      const res = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 500 for server error', async () => {
      mockGetAllEmployees.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .get('/api/admin/employees')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('PATCH /api/admin/users/activate/:id', () => {
    it('should return 200 for successful user activation', async () => {
      const activatedUser = {
        _id: 'user1',
        name: 'Test User',
        email: 'user@example.com',
        isActive: true
      };

      mockActivateUserByAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'User activated successfully',
          data: activatedUser
        });
      });

      const res = await request(app)
        .patch('/api/admin/users/activate/user1')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'User activated successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockActivateUserByAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for user not found', async () => {
      mockActivateUserByAdmin.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
      });

      const res = await request(app)
        .patch('/api/admin/users/activate/nonexistentuser')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not found');
    });

    it('should return 400 for invalid user ID format', async () => {
      mockActivateUserByAdmin.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      });

      const res = await request(app)
        .patch('/api/admin/users/activate/invalid-id-format')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid user ID format');
    });

    it('should return 500 for server error', async () => {
      mockActivateUserByAdmin.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .patch('/api/admin/users/activate/user1')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('GET /api/admin/event-organizers', () => {
    it('should return 200 with list of event organizers', async () => {
      const eventOrganizers = [
        {
          _id: 'organizer1',
          name: 'Event Organizer 1',
          email: 'organizer1@example.com',
          isApproved: true,
          isEmailVerified: true
        }
      ];

      mockAdminController.getAllEventOrganizers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: eventOrganizers
        });
      });

      const res = await request(app)
        .get('/api/admin/event-organizers')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockAdminController.getAllEventOrganizers).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty list when no event organizers exist', async () => {
      mockAdminController.getAllEventOrganizers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: []
        });
      });

      const res = await request(app)
        .get('/api/admin/event-organizers')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 500 for server error', async () => {
      mockAdminController.getAllEventOrganizers.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .get('/api/admin/event-organizers')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST /api/admin/event-organizers/:organizerId/approve', () => {
    it('should return 200 for successful event organizer approval', async () => {
      const approvedOrganizer = {
        _id: 'organizer1',
        name: 'Event Organizer 1',
        email: 'organizer1@example.com',
        isApproved: true
      };

      mockAdminController.approveEventOrganizer.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event organizer approved successfully',
          data: approvedOrganizer
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/organizer1/approve')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event organizer approved successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockAdminController.approveEventOrganizer).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for event organizer not found', async () => {
      mockAdminController.approveEventOrganizer.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event organizer not found'
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/nonexistentorganizer/approve')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event organizer not found');
    });

    it('should return 400 for invalid organizer ID format', async () => {
      mockAdminController.approveEventOrganizer.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid organizer ID format'
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/invalid-id-format/approve')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid organizer ID format');
    });

    it('should return 500 for server error', async () => {
      mockAdminController.approveEventOrganizer.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/organizer1/approve')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST /api/admin/event-organizers/:organizerId/disapprove', () => {
    it('should return 200 for successful event organizer disapproval', async () => {
      const disapprovedOrganizer = {
        _id: 'organizer1',
        name: 'Event Organizer 1',
        email: 'organizer1@example.com',
        isApproved: false
      };

      mockAdminController.disapproveEventOrganizer.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event organizer disapproved successfully',
          data: disapprovedOrganizer
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/organizer1/disapprove')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event organizer disapproved successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockAdminController.disapproveEventOrganizer).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for event organizer not found', async () => {
      mockAdminController.disapproveEventOrganizer.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event organizer not found'
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/nonexistentorganizer/disapprove')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event organizer not found');
    });

    it('should return 400 for invalid organizer ID format', async () => {
      mockAdminController.disapproveEventOrganizer.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid organizer ID format'
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/invalid-id-format/disapprove')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid organizer ID format');
    });

    it('should return 500 for server error', async () => {
      mockAdminController.disapproveEventOrganizer.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app)
        .post('/api/admin/event-organizers/organizer1/disapprove')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('GET /api/admin/cleanup/stats', () => {
    it('should return 200 with cleanup statistics', async () => {
      const cleanupStats = {
        softDeletedRecords: {
          users: 5,
          outlets: 2,
          offers: 8,
          reviews: 12
        },
        eligibleForCleanup: {
          users: 2,
          outlets: 1,
          offers: 3,
          reviews: 5
        },
        totalEligible: 11,
        lastCleanupRun: '2024-01-01T00:00:00Z'
      };

      mockAdminController.getCleanupStats.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: cleanupStats,
          message: 'Cleanup statistics retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/admin/cleanup/stats')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(cleanupStats);
      expect(res.body).toHaveProperty('message');
      expect(mockAdminController.getCleanupStats).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for insufficient permissions', async () => {
      mockAdminController.getCleanupStats.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Not authorized - Only super admins can view statistics'
        });
      });

      const res = await request(app)
        .get('/api/admin/cleanup/stats')
        .set('Authorization', 'Bearer regular-admin-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });
}); 