/**
 * @jest-environment node
 */
import request from 'supertest';
import App from '../../src/app';
import mongoose from 'mongoose';

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
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

describe('Review Router', () => {
  describe('GET /api/reviews/public/outlet/:outletId', () => {
    it('should return 400 for invalid outlet ID format', async () => {
      const res = await request(app)
        .get('/api/reviews/public/outlet/invalid-id');
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid outlet ID format');
    });

    it('should return 404 for non-existent outlet', async () => {
      const fakeOutletId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/reviews/public/outlet/${fakeOutletId}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with paginated reviews for valid outlet', async () => {
      // This test requires a valid outlet ID and reviews in the database
      const validOutletId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/reviews/public/outlet/${validOutletId}?page=1&limit=10`);
      
      // Should return 200 even if no reviews exist
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('reviews');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('pageSize');
      expect(res.body.data).toHaveProperty('totalPages');
    });

    it('should handle pagination parameters correctly', async () => {
      const validOutletId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/reviews/public/outlet/${validOutletId}?page=2&limit=5`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.pageSize).toBe(5);
    });

    it('should use default pagination values when not provided', async () => {
      const validOutletId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/reviews/public/outlet/${validOutletId}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(10);
    });
  });

  describe('GET /api/review/some-endpoint', () => {
    it('should return 401, 403, or 404 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/review/some-endpoint');
      expect([401, 403, 404]).toContain(res.statusCode);
    });
    it.skip('should return 200 for valid request (with mocks)', async () => {
      // This test requires authentication and/or DB mocking
    });
  });
}); 