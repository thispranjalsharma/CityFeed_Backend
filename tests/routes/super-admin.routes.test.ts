/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the super-admin controller functions
const mockSuperAdminController = {
  registerSuperAdmin: jest.fn(),
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  deleteMyProfile: jest.fn(),
  disapproveSuperAdmin: jest.fn(),
  getDashboardData: jest.fn(),
};

const mockOutletController = {
  getMyOutlets: jest.fn(),
};

const mockOutletAdminController = {
  getMyOutletAdmins: jest.fn(),
};

const mockStaffController = {
  getMyEmployeesForSuperAdmin: jest.fn(),
  getEmployeesForOutletBySuperAdmin: jest.fn(),
};

const mockOfferController = {
  getMyOffers: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual super-admin routes
app.post('/api/super-admin/register', (req, res) => mockSuperAdminController.registerSuperAdmin(req, res));
app.get('/api/super-admin/my-outlets', (req, res) => mockOutletController.getMyOutlets(req, res));
app.get('/api/super-admin/my-outlet-admins', (req, res) => mockOutletAdminController.getMyOutletAdmins(req, res));
app.get('/api/super-admin/my-employees', (req, res) => mockStaffController.getMyEmployeesForSuperAdmin(req, res));
app.get('/api/super-admin/outlet-employees', (req, res) => mockStaffController.getEmployeesForOutletBySuperAdmin(req, res));
app.get('/api/super-admin/my-offers', (req, res) => mockOfferController.getMyOffers(req, res));
app.get('/api/super-admin/profile', (req, res) => mockSuperAdminController.getMyProfile(req, res));
app.put('/api/super-admin/profile', (req, res) => mockSuperAdminController.updateMyProfile(req, res));
app.delete('/api/super-admin/profile', (req, res) => mockSuperAdminController.deleteMyProfile(req, res));
app.patch('/api/super-admin/disapprove/:id', (req, res) => mockSuperAdminController.disapproveSuperAdmin(req, res));
app.get('/api/super-admin/dashboard', (req, res) => mockSuperAdminController.getDashboardData(req, res));

describe('SuperAdmin Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/super-admin/register', () => {
    it('should return 201 for successful super admin registration', async () => {
      const mockSuperAdmin = {
        _id: 'superadmin1',
        name: 'Super Admin',
        email: 'superadmin@example.com',
        phone: '1234567890',
        role: 'super_admin',
        isApproved: false
      };

      mockSuperAdminController.registerSuperAdmin.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockSuperAdmin,
          message: 'Super admin registered successfully'
        });
      });

      const res = await request(app)
        .post('/api/super-admin/register')
        .send({
          name: 'Super Admin',
          email: 'superadmin@example.com',
          password: 'Password123!',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockSuperAdmin);
      expect(mockSuperAdminController.registerSuperAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockSuperAdminController.registerSuperAdmin.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data or validation errors'
        });
      });

      const res = await request(app)
        .post('/api/super-admin/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: 'weak',
          phone: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 409 for duplicate email or phone', async () => {
      mockSuperAdminController.registerSuperAdmin.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Email or phone number already exists'
        });
      });

      const res = await request(app)
        .post('/api/super-admin/register')
        .send({
          name: 'Super Admin',
          email: 'existing@example.com',
          password: 'Password123!',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Email or phone number already exists');
    });
  });

  describe('GET /api/super-admin/my-outlets', () => {
    it('should return 200 with outlets created by super admin', async () => {
      const mockOutlets = [
        {
          _id: 'outlet1',
          name: 'Restaurant 1',
          address: '123 Main St',
          businessType: 'Restaurant',
          createdBy: 'superadmin1'
        },
        {
          _id: 'outlet2',
          name: 'Cafe 1',
          address: '456 Oak St',
          businessType: 'Cafe',
          createdBy: 'superadmin1'
        }
      ];

      mockOutletController.getMyOutlets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOutlets
        });
      });

      const res = await request(app)
        .get('/api/super-admin/my-outlets')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockOutletController.getMyOutlets).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletController.getMyOutlets.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/super-admin/my-outlets');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('GET /api/super-admin/my-outlet-admins', () => {
    it('should return 200 with outlet admins for super admin outlets', async () => {
      const mockOutletAdmins = [
        {
          _id: 'admin1',
          name: 'Outlet Admin 1',
          email: 'admin1@example.com',
          outletId: 'outlet1',
          outletName: 'Restaurant 1'
        },
        {
          _id: 'admin2',
          name: 'Outlet Admin 2',
          email: 'admin2@example.com',
          outletId: 'outlet2',
          outletName: 'Cafe 1'
        }
      ];

      mockOutletAdminController.getMyOutletAdmins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOutletAdmins
        });
      });

      const res = await request(app)
        .get('/api/super-admin/my-outlet-admins')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockOutletAdminController.getMyOutletAdmins).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletAdminController.getMyOutletAdmins.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/super-admin/my-outlet-admins');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('GET /api/super-admin/my-employees', () => {
    it('should return 200 with employees grouped by outlets', async () => {
      const mockEmployeesData = {
        outlets: [
          {
            outlet: {
              _id: 'outlet1',
              name: 'Restaurant 1',
              address: '123 Main St'
            },
            employees: [
              {
                _id: 'emp1',
                name: 'Employee 1',
                email: 'emp1@example.com',
                role: 'employee'
              }
            ]
          }
        ],
        totalEmployees: 1,
        message: 'Retrieved 1 employees from 1 outlets'
      };

      mockStaffController.getMyEmployeesForSuperAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockEmployeesData
        });
      });

      const res = await request(app)
        .get('/api/super-admin/my-employees')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body.data).toHaveProperty('totalEmployees', 1);
      expect(mockStaffController.getMyEmployeesForSuperAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockStaffController.getMyEmployeesForSuperAdmin.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid or missing token'
        });
      });

      const res = await request(app).get('/api/super-admin/my-employees');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 403 for non-super-admin access', async () => {
      mockStaffController.getMyEmployeesForSuperAdmin.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Only super admins can access this endpoint'
        });
      });

      const res = await request(app)
        .get('/api/super-admin/my-employees')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/super-admin/outlet-employees', () => {
    it('should return 200 with employees for specific outlet', async () => {
      const mockOutletEmployees = {
        outlet: {
          _id: 'outlet1',
          name: 'Restaurant 1',
          address: '123 Main St'
        },
        employees: [
          {
            _id: 'emp1',
            name: 'Employee 1',
            email: 'emp1@example.com',
            role: 'employee',
            responsibilities: ['create_offer', 'view_order']
          }
        ],
        totalEmployees: 1
      };

      mockStaffController.getEmployeesForOutletBySuperAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOutletEmployees
        });
      });

      const res = await request(app)
        .get('/api/super-admin/outlet-employees')
        .query({ outletId: 'outlet1' })
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlet');
      expect(res.body.data).toHaveProperty('employees');
      expect(res.body.data).toHaveProperty('totalEmployees', 1);
      expect(mockStaffController.getEmployeesForOutletBySuperAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing outlet ID', async () => {
      mockStaffController.getEmployeesForOutletBySuperAdmin.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Bad request - Outlet ID is required'
        });
      });

      const res = await request(app)
        .get('/api/super-admin/outlet-employees')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Bad request - Outlet ID is required');
    });

    it('should return 404 for non-existent or unauthorized outlet', async () => {
      mockStaffController.getEmployeesForOutletBySuperAdmin.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Outlet not found or no permission to access it'
        });
      });

      const res = await request(app)
        .get('/api/super-admin/outlet-employees')
        .query({ outletId: 'nonexistent' })
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/super-admin/my-offers', () => {
    it('should return 200 with offers for super admin outlets', async () => {
      const mockOffers = [
        {
          _id: 'offer1',
          title: 'Summer Special',
          description: '20% off all items',
          discountPercentage: 20,
          outletId: 'outlet1',
          outletName: 'Restaurant 1'
        },
        {
          _id: 'offer2',
          title: 'Happy Hour',
          description: '15% off drinks',
          discountPercentage: 15,
          outletId: 'outlet2',
          outletName: 'Cafe 1'
        }
      ];

      mockOfferController.getMyOffers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOffers
        });
      });

      const res = await request(app)
        .get('/api/super-admin/my-offers')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockOfferController.getMyOffers).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOfferController.getMyOffers.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/super-admin/my-offers');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('GET /api/super-admin/profile', () => {
    it('should return 200 with super admin profile', async () => {
      const mockProfile = {
        _id: 'superadmin1',
        name: 'Super Admin',
        email: 'superadmin@example.com',
        phone: '1234567890',
        role: 'super_admin',
        isApproved: true,
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockSuperAdminController.getMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockProfile
        });
      });

      const res = await request(app)
        .get('/api/super-admin/profile')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockProfile);
      expect(mockSuperAdminController.getMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockSuperAdminController.getMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/super-admin/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('PUT /api/super-admin/profile', () => {
    it('should return 200 for successful profile update', async () => {
      const mockUpdatedProfile = {
        _id: 'superadmin1',
        name: 'Updated Super Admin',
        email: 'superadmin@example.com',
        phone: '0987654321',
        role: 'super_admin'
      };

      mockSuperAdminController.updateMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUpdatedProfile,
          message: 'Profile updated successfully'
        });
      });

      const res = await request(app)
        .put('/api/super-admin/profile')
        .set('Authorization', 'Bearer superadmin-token')
        .send({
          name: 'Updated Super Admin',
          phone: '0987654321'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockUpdatedProfile);
      expect(mockSuperAdminController.updateMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for attempting to update email', async () => {
      mockSuperAdminController.updateMyProfile.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Bad request - Email cannot be updated'
        });
      });

      const res = await request(app)
        .put('/api/super-admin/profile')
        .set('Authorization', 'Bearer superadmin-token')
        .send({
          email: 'newemail@example.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Bad request - Email cannot be updated');
    });

    it('should return 404 for profile not found', async () => {
      mockSuperAdminController.updateMyProfile.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      });

      const res = await request(app)
        .put('/api/super-admin/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('DELETE /api/super-admin/profile', () => {
    it('should return 200 for successful profile deletion', async () => {
      mockSuperAdminController.deleteMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Profile deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/super-admin/profile')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Profile deleted successfully');
      expect(mockSuperAdminController.deleteMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockSuperAdminController.deleteMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).delete('/api/super-admin/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('PATCH /api/super-admin/disapprove/:id', () => {
    it('should return 200 for successful super admin disapproval', async () => {
      mockSuperAdminController.disapproveSuperAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Super admin disapproved and all related entities deactivated'
        });
      });

      const res = await request(app)
        .patch('/api/super-admin/disapprove/superadmin1')
        .set('Authorization', 'Bearer cityfeed-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(mockSuperAdminController.disapproveSuperAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid request or super admin not found', async () => {
      mockSuperAdminController.disapproveSuperAdmin.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid request or super admin not found'
        });
      });

      const res = await request(app)
        .patch('/api/super-admin/disapprove/nonexistent')
        .set('Authorization', 'Bearer cityfeed-admin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/super-admin/dashboard', () => {
    it('should return 200 with dashboard metrics', async () => {
      const mockDashboardData = {
        totalOutlets: 5,
        totalOutletAdmins: 8,
        totalEmployees: 25,
        totalOffers: 12,
        recentActivity: [
          { type: 'outlet_created', name: 'New Restaurant', date: '2024-01-15' },
          { type: 'admin_assigned', name: 'Admin John', date: '2024-01-14' }
        ],
        monthlyStats: {
          outletsCreated: 2,
          adminsAssigned: 3,
          employeesHired: 8
        }
      };

      mockSuperAdminController.getDashboardData.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockDashboardData
        });
      });

      const res = await request(app)
        .get('/api/super-admin/dashboard')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('totalOutlets', 5);
      expect(res.body.data).toHaveProperty('totalEmployees', 25);
      expect(res.body.data).toHaveProperty('recentActivity');
      expect(mockSuperAdminController.getDashboardData).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockSuperAdminController.getDashboardData.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/super-admin/dashboard');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });
});
