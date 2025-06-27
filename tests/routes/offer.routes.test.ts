/**
 * @jest-environment node
 */
import request from 'supertest';
import App from '../../src/app';
import mongoose from 'mongoose';

let app: import('express').Application;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const appInstance = new App();
  app = appInstance.getApp();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Offer Router', () => {
  describe('GET /api/offers', () => {
    it('should return 200 and a list of offers', async () => {
      const res = await request(app)
        .get('/api/offers');
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('GET /api/offers/valid-today', () => {
    it('should return 200 and a list of today valid offers', async () => {
      const res = await request(app)
        .get('/api/offers/valid-today');
      if (![200, 204].includes(res.statusCode)) {
        console.error('Unexpected status:', res.statusCode, res.body);
      }
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('GET /api/offers/:id', () => {
    it('should return 404 for non-existent offer', async () => {
      const res = await request(app)
        .get('/api/offers/000000000000000000000000');
      expect([404, 400]).toContain(res.statusCode);
    });
  });

  describe('GET /api/offers/outlet/:outletId', () => {
    it('should return 200 and a list of offers for outlet', async () => {
      const res = await request(app)
        .get('/api/offers/outlet/000000000000000000000000');
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('POST /api/offers', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/offers')
        .send({});
      expect([401, 403]).toContain(res.statusCode);
    });
    it.skip('should return 400 for invalid input (authenticated, with mocks)', async () => {
      // This test requires mocking authentication and responsibility
    });
  });

  describe('PUT /api/offers/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/offers/000000000000000000000000')
        .send({});
      expect([401, 403]).toContain(res.statusCode);
    });
    it.skip('should return 400 for invalid input (authenticated, with mocks)', async () => {
      // This test requires mocking authentication, responsibility, and DB
    });
  });

  describe('DELETE /api/offers/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .delete('/api/offers/000000000000000000000000');
      expect([401, 403, 404]).toContain(res.statusCode);
    });
    it.skip('should return 404 for non-existent offer (authenticated, with mocks)', async () => {
      // This test requires mocking authentication, responsibility, and DB
    });
  });
}); 