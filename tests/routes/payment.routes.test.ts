/**
 * @jest-environment node
 */
import request from 'supertest';
import App from '../../src/app';
import mongoose from 'mongoose';

// Default: Mock authentication middleware as authenticated
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'testuserid', role: 'user' };
    next();
  },
  userAuth: (req, res, next) => next(),
  adminAuth: (req, res, next) => next(),
  superAdminAuth: (req, res, next) => next(),
  outletAdminAuth: (req, res, next) => next(),
  employeeAuth: (req, res, next) => next(),
  authorize: (...roles) => (req, res, next) => next(),
}));
jest.mock('../../src/middleware/requireResponsibility.middleware', () => ({
  requireUser: (req, res, next) => next(),
  requireAdmin: (req, res, next) => next(),
  requireResponsibility: () => (req, res, next) => next(),
}));

let app: import('express').Application;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const appInstance = new App();
  app = appInstance.getApp();
});

afterAll(async () => {
  await mongoose.disconnect();
});

// Helper to temporarily mock authenticate as unauthenticated
async function getUnauthenticatedApp() {
  jest.resetModules();
  jest.doMock('../../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => next(), // no req.user
    userAuth: (req, res, next) => next(),
    adminAuth: (req, res, next) => next(),
    superAdminAuth: (req, res, next) => next(),
    outletAdminAuth: (req, res, next) => next(),
    employeeAuth: (req, res, next) => next(),
    authorize: (...roles) => (req, res, next) => next(),
  }));
  const App = require('../../src/app').default;
  return (await new App()).getApp();
}

describe('Payment Router', () => {
  describe('POST /api/payments/membership/initiate', () => {
    it('should return 400 or 401 for missing/invalid input or unauthenticated', async () => {
      const res = await request(app)
        .post('/api/payments/membership/initiate')
        .send({});
      expect([400, 401]).toContain(res.statusCode);
    });
  });

  describe('POST /api/payments/membership/verify', () => {
    it('should return 400 or 401 for missing/invalid input or unauthenticated', async () => {
      const res = await request(app)
        .post('/api/payments/membership/verify')
        .send({});
      expect([400, 401]).toContain(res.statusCode);
    });
  });

  describe('POST /api/payments/dine-in', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .post('/api/payments/dine-in')
        .send({
          outletId: 'outlet1',
          offerId: 'offer1',
          totalBill: 100
        });
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  // Authenticated test for missing rewardPointsToUse
  it.skip('should return 400 if useRewardPoints is true but rewardPointsToUse is missing (authenticated)', async () => {
    const res = await request(app)
      .post('/api/payments/dine-in')
      .send({
        outletId: 'outlet1',
        offerId: 'offer1',
        totalBill: 100,
        useRewardPoints: true
        // rewardPointsToUse is missing
      });
    expect(res.statusCode).toBe(400);
  });

  describe('GET /api/payments/transactions', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .get('/api/payments/transactions');
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  describe('GET /api/payments/transactions/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .get('/api/payments/transactions/invalidid');
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  describe('GET /api/payments/dine-in/history', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .get('/api/payments/dine-in/history');
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  describe('POST /api/payments/recharge', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .post('/api/payments/recharge')
        .send({ amount: 100 });
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  // Authenticated test for invalid amount
  it.skip('should return 400 for invalid amount (authenticated)', async () => {
    const res = await request(app)
      .post('/api/payments/recharge')
      .send({ amount: 0 });
    expect(res.statusCode).toBe(400);
  });

  describe('POST /api/payments/recharge/verify', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .post('/api/payments/recharge/verify')
        .send({ orderId: 'order_xxx' });
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  // Authenticated test for missing orderId
  it.skip('should return 400 for missing orderId (authenticated)', async () => {
    const res = await request(app)
      .post('/api/payments/recharge/verify')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  describe('POST /api/payments/direct/initiate', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .post('/api/payments/direct/initiate')
        .send({
          outletId: 'outlet1',
          offerId: 'offer1',
          totalBill: 100
        });
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  describe('POST /api/payments/direct/verify', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .post('/api/payments/direct/verify')
        .send({ orderId: 'order_xxx' });
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  describe('GET /api/payments/outlet/:outletId/history', () => {
    it('should return 401 if not authenticated', async () => {
      const unauthApp = await getUnauthenticatedApp();
      const res = await request(unauthApp)
        .get('/api/payments/outlet/invalidid/history');
      // If this fails with 500, check the controller to ensure it returns 401 if req.user is missing
      expect(res.statusCode).toBe(401);
    }, 15000);
  });
}); 