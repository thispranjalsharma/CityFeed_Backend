import request from 'supertest';
import App from '../app';
import mongoose from 'mongoose';

jest.mock('../models/user.model', () => ({
  User: {
    findOneAndUpdate: jest.fn().mockResolvedValue(null), // Simulate not found or invalid input
    findOneAndDelete: jest.fn().mockResolvedValue(null), // Simulate not found
    findOne: jest.fn().mockResolvedValue(null), // For other lookups
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    findByIdAndDelete: jest.fn().mockResolvedValue(null),
  }
}));

jest.mock('../middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (authHeader === 'Bearer invalid-token') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (authHeader === 'Bearer valid-user-token') {
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'user' };
      return next();
    }
    if (authHeader === 'Bearer valid-admin-token') {
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
      return next();
    }
    if (authHeader === 'Bearer valid-super-admin-token') {
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'super_admin' };
      return next();
    }
    if (authHeader.startsWith('Bearer')) {
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'user' };
      return next();
    }
    return res.status(401).json({ message: 'Invalid token' });
  },
  userAuth: (req, res, next) => {
    if (req.user && req.user.role === 'user') return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  adminAuth: (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  superAdminAuth: (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  outletAdminAuth: (req, res, next) => {
    if (req.user && req.user.role === 'outlet_admin') return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  employeeAuth: (req, res, next) => {
    if (req.user && req.user.role === 'employee') return next();
    return res.status(403).json({ message: 'Forbidden' });
  }
}));

jest.mock('../middleware/requireResponsibility.middleware', () => ({
  requireUser: (req, res, next) => next(), // Always allow, so controller handles 400
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  requireResponsibility: () => (req, res, next) => next(), // Pass-through mock
}));

jest.mock('../models/outletRoleAssignment.model', () => ({
  OutletRoleAssignment: {
    findById: jest.fn().mockImplementation((id) => {
      if (id === '507f1f77bcf86cd799439011') {
        return Promise.resolve({
          _id: id,
          email: 'employee@test.com',
          name: 'Test Employee',
          phone: '+1234567890',
          role: 'employee',
          responsibilities: ['Customer Service'],
          outlet: new mongoose.Types.ObjectId()
        });
      }
      return Promise.resolve(null);
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((id, updateData) => {
      if (id === '507f1f77bcf86cd799439011') {
        return Promise.resolve({
          _id: id,
          email: 'employee@test.com',
          name: updateData.name || 'Test Employee',
          phone: updateData.phone || '+1234567890',
          role: updateData.role || 'employee',
          responsibilities: updateData.responsibilities || ['Customer Service'],
          outlet: new mongoose.Types.ObjectId()
        });
      }
      return Promise.resolve(null);
    })
  }
}));

jest.mock('../repositories/user.repository', () => ({
  UserRepository: jest.fn().mockImplementation(() => ({
    findByEmail: jest.fn().mockImplementation((email) => {
      if (email === 'employee@test.com') {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Employee',
          email: 'employee@test.com',
          phone: '+1234567890',
          role: 'user',
          isActive: true
        });
      }
      return Promise.resolve(null);
    }),
    update: jest.fn().mockImplementation((id, updateData) => {
      return Promise.resolve({
        _id: new mongoose.Types.ObjectId(id),
        name: updateData.name || 'Test Employee',
        email: updateData.email || 'employee@test.com',
        phone: updateData.phone || '+1234567890',
        role: updateData.role || 'user',
        isActive: updateData.isActive !== undefined ? updateData.isActive : true
      });
    })
  }))
}));

const app = new App().getApp();

const validUserToken = 'Bearer valid-user-token'; // Replace with actual valid token if available
const validAdminToken = 'Bearer valid-admin-token'; // Replace with actual valid token if available
const nonExistentUserId = '000000000000000000000000';
const testEmployeeId = '507f1f77bcf86cd799439011'; // Mock employee ID
const superAdminToken = 'Bearer valid-super-admin-token'; // Mock super admin token

describe('User Endpoints', () => {
  describe('GET /api/users/profile', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
    it('should return 403 for forbidden role', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', validAdminToken)
        .expect(403);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ name: 'Test User' })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test User' })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', validUserToken)
        .send({ name: '' })
        .expect(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/users/profile', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${nonExistentUserId}`)
        .expect(404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/users/membership/upgrade', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/api/users/membership/upgrade')
        .send({ membershipType: 'premium' })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .post('/api/users/membership/upgrade')
        .set('Authorization', 'Bearer invalid-token')
        .send({ membershipType: 'premium' })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
    it('should return 400 for missing membershipType', async () => {
      const response = await request(app)
        .post('/api/users/membership/upgrade')
        .set('Authorization', validUserToken)
        .send({})
        .expect(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/users/membership/upgrade/verify', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/api/users/membership/upgrade/verify')
        .send({ paymentId: 'test-payment-id' })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .post('/api/users/membership/upgrade/verify')
        .set('Authorization', 'Bearer invalid-token')
        .send({ paymentId: 'test-payment-id' })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
    it('should return 400 for missing paymentId', async () => {
      const response = await request(app)
        .post('/api/users/membership/upgrade/verify')
        .set('Authorization', validUserToken)
        .send({})
        .expect(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/users/by-phone', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/users/by-phone?phone=+1234567890')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/users/by-phone?phone=+1234567890')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
    it('should return 400 for missing phone parameter', async () => {
      const response = await request(app)
        .get('/api/users/by-phone')
        .set('Authorization', validUserToken)
        .expect(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/users/wallet-balance', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/users/wallet-balance')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/users/wallet-balance')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
  });

  describe('GET /api/users/reward-points', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/users/reward-points')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .get('/api/users/reward-points')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
  });

  describe('PUT /api/employee/{employeeId}', () => {
    it('should update employee with responsibilities field', async () => {
      const updateData = {
        name: 'Updated Employee Name',
        responsibilities: ['Customer Service', 'Order Management', 'Inventory']
      };

      const response = await request(app)
        .put(`/api/employee/${testEmployeeId}`)
        .set('Authorization', superAdminToken)
        .set('x-test-user', 'super_admin')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.employee.name).toBe(updateData.name);
      expect(response.body.data.assignment.responsibilities).toEqual(updateData.responsibilities);
    });

    it('should return 400 when responsibilities is not an array', async () => {
      const updateData = {
        name: 'Updated Employee Name',
        responsibilities: 'Invalid responsibilities format'
      };

      const response = await request(app)
        .put(`/api/employee/${testEmployeeId}`)
        .set('Authorization', superAdminToken)
        .set('x-test-user', 'super_admin')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Responsibilities must be an array');
    });

    it('should return 403 when user is not super admin or outlet admin', async () => {
      const updateData = {
        name: 'Updated Employee Name',
        responsibilities: ['Customer Service']
      };

      const response = await request(app)
        .put(`/api/employee/${testEmployeeId}`)
        .set('Authorization', validUserToken)
        .send(updateData)
        .expect(403);

      expect(response.body.message).toContain('Only super admin or outlet admin can update employees');
    });

    it('should return 404 when employee not found', async () => {
      const updateData = {
        name: 'Updated Employee Name',
        responsibilities: ['Customer Service']
      };

      const response = await request(app)
        .put(`/api/employee/${nonExistentUserId}`)
        .set('Authorization', superAdminToken)
        .set('x-test-user', 'super_admin')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Employee assignment not found');
    });
  });
}); 