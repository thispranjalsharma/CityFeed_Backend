import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import '@jest/globals';

// Mock the authenticate middleware to inject a user for tests
jest.mock('../middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (authHeader === 'Bearer invalid-token') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    // Simulate user roles based on token
    if (authHeader === 'Bearer valid-user-token') {
      req.user = { _id: new (require('mongoose').Types.ObjectId)(), role: 'user' };
      return next();
    }
    if (authHeader === 'Bearer valid-admin-token') {
      req.user = { _id: new (require('mongoose').Types.ObjectId)(), role: 'admin' };
      return next();
    }
    if (authHeader.startsWith('Bearer')) {
      req.user = { _id: new (require('mongoose').Types.ObjectId)(), role: 'user' };
      return next();
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
}));

jest.mock('../middleware/requireResponsibility.middleware', () => ({
  requireUser: (req, res, next) => {
    if (req.user && req.user.role === 'user') return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  // Add other role mocks as needed
}));

// Simple test utilities without complex dependencies
global.testUtils = {
  createTestUser: async (userData: any = {}) => {
    return {
      _id: 'mock-user-id',
      name: userData.name || 'Test User',
      email: userData.email || 'test@example.com',
      phone: userData.phone || '+1234567890',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      ...userData
    };
  },
  
  createTestSuperAdmin: async (adminData: any = {}) => {
    return {
      _id: 'mock-super-admin-id',
      name: adminData.name || 'Test Super Admin',
      email: adminData.email || 'superadmin@example.com',
      phone: adminData.phone || '+1234567890',
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true,
      ...adminData
    };
  },
  
  createTestOutletAdmin: async (adminData: any = {}) => {
    return {
      _id: 'mock-outlet-admin-id',
      name: adminData.name || 'Test Outlet Admin',
      email: adminData.email || 'outletadmin@example.com',
      phone: adminData.phone || '+1234567890',
      role: 'outlet_admin',
      isActive: true,
      isEmailVerified: true,
      ...adminData
    };
  },
  
  generateAuthToken: (user: any) => {
    return jwt.sign(
      { 
        _id: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }
};

// Simple setup without database connection
beforeAll(async () => {
  console.log('Test setup completed');
});

afterAll(async () => {
  console.log('Test cleanup completed');
});

afterEach(async () => {
  // Simple cleanup
}); 