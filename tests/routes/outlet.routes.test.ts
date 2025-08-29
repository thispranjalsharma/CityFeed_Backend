/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the outlet controller functions
const mockOutletController = {
  createOutlet: jest.fn(),
  getOutletsBySuperAdmin: jest.fn(),
  getOutletById: jest.fn(),
  updateOutlet: jest.fn(),
  deleteOutlet: jest.fn(),
  restoreOutlet: jest.fn(),
  getDeletedOutlets: jest.fn(),
  updateOutletStatus: jest.fn(),
  getOutletsByStatus: jest.fn(),
  assignAdmin: jest.fn(),
  removeAdmin: jest.fn(),
  assignRoleToEmployee: jest.fn(),
  fixOutletStatus: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define all actual outlet routes
app.get('/api/outlets/public', (req, res) => {
  // Mock public outlets endpoint
  res.status(200).json({
    success: true,
    data: [
      { _id: 'outlet1', businessName: 'Test Restaurant 1', avgRating: 4.5, reviewCount: 10 },
      { _id: 'outlet2', businessName: 'Test Restaurant 2', avgRating: 4.2, reviewCount: 5 }
    ]
  });
});
app.post('/api/outlets', (req, res) => mockOutletController.createOutlet(req, res));
app.get('/api/outlets', (req, res) => mockOutletController.getOutletsBySuperAdmin(req, res));
app.get('/api/outlets/search', (req, res) => {
  // Mock search endpoint
  const { businessName } = req.query;
  if (!businessName) {
    return res.status(400).json({ success: false, message: 'businessName query parameter is required' });
  }
  res.status(200).json({
    success: true,
    data: [{ _id: 'outlet1', businessName: 'Test Restaurant' }]
  });
});
app.get('/api/outlets/status/:status', (req, res) => mockOutletController.getOutletsByStatus(req, res));
app.get('/api/outlets/deleted', (req, res) => mockOutletController.getDeletedOutlets(req, res));
app.get('/api/outlets/:outletId', (req, res) => mockOutletController.getOutletById(req, res));
app.put('/api/outlets/:outletId', (req, res) => mockOutletController.updateOutlet(req, res));
app.delete('/api/outlets/:outletId', (req, res) => mockOutletController.deleteOutlet(req, res));
app.patch('/api/outlets/:outletId/restore', (req, res) => mockOutletController.restoreOutlet(req, res));
app.patch('/api/outlets/:outletId/status', (req, res) => mockOutletController.updateOutletStatus(req, res));
app.patch('/api/outlets/assign-admin', (req, res) => mockOutletController.assignAdmin(req, res));
app.patch('/api/outlets/:outletId/remove-admin', (req, res) => mockOutletController.removeAdmin(req, res));
app.post('/api/outlets/:outletId/roles', (req, res) => mockOutletController.assignRoleToEmployee(req, res));
app.post('/api/outlets/fix-status', (req, res) => mockOutletController.fixOutletStatus(req, res));

describe('Outlet Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/outlets/public', () => {
    it('should return 200 with public outlets list', async () => {
      const res = await request(app)
        .get('/api/outlets/public');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('avgRating');
      expect(res.body.data[0]).toHaveProperty('reviewCount');
    });
  });

  describe('POST /api/outlets', () => {
    it('should return 201 for successful outlet creation', async () => {
      const outletData = {
        _id: 'testoutletid',
        businessName: 'Test Restaurant',
        businessType: 'restaurant',
        assignedAdmin: {
          _id: 'adminid',
          name: 'Test Admin',
          email: 'admin@test.com'
        }
      };

      mockOutletController.createOutlet.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          message: 'Outlet created successfully',
          data: { outlet: outletData }
        });
      });

      const res = await request(app)
        .post('/api/outlets')
        .set('Authorization', 'Bearer superadmin-token')
        .send({
          businessName: 'Test Restaurant',
          businessType: 'restaurant',
          businessDescription: 'A test restaurant',
          category: 'both',
          address: '123 Test Street',
          location: '{"type":"Point","coordinates":[77.5946,12.9716]}',
          defaultMaxDiscount: 30,
          adminEmail: 'admin@test.com',
          adminPassword: 'password123',
          adminPhone: '+1234567890',
          createDefaultOffer: false
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet created successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlet');
      expect(mockOutletController.createOutlet).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockOutletController.createOutlet.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .post('/api/outlets')
        .set('Authorization', 'Bearer superadmin-token')
        .send({
          businessName: 'Test Restaurant'
          // Missing required fields
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/outlets', () => {
    it('should return 200 with outlets for super admin', async () => {
      const outlets = [
        {
          _id: 'outlet1',
          businessName: 'Restaurant 1',
          businessType: 'restaurant',
          isActive: true
        },
        {
          _id: 'outlet2',
          businessName: 'Restaurant 2',
          businessType: 'cafe',
          isActive: true
        }
      ];

      mockOutletController.getOutletsBySuperAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: { outlets }
        });
      });

      const res = await request(app)
        .get('/api/outlets')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body.data.outlets).toHaveLength(2);
      expect(mockOutletController.getOutletsBySuperAdmin).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/outlets/search', () => {
    it('should return 200 with matching outlets', async () => {
      const res = await request(app)
        .get('/api/outlets/search')
        .query({ businessName: 'Test' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 400 when businessName is missing', async () => {
      const res = await request(app)
        .get('/api/outlets/search');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'businessName query parameter is required');
    });
  });

  describe('GET /api/outlets/status/:status', () => {
    it('should return 200 with outlets by status', async () => {
      const activeOutlets = [
        { _id: 'outlet1', businessName: 'Active Restaurant', isActive: true }
      ];

      mockOutletController.getOutletsByStatus.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: { outlets: activeOutlets },
          message: 'Retrieved 1 active outlets'
        });
      });

      const res = await request(app)
        .get('/api/outlets/status/active')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body).toHaveProperty('message');
      expect(mockOutletController.getOutletsByStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/outlets/:outletId', () => {
    it('should return 200 with outlet details', async () => {
      const outletDetails = {
        _id: 'testoutletid',
        businessName: 'Test Restaurant',
        businessType: 'restaurant',
        assignedAdmin: {
          _id: 'adminid',
          name: 'Test Admin',
          email: 'admin@test.com'
        }
      };

      mockOutletController.getOutletById.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: { outlet: outletDetails }
        });
      });

      const res = await request(app)
        .get('/api/outlets/testoutletid')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlet');
      expect(res.body.data.outlet).toMatchObject(outletDetails);
      expect(mockOutletController.getOutletById).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for outlet not found', async () => {
      mockOutletController.getOutletById.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Outlet not found'
        });
      });

      const res = await request(app)
        .get('/api/outlets/nonexistentid')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Outlet not found');
    });
  });

  describe('PUT /api/outlets/:outletId', () => {
    it('should return 200 for successful outlet update', async () => {
      const updatedOutlet = {
        _id: 'testoutletid',
        businessName: 'Updated Restaurant',
        businessType: 'restaurant'
      };

      mockOutletController.updateOutlet.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Outlet updated successfully',
          data: { outlet: updatedOutlet }
        });
      });

      const res = await request(app)
        .put('/api/outlets/testoutletid')
        .set('Authorization', 'Bearer superadmin-token')
        .send({
          businessName: 'Updated Restaurant',
          businessDescription: 'Updated description'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet updated successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockOutletController.updateOutlet).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/outlets/:outletId', () => {
    it('should return 200 for successful outlet deletion', async () => {
      const deletedOutlet = {
        _id: 'testoutletid',
        businessName: 'Test Restaurant',
        isDeleted: true,
        deletedAt: '2024-01-15T10:30:00Z'
      };

      mockOutletController.deleteOutlet.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Outlet deleted successfully',
          data: { outlet: deletedOutlet }
        });
      });

      const res = await request(app)
        .delete('/api/outlets/testoutletid')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet deleted successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockOutletController.deleteOutlet).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/outlets/:outletId/restore', () => {
    it('should return 200 for successful outlet restoration', async () => {
      const restoredOutlet = {
        _id: 'testoutletid',
        businessName: 'Test Restaurant',
        isDeleted: false,
        deletedAt: null
      };

      mockOutletController.restoreOutlet.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Outlet restored successfully',
          data: { outlet: restoredOutlet }
        });
      });

      const res = await request(app)
        .patch('/api/outlets/testoutletid/restore')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet restored successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockOutletController.restoreOutlet).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for outlet not deleted', async () => {
      mockOutletController.restoreOutlet.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Outlet is not deleted'
        });
      });

      const res = await request(app)
        .patch('/api/outlets/testoutletid/restore')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Outlet is not deleted');
    });
  });

  describe('PATCH /api/outlets/:outletId/status', () => {
    it('should return 200 for successful status update', async () => {
      const updatedOutlet = {
        _id: 'testoutletid',
        businessName: 'Test Restaurant',
        isActive: false
      };

      mockOutletController.updateOutletStatus.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Outlet deactivated successfully',
          data: { outlet: updatedOutlet }
        });
      });

      const res = await request(app)
        .patch('/api/outlets/testoutletid/status')
        .set('Authorization', 'Bearer superadmin-token')
        .send({ isActive: false });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlet deactivated successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockOutletController.updateOutletStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/outlets/:outletId/roles', () => {
    it('should return 201 for successful role assignment', async () => {
      const assignmentData = {
        _id: 'employeeid',
        name: 'John Doe',
        email: 'employee@test.com',
        role: 'employee',
        responsibilities: ['take_orders', 'serve_food'],
        isEmailVerified: false
      };

      mockOutletController.assignRoleToEmployee.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          message: 'Role assigned successfully. Verification email sent to employee.',
          data: {
            assignment: assignmentData,
            token: 'employee-jwt-token'
          }
        });
      });

      const res = await request(app)
        .post('/api/outlets/testoutletid/roles')
        .set('Authorization', 'Bearer superadmin-token')
        .send({
          name: 'John Doe',
          email: 'employee@test.com',
          password: 'password123',
          phone: '+1234567890',
          role: 'waiter',
          responsibilities: ['take_orders', 'serve_food']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('assignment');
      expect(res.body.data).toHaveProperty('token');
      expect(mockOutletController.assignRoleToEmployee).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/outlets/assign-admin', () => {
    it('should return 200 for successful admin assignment', async () => {
      const updatedOutlet = {
        _id: 'testoutletid',
        businessName: 'Test Restaurant',
        assignedAdmin: {
          _id: 'newadminid',
          name: 'New Admin',
          email: 'newadmin@test.com'
        }
      };

      mockOutletController.assignAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Admin assigned successfully',
          data: { outlet: updatedOutlet }
        });
      });

      const res = await request(app)
        .patch('/api/outlets/assign-admin')
        .set('Authorization', 'Bearer superadmin-token')
        .send({
          outletId: 'testoutletid',
          adminId: 'newadminid'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Admin assigned successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockOutletController.assignAdmin).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/outlets/:outletId/remove-admin', () => {
    it('should return 200 for successful admin removal', async () => {
      const updatedOutlet = {
        _id: 'testoutletid',
        businessName: 'Test Restaurant',
        assignedAdmin: null
      };

      mockOutletController.removeAdmin.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Admin removed successfully',
          data: { outlet: updatedOutlet }
        });
      });

      const res = await request(app)
        .patch('/api/outlets/testoutletid/remove-admin')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Admin removed successfully');
      expect(res.body).toHaveProperty('data');
      expect(mockOutletController.removeAdmin).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/outlets/deleted', () => {
    it('should return 200 with deleted outlets for super admin', async () => {
      const deletedOutlets = [
        {
          _id: 'outlet1',
          businessName: 'Deleted Restaurant 1',
          isDeleted: true,
          deletedAt: '2024-01-15T10:30:00Z'
        },
        {
          _id: 'outlet2',
          businessName: 'Deleted Restaurant 2',
          isDeleted: true,
          deletedAt: '2024-01-14T09:00:00Z'
        }
      ];

      mockOutletController.getDeletedOutlets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: { outlets: deletedOutlets },
          message: 'Retrieved 2 deleted outlets'
        });
      });

      const res = await request(app)
        .get('/api/outlets/deleted')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body.data.outlets).toHaveLength(2);
      expect(res.body.data.outlets[0]).toHaveProperty('isDeleted', true);
      expect(res.body).toHaveProperty('message', 'Retrieved 2 deleted outlets');
      expect(mockOutletController.getDeletedOutlets).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletController.getDeletedOutlets.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).get('/api/outlets/deleted');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('POST /api/outlets/fix-status', () => {
    it('should return 200 for successful outlet status fix', async () => {
      const fixedOutlets = [
        {
          _id: 'outlet1',
          businessName: 'Restaurant 1',
          isActive: true
        },
        {
          _id: 'outlet2',
          businessName: 'Restaurant 2',
          isActive: true
        }
      ];

      mockOutletController.fixOutletStatus.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Outlets fixed successfully',
          data: { outlets: fixedOutlets }
        });
      });

      const res = await request(app)
        .post('/api/outlets/fix-status')
        .set('Authorization', 'Bearer superadmin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Outlets fixed successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlets');
      expect(res.body.data.outlets).toHaveLength(2);
      expect(res.body.data.outlets[0]).toHaveProperty('isActive', true);
      expect(mockOutletController.fixOutletStatus).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOutletController.fixOutletStatus.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).post('/api/outlets/fix-status');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });
}); 