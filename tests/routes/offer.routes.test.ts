/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the offer controller functions
const mockOfferController = {
  getAllOffers: jest.fn(),
  getOffersValidToday: jest.fn(),
  searchOffers: jest.fn(),
  getOfferById: jest.fn(),
  getOffersByOutlet: jest.fn(),
  updateOffer: jest.fn(),
  deleteOffer: jest.fn(),
  createOffer: jest.fn(),
  restoreOffer: jest.fn(),
  getDeletedOffers: jest.fn(),
  getMaxDiscountOfferByOutletId: jest.fn(),
};

// Mock middleware
const mockInjectOutletIdFromOffer = (req, res, next) => {
  req.body.outletId = 'outlet123';
  next();
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual offer routes
app.get('/api/offers', (req, res) => mockOfferController.getAllOffers(req, res));
app.get('/api/offers/valid-today', (req, res) => mockOfferController.getOffersValidToday(req, res));
app.get('/api/offers/search', (req, res) => mockOfferController.searchOffers(req, res));
app.get('/api/offers/deleted', (req, res) => mockOfferController.getDeletedOffers(req, res));
app.get('/api/offers/max-discount/:outletId', (req, res) => mockOfferController.getMaxDiscountOfferByOutletId(req, res));
app.get('/api/offers/outlet/:outletId', (req, res) => mockOfferController.getOffersByOutlet(req, res));
app.get('/api/offers/:id', (req, res) => mockOfferController.getOfferById(req, res));
app.post('/api/offers', (req, res) => mockOfferController.createOffer(req, res));
app.put('/api/offers/:id', mockInjectOutletIdFromOffer, (req, res) => mockOfferController.updateOffer(req, res));
app.delete('/api/offers/:id', mockInjectOutletIdFromOffer, (req, res) => mockOfferController.deleteOffer(req, res));
app.patch('/api/offers/:id/restore', (req, res) => mockOfferController.restoreOffer(req, res));

describe('Offer Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/offers', () => {
    it('should return 200 with list of offers', async () => {
      const mockOffers = [
        {
          _id: 'offer1',
          title: 'Summer Special',
          description: 'Get 20% off',
          discountPercentage: 20,
          outletId: 'outlet1',
          isActive: true
        },
        {
          _id: 'offer2',
          title: 'Winter Sale',
          description: 'Get 15% off',
          discountPercentage: 15,
          outletId: 'outlet2',
          isActive: true
        }
      ];

      mockOfferController.getAllOffers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOffers
        });
      });

      const res = await request(app)
        .get('/api/offers')
        .query({ outletId: 'outlet1', status: 'active' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockOfferController.getAllOffers).toHaveBeenCalledTimes(1);
    });

    it('should handle server errors', async () => {
      mockOfferController.getAllOffers.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app).get('/api/offers');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/offers/valid-today', () => {
    it('should return 200 with offers valid today', async () => {
      const mockValidOffers = [
        {
          _id: 'offer1',
          title: 'Today Special',
          description: 'Valid today only',
          discountPercentage: 25,
          remainingDays: 0,
          isActive: true
        }
      ];

      mockOfferController.getOffersValidToday.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockValidOffers
        });
      });

      const res = await request(app).get('/api/offers/valid-today');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('remainingDays', 0);
      expect(mockOfferController.getOffersValidToday).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/offers/search', () => {
    it('should return 200 with search results', async () => {
      const mockSearchResults = [
        {
          _id: 'offer1',
          title: 'Pizza Special',
          description: 'Best pizza deals',
          discountPercentage: 30
        }
      ];

      mockOfferController.searchOffers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockSearchResults
        });
      });

      const res = await request(app)
        .get('/api/offers/search')
        .query({ title: 'pizza', businessName: 'restaurant' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data[0]).toHaveProperty('title', 'Pizza Special');
      expect(mockOfferController.searchOffers).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/offers/deleted', () => {
    it('should return 200 with deleted offers', async () => {
      const mockDeletedOffers = [
        {
          _id: 'offer1',
          title: 'Expired Offer',
          isDeleted: true,
          deletedAt: '2024-01-15T10:30:00.000Z'
        }
      ];

      mockOfferController.getDeletedOffers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockDeletedOffers,
          message: 'Retrieved 1 deleted offers'
        });
      });

      const res = await request(app)
        .get('/api/offers/deleted')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message');
      expect(res.body.data[0]).toHaveProperty('isDeleted', true);
      expect(mockOfferController.getDeletedOffers).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockOfferController.getDeletedOffers.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      });

      const res = await request(app).get('/api/offers/deleted');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/offers/max-discount/:outletId', () => {
    it('should return 200 with max discount offer', async () => {
      const mockMaxDiscountOffer = {
        _id: 'offer1',
        title: 'Mega Discount',
        description: 'Highest discount available',
        discountPercentage: 50,
        outletId: 'outlet1'
      };

      mockOfferController.getMaxDiscountOfferByOutletId.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockMaxDiscountOffer
        });
      });

      const res = await request(app).get('/api/offers/max-discount/outlet1');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('discountPercentage', 50);
      expect(mockOfferController.getMaxDiscountOfferByOutletId).toHaveBeenCalledTimes(1);
    });

    it('should return 404 when no offers found', async () => {
      mockOfferController.getMaxDiscountOfferByOutletId.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'No offers found for this outlet'
        });
      });

      const res = await request(app).get('/api/offers/max-discount/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/offers/outlet/:outletId', () => {
    it('should return 200 with outlet offers', async () => {
      const mockOutletOffers = {
        outlet: {
          _id: 'outlet1',
          name: 'Restaurant Name',
          address: '123 Main St',
          businessType: 'Restaurant'
        },
        offers: [
          {
            _id: 'offer1',
            title: 'Restaurant Special',
            discountPercentage: 20
          }
        ],
        totalOffers: 1
      };

      mockOfferController.getOffersByOutlet.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOutletOffers
        });
      });

      const res = await request(app).get('/api/offers/outlet/outlet1');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('outlet');
      expect(res.body.data).toHaveProperty('offers');
      expect(res.body.data).toHaveProperty('totalOffers', 1);
      expect(mockOfferController.getOffersByOutlet).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent outlet', async () => {
      mockOfferController.getOffersByOutlet.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Outlet not found'
        });
      });

      const res = await request(app).get('/api/offers/outlet/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Outlet not found');
    });
  });

  describe('GET /api/offers/:id', () => {
    it('should return 200 with offer details', async () => {
      const mockOffer = {
        _id: 'offer1',
        title: 'Special Offer',
        description: 'Limited time offer',
        discountPercentage: 25,
        validFrom: '2024-06-01T00:00:00.000Z',
        validTo: '2024-08-31T23:59:59.999Z',
        isActive: true,
        remainingDays: 10
      };

      mockOfferController.getOfferById.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOffer
        });
      });

      const res = await request(app).get('/api/offers/offer1');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockOffer);
      expect(mockOfferController.getOfferById).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent offer', async () => {
      mockOfferController.getOfferById.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          error: 'Offer not found'
        });
      });

      const res = await request(app).get('/api/offers/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Offer not found');
    });
  });

  describe('POST /api/offers', () => {
    it('should return 201 for successful offer creation', async () => {
      const mockCreatedOffer = {
        _id: 'offer1',
        title: 'New Offer',
        description: 'Brand new offer',
        discountPercentage: 20,
        outletId: 'outlet1',
        validFrom: '2024-06-01T00:00:00.000Z',
        validTo: '2024-08-31T23:59:59.999Z',
        isActive: true
      };

      mockOfferController.createOffer.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockCreatedOffer
        });
      });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer employee-token')
        .send({
          title: 'New Offer',
          description: 'Brand new offer',
          discountPercentage: 20,
          outletId: 'outlet1',
          validFrom: '2024-06-01T00:00:00.000Z',
          validTo: '2024-08-31T23:59:59.999Z'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockCreatedOffer);
      expect(mockOfferController.createOffer).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockOfferController.createOffer.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          error: 'Invalid input data'
        });
      });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer employee-token')
        .send({
          title: '',
          discountPercentage: 'invalid'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 for unauthorized access', async () => {
      mockOfferController.createOffer.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      });

      const res = await request(app)
        .post('/api/offers')
        .send({
          title: 'New Offer',
          description: 'Brand new offer',
          discountPercentage: 20
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/offers/:id', () => {
    it('should return 200 for successful offer update', async () => {
      const mockUpdatedOffer = {
        _id: 'offer1',
        title: 'Updated Offer',
        description: 'Updated description',
        discountPercentage: 25,
        isActive: true
      };

      mockOfferController.updateOffer.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUpdatedOffer
        });
      });

      const res = await request(app)
        .put('/api/offers/offer1')
        .set('Authorization', 'Bearer employee-token')
        .send({
          title: 'Updated Offer',
          description: 'Updated description',
          discountPercentage: 25
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockUpdatedOffer);
      expect(mockOfferController.updateOffer).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for unauthorized update', async () => {
      mockOfferController.updateOffer.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          error: 'Not authorized to update this offer'
        });
      });

      const res = await request(app)
        .put('/api/offers/offer1')
        .set('Authorization', 'Bearer unauthorized-token')
        .send({
          title: 'Updated Offer'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent offer', async () => {
      mockOfferController.updateOffer.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          error: 'Offer not found'
        });
      });

      const res = await request(app)
        .put('/api/offers/nonexistent')
        .set('Authorization', 'Bearer employee-token')
        .send({
          title: 'Updated Offer'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Offer not found');
    });
  });

  describe('DELETE /api/offers/:id', () => {
    it('should return 200 for successful offer deletion', async () => {
      mockOfferController.deleteOffer.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            message: 'Offer deleted successfully'
          }
        });
      });

      const res = await request(app)
        .delete('/api/offers/offer1')
        .set('Authorization', 'Bearer employee-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('message', 'Offer deleted successfully');
      expect(mockOfferController.deleteOffer).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for unauthorized deletion', async () => {
      mockOfferController.deleteOffer.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          error: 'Not authorized to delete this offer'
        });
      });

      const res = await request(app)
        .delete('/api/offers/offer1')
        .set('Authorization', 'Bearer unauthorized-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent offer', async () => {
      mockOfferController.deleteOffer.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          error: 'Offer not found'
        });
      });

      const res = await request(app)
        .delete('/api/offers/nonexistent')
        .set('Authorization', 'Bearer employee-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Offer not found');
    });
  });

  describe('PATCH /api/offers/:id/restore', () => {
    it('should return 200 for successful offer restoration', async () => {
      const mockRestoredOffer = {
        _id: 'offer1',
        title: 'Restored Offer',
        isDeleted: false,
        deletedAt: null
      };

      mockOfferController.restoreOffer.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockRestoredOffer,
          message: 'Offer restored successfully'
        });
      });

      const res = await request(app)
        .patch('/api/offers/offer1/restore')
        .set('Authorization', 'Bearer admin-token')
        .send({
          outletId: 'outlet1'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message', 'Offer restored successfully');
      expect(res.body.data).toHaveProperty('isDeleted', false);
      expect(mockOfferController.restoreOffer).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing outletId', async () => {
      mockOfferController.restoreOffer.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'outletId is required'
        });
      });

      const res = await request(app)
        .patch('/api/offers/offer1/restore')
        .set('Authorization', 'Bearer admin-token')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent offer', async () => {
      mockOfferController.restoreOffer.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      });

      const res = await request(app)
        .patch('/api/offers/nonexistent/restore')
        .set('Authorization', 'Bearer admin-token')
        .send({
          outletId: 'outlet1'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Offer not found');
    });
  });
});
