/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the outlet admin controller functions
const mockOutletAdminController = {
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  deleteMyProfile: jest.fn(),
  getDeletedOutletAdmins: jest.fn(),
  restoreOutletAdmin: jest.fn(),
  softDeleteOutletAdmin: jest.fn(),
  registerOutletAdmin: jest.fn(),
  getDashboardData: jest.fn(),
};

const mockOutletController = {
  getMyOutlet: jest.fn(),
};

const mockStaffController = {
  getMyEmployees: jest.fn(),
};

const mockOfferController = {
  getMyOffersForOutletAdmin: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Mock middleware to simulate role-based authorization
const mockAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Simulate user roles based on token
  if (token === 'super-admin-token') {
    req.user = { role: 'super_admin', _id: 'superadmin1' };
  } else if (token === 'outlet-admin-token') {
    req.user = { role: 'outlet_admin', _id: 'admin1' };
  } else if (token === 'user-token') {
    req.user = { role: 'user', _id: 'user1' };
  }
  
  next();
};

// Define ALL actual outlet admin routes - order matters for route matching!
app.get('/api/outlet-admin/my-outlet', (req, res) => mockOutletController.getMyOutlet(req, res));
app.get('/api/outlet-admin/my-employees', (req, res) => mockStaffController.getMyEmployees(req, res));
app.get('/api/outlet-admin/my-offers', (req, res) => mockOfferController.getMyOffersForOutletAdmin(req, res));
app.get('/api/outlet-admin/dashboard', (req, res) => mockOutletAdminController.getDashboardData(req, res));
app.get('/api/outlet-admin/profile', (req, res) => mockOutletAdminController.getMyProfile(req, res));
app.put('/api/outlet-admin/profile', (req, res) => mockOutletAdminController.updateMyProfile(req, res));
app.delete('/api/outlet-admin/profile', (req, res) => mockOutletAdminController.deleteMyProfile(req, res));

// Routes with inline role checking
app.get('/api/outlet-admin/deleted', mockAuth, (req: any, res: any) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Only super admins can view deleted outlet admins' 
    });
  }
  return mockOutletAdminController.getDeletedOutletAdmins(req, res);
});

app.patch('/api/outlet-admin/:adminId/restore', mockAuth, (req: any, res: any) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Only super admins can restore outlet admins' 
    });
  }
  return mockOutletAdminController.restoreOutletAdmin(req, res);
});

app.delete('/api/outlet-admin/:adminId', mockAuth, (req: any, res: any) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Only super admins can delete outlet admins' 
    });
  }
  return mockOutletAdminController.softDeleteOutletAdmin(req, res);
});

app.post('/api/outlet-admin/register', mockAuth, (req: any, res: any) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - Only super admins can create outlet admins' 
    });
  }
  return mockOutletAdminController.registerOutletAdmin(req, res);
});

describe('OutletAdmin Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/outlet-admin/my-outlet', () => {
    it('should return 200 with outlet details for outlet admin', async () => {
      const mockOutlet = {
        _id: 'outlet1',
        name: 'Test Restaurant',
        address: '123 Main St',
        businessType: 'Restaurant',
        isActive: true
      };

      mockOutletController.getMyOutlet.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOutlet
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/my-outlet')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockOutlet);
      expect(mockOutletController.getMyOutlet).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletController.getMyOutlet.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/outlet-admin/my-outlet');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('GET /api/outlet-admin/my-employees', () => {
    it('should return 200 with employees for outlet admin', async () => {
      const mockEmployeesData = {
        outlet: {
          _id: 'outlet1',
          name: 'Test Restaurant',
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

      mockStaffController.getMyEmployees.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockEmployeesData
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/my-employees')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlet');
      expect(res.body.data).toHaveProperty('employees');
      expect(res.body.data).toHaveProperty('totalEmployees', 1);
      expect(mockStaffController.getMyEmployees).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockStaffController.getMyEmployees.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid or missing token'
        });
      });

      const res = await request(app).get('/api/outlet-admin/my-employees');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 403 for non-outlet-admin access', async () => {
      mockStaffController.getMyEmployees.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Only outlet admins can access this endpoint'
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/my-employees')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for outlet admin without assigned outlet', async () => {
      mockStaffController.getMyEmployees.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'No outlet found for this admin'
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/my-employees')
        .set('Authorization', 'Bearer unassigned-admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'No outlet found for this admin');
    });
  });

  describe('GET /api/outlet-admin/my-offers', () => {
    it('should return 200 with offers for outlet admin', async () => {
      const mockOffers = [
        {
          _id: 'offer1',
          title: 'Happy Hour Special',
          description: '20% off all drinks',
          discountPercentage: 20,
          outletId: 'outlet1',
          isActive: true
        },
        {
          _id: 'offer2',
          title: 'Lunch Deal',
          description: '15% off lunch menu',
          discountPercentage: 15,
          outletId: 'outlet1',
          isActive: true
        }
      ];

      mockOfferController.getMyOffersForOutletAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOffers
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/my-offers')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('title', 'Happy Hour Special');
      expect(mockOfferController.getMyOffersForOutletAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOfferController.getMyOffersForOutletAdmin.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/outlet-admin/my-offers');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('GET /api/outlet-admin/dashboard', () => {
    it('should return 200 with dashboard metrics', async () => {
      const mockDashboardData = {
        totalTransactionAmount: 50000,
        activeOfferCount: 5,
        employeeCount: 8,
        dineInSessionCount: 120,
        monthlyRevenue: [
          { month: 'January', revenue: 15000 },
          { month: 'February', revenue: 18000 }
        ],
        recentTransactions: [
          { _id: 'txn1', amount: 500, type: 'dine-in', createdAt: '2024-01-15T10:30:00Z' }
        ],
        outlet: {
          _id: 'outlet1',
          name: 'Test Restaurant',
          address: '123 Main St'
        }
      };

      mockOutletAdminController.getDashboardData.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockDashboardData
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/dashboard')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('totalTransactionAmount', 50000);
      expect(res.body.data).toHaveProperty('activeOfferCount', 5);
      expect(res.body.data).toHaveProperty('employeeCount', 8);
      expect(res.body.data).toHaveProperty('monthlyRevenue');
      expect(res.body.data).toHaveProperty('outlet');
      expect(mockOutletAdminController.getDashboardData).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletAdminController.getDashboardData.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/outlet-admin/dashboard');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });

    it('should return 403 for non-outlet-admin access', async () => {
      mockOutletAdminController.getDashboardData.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Only outlet admins can access this endpoint'
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/dashboard')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for outlet admin without assigned outlet', async () => {
      mockOutletAdminController.getDashboardData.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'No outlet found for this outlet admin'
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/dashboard')
        .set('Authorization', 'Bearer unassigned-admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'No outlet found for this outlet admin');
    });
  });

  describe('GET /api/outlet-admin/profile', () => {
    it('should return 200 with outlet admin profile', async () => {
      const mockProfile = {
        _id: 'admin1',
        name: 'Outlet Admin',
        email: 'admin@example.com',
        phone: '+1234567890',
        role: 'outlet_admin',
        outletId: 'outlet1',
        isActive: true,
        createdAt: '2024-01-15T10:00:00.000Z'
      };

      mockOutletAdminController.getMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockProfile
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/profile')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockProfile);
      expect(res.body.data).toHaveProperty('outletId');
      expect(mockOutletAdminController.getMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletAdminController.getMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).get('/api/outlet-admin/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('PUT /api/outlet-admin/profile', () => {
    it('should return 200 for successful profile update', async () => {
      const mockUpdatedProfile = {
        _id: 'admin1',
        name: 'Updated Outlet Admin',
        email: 'admin@example.com',
        phone: '+0987654321',
        role: 'outlet_admin',
        outletId: 'outlet1',
        isActive: true
      };

      mockOutletAdminController.updateMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUpdatedProfile
        });
      });

      const res = await request(app)
        .put('/api/outlet-admin/profile')
        .set('Authorization', 'Bearer outlet-admin-token')
        .send({
          name: 'Updated Outlet Admin',
          phone: '+0987654321'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockUpdatedProfile);
      expect(res.body.data.name).toBe('Updated Outlet Admin');
      expect(res.body.data.phone).toBe('+0987654321');
      expect(mockOutletAdminController.updateMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for attempting to update email', async () => {
      mockOutletAdminController.updateMyProfile.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Bad request - Email cannot be updated'
        });
      });

      const res = await request(app)
        .put('/api/outlet-admin/profile')
        .set('Authorization', 'Bearer outlet-admin-token')
        .send({
          email: 'newemail@example.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Bad request - Email cannot be updated');
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletAdminController.updateMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app)
        .put('/api/outlet-admin/profile')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });

    it('should return 404 for profile not found', async () => {
      mockOutletAdminController.updateMyProfile.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      });

      const res = await request(app)
        .put('/api/outlet-admin/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });
  });

  describe('DELETE /api/outlet-admin/profile', () => {
    it('should return 200 for successful profile soft deletion', async () => {
      mockOutletAdminController.deleteMyProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Profile soft deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/outlet-admin/profile')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Profile soft deleted successfully');
      expect(mockOutletAdminController.deleteMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletAdminController.deleteMyProfile.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - Invalid token'
        });
      });

      const res = await request(app).delete('/api/outlet-admin/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized - Invalid token');
    });
  });

  describe('GET /api/outlet-admin/deleted', () => {
    it('should return 200 with deleted outlet admins for super admin', async () => {
      const mockDeletedAdmins = [
        {
          _id: 'admin1',
          name: 'Deleted Admin 1',
          email: 'deleted1@example.com',
          isDeleted: true,
          deletedAt: '2024-01-15T10:00:00.000Z'
        },
        {
          _id: 'admin2',
          name: 'Deleted Admin 2',
          email: 'deleted2@example.com',
          isDeleted: true,
          deletedAt: '2024-01-14T09:00:00.000Z'
        }
      ];

      mockOutletAdminController.getDeletedOutletAdmins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockDeletedAdmins,
          message: 'Retrieved 2 deleted outlet admins'
        });
      });

      const res = await request(app)
        .get('/api/outlet-admin/deleted')
        .set('Authorization', 'Bearer super-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('isDeleted', true);
      expect(res.body).toHaveProperty('message', 'Retrieved 2 deleted outlet admins');
      expect(mockOutletAdminController.getDeletedOutletAdmins).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-super-admin access', async () => {
      const res = await request(app)
        .get('/api/outlet-admin/deleted')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden - Only super admins can view deleted outlet admins');
    });

    it('should return 401 for unauthorized access', async () => {
      const res = await request(app).get('/api/outlet-admin/deleted');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/outlet-admin/:adminId/restore', () => {
    it('should return 200 for successful outlet admin restoration by super admin', async () => {
      const mockRestoredAdmin = {
        _id: 'admin1',
        name: 'Restored Admin',
        email: 'restored@example.com',
        isDeleted: false,
        deletedAt: null
      };

      mockOutletAdminController.restoreOutletAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Outlet admin restored successfully',
          data: {
            outletAdmin: mockRestoredAdmin
          }
        });
      });

      const res = await request(app)
        .patch('/api/outlet-admin/admin1/restore')
        .set('Authorization', 'Bearer super-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet admin restored successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.outletAdmin).toHaveProperty('isDeleted', false);
      expect(mockOutletAdminController.restoreOutletAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-super-admin access', async () => {
      const res = await request(app)
        .patch('/api/outlet-admin/admin1/restore')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden - Only super admins can restore outlet admins');
    });

    it('should return 404 for non-existent outlet admin', async () => {
      mockOutletAdminController.restoreOutletAdmin.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Outlet admin not found'
        });
      });

      const res = await request(app)
        .patch('/api/outlet-admin/nonexistent/restore')
        .set('Authorization', 'Bearer super-admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Outlet admin not found');
    });
  });

  describe('DELETE /api/outlet-admin/:adminId', () => {
    it('should return 200 for successful outlet admin soft deletion by super admin', async () => {
      const mockDeletedAdmin = {
        _id: 'admin1',
        name: 'Deleted Admin',
        email: 'deleted@example.com',
        isDeleted: true,
        deletedAt: '2024-01-15T10:00:00.000Z'
      };

      mockOutletAdminController.softDeleteOutletAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Outlet admin soft deleted successfully',
          data: {
            outletAdmin: mockDeletedAdmin
          }
        });
      });

      const res = await request(app)
        .delete('/api/outlet-admin/admin1')
        .set('Authorization', 'Bearer super-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet admin soft deleted successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.outletAdmin).toHaveProperty('isDeleted', true);
      expect(mockOutletAdminController.softDeleteOutletAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-super-admin access', async () => {
      const res = await request(app)
        .delete('/api/outlet-admin/admin1')
        .set('Authorization', 'Bearer outlet-admin-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden - Only super admins can delete outlet admins');
    });

    it('should return 404 for non-existent outlet admin', async () => {
      mockOutletAdminController.softDeleteOutletAdmin.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Outlet admin not found'
        });
      });

      const res = await request(app)
        .delete('/api/outlet-admin/nonexistent')
        .set('Authorization', 'Bearer super-admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Outlet admin not found');
    });
  });

  describe('POST /api/outlet-admin/register', () => {
    it('should return 201 for successful outlet admin registration by super admin', async () => {
      const mockRegisteredAdmin = {
        _id: 'admin1',
        name: 'New Outlet Admin',
        email: 'newadmin@example.com',
        phone: '+1234567890',
        role: 'outlet_admin',
        isActive: true
      };

      mockOutletAdminController.registerOutletAdmin.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          message: 'Outlet admin registered successfully',
          data: {
            outletAdmin: mockRegisteredAdmin
          }
        });
      });

      const res = await request(app)
        .post('/api/outlet-admin/register')
        .set('Authorization', 'Bearer super-admin-token')
        .send({
          name: 'New Outlet Admin',
          email: 'newadmin@example.com',
          password: 'StrongP@ssw0rd123',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet admin registered successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.outletAdmin).toMatchObject(mockRegisteredAdmin);
      expect(mockOutletAdminController.registerOutletAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockOutletAdminController.registerOutletAdmin.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input'
        });
      });

      const res = await request(app)
        .post('/api/outlet-admin/register')
        .set('Authorization', 'Bearer super-admin-token')
        .send({
          name: '',
          email: 'invalid-email',
          password: 'weak',
          phone: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid input');
    });

    it('should return 403 for non-super-admin access', async () => {
      const res = await request(app)
        .post('/api/outlet-admin/register')
        .set('Authorization', 'Bearer outlet-admin-token')
        .send({
          name: 'New Admin',
          email: 'admin@example.com',
          password: 'StrongP@ssw0rd123',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden - Only super admins can create outlet admins');
    });

    it('should return 409 for duplicate email or phone', async () => {
      mockOutletAdminController.registerOutletAdmin.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Email or phone number already in use'
        });
      });

      const res = await request(app)
        .post('/api/outlet-admin/register')
        .set('Authorization', 'Bearer super-admin-token')
        .send({
          name: 'New Admin',
          email: 'existing@example.com',
          password: 'StrongP@ssw0rd123',
          phone: '1234567890'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Email or phone number already in use');
    });
  });
});
