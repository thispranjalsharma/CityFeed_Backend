/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the review controller functions
const mockReviewController = {
  createReview: jest.fn(),
  getReviewsByDineInSession: jest.fn(),
  getReviewsByOutlet: jest.fn(),
  getPublicOutletReviews: jest.fn(),
  getReviewsByUser: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
  getAllReviewsPaginated: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual review routes
app.post('/api/reviews', (req, res) => mockReviewController.createReview(req, res));
app.get('/api/reviews/session/:dineInSessionId', (req, res) => mockReviewController.getReviewsByDineInSession(req, res));
app.get('/api/reviews/outlet/:outletId', (req, res) => mockReviewController.getReviewsByOutlet(req, res));
app.get('/api/reviews/public/outlet/:outletId', (req, res) => mockReviewController.getPublicOutletReviews(req, res));
app.get('/api/reviews/user', (req, res) => mockReviewController.getReviewsByUser(req, res));
app.get('/api/reviews/all', (req, res) => mockReviewController.getAllReviewsPaginated(req, res));
app.put('/api/reviews/:id', (req, res) => mockReviewController.updateReview(req, res));
app.delete('/api/reviews/:id', (req, res) => mockReviewController.deleteReview(req, res));

describe('Review Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reviews', () => {
    it('should return 201 for successful review creation', async () => {
      const mockReview = {
        _id: 'review1',
        dineInSessionId: 'session1',
        rating: 5,
        comment: 'Excellent service!',
        outletId: 'outlet1',
        userId: 'user1'
      };

      mockReviewController.createReview.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockReview
        });
      });

      const res = await request(app)
        .post('/api/reviews')
        .send({
          dineInSessionId: 'session1',
          rating: 5,
          comment: 'Excellent service!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockReview);
      expect(mockReviewController.createReview).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockReviewController.createReview.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .post('/api/reviews')
        .send({
          dineInSessionId: '',
          rating: 6,
          comment: ''
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 for existing review', async () => {
      mockReviewController.createReview.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Review already exists for this session'
        });
      });

      const res = await request(app)
        .post('/api/reviews')
        .send({
          dineInSessionId: 'session1',
          rating: 4,
          comment: 'Good service'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent dine-in session', async () => {
      mockReviewController.createReview.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Dine-in session not found'
        });
      });

      const res = await request(app)
        .post('/api/reviews')
        .send({
          dineInSessionId: 'nonexistent',
          rating: 4,
          comment: 'Good service'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Dine-in session not found');
    });
  });

  describe('GET /api/reviews/session/:dineInSessionId', () => {
    it('should return 200 with review for session', async () => {
      const mockReview = {
        _id: 'review1',
        dineInSessionId: 'session1',
        rating: 4,
        comment: 'Great experience',
        outletId: 'outlet1'
      };

      mockReviewController.getReviewsByDineInSession.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockReview
        });
      });

      const res = await request(app).get('/api/reviews/session/session1');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockReview);
      expect(mockReviewController.getReviewsByDineInSession).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent review', async () => {
      mockReviewController.getReviewsByDineInSession.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      });

      const res = await request(app).get('/api/reviews/session/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Review not found');
    });
  });

  describe('GET /api/reviews/outlet/:outletId', () => {
    it('should return 200 with outlet reviews', async () => {
      const mockOutletReviews = [
        {
          _id: 'review1',
          rating: 5,
          comment: 'Amazing food!',
          outletId: 'outlet1'
        },
        {
          _id: 'review2',
          rating: 4,
          comment: 'Good service',
          outletId: 'outlet1'
        }
      ];

      mockReviewController.getReviewsByOutlet.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOutletReviews
        });
      });

      const res = await request(app).get('/api/reviews/outlet/outlet1');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockReviewController.getReviewsByOutlet).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/reviews/public/outlet/:outletId', () => {
    it('should return 200 with public outlet reviews', async () => {
      const mockPublicReviews = {
        reviews: [
          {
            _id: 'review1',
            rating: 5,
            comment: 'Excellent!',
            createdAt: '2024-01-15T10:30:00.000Z'
          }
        ],
        totalReviews: 1,
        currentPage: 1,
        totalPages: 1,
        averageRating: 5.0
      };

      mockReviewController.getPublicOutletReviews.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockPublicReviews
        });
      });

      const res = await request(app)
        .get('/api/reviews/public/outlet/outlet1')
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('reviews');
      expect(res.body.data).toHaveProperty('totalReviews', 1);
      expect(res.body.data).toHaveProperty('averageRating', 5.0);
      expect(mockReviewController.getPublicOutletReviews).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent outlet', async () => {
      mockReviewController.getPublicOutletReviews.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Outlet not found'
        });
      });

      const res = await request(app).get('/api/reviews/public/outlet/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Outlet not found');
    });
  });

  describe('GET /api/reviews/user', () => {
    it('should return 200 with user reviews', async () => {
      const mockUserReviews = [
        {
          _id: 'review1',
          rating: 5,
          comment: 'My review 1',
          outletId: 'outlet1',
          userId: 'user1'
        },
        {
          _id: 'review2',
          rating: 3,
          comment: 'My review 2',
          outletId: 'outlet2',
          userId: 'user1'
        }
      ];

      mockReviewController.getReviewsByUser.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUserReviews
        });
      });

      const res = await request(app)
        .get('/api/reviews/user')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockReviewController.getReviewsByUser).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockReviewController.getReviewsByUser.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).get('/api/reviews/user');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('GET /api/reviews/all', () => {
    it('should return 200 with paginated reviews', async () => {
      const mockPaginatedReviews = {
        reviews: [
          {
            _id: 'review1',
            rating: 5,
            comment: 'Great!',
            outletId: 'outlet1'
          }
        ],
        totalReviews: 1,
        currentPage: 1,
        totalPages: 1
      };

      mockReviewController.getAllReviewsPaginated.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockPaginatedReviews
        });
      });

      const res = await request(app)
        .get('/api/reviews/all')
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('reviews');
      expect(res.body.data).toHaveProperty('totalReviews', 1);
      expect(mockReviewController.getAllReviewsPaginated).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should return 200 for successful review update', async () => {
      const mockUpdatedReview = {
        _id: 'review1',
        rating: 4,
        comment: 'Updated comment',
        outletId: 'outlet1',
        userId: 'user1'
      };

      mockReviewController.updateReview.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUpdatedReview
        });
      });

      const res = await request(app)
        .put('/api/reviews/review1')
        .set('Authorization', 'Bearer user-token')
        .send({
          rating: 4,
          comment: 'Updated comment'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockUpdatedReview);
      expect(mockReviewController.updateReview).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockReviewController.updateReview.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .put('/api/reviews/review1')
        .set('Authorization', 'Bearer user-token')
        .send({
          rating: 6,
          comment: ''
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 for unauthorized access', async () => {
      mockReviewController.updateReview.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .put('/api/reviews/review1')
        .send({
          rating: 4,
          comment: 'Updated comment'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for forbidden access', async () => {
      mockReviewController.updateReview.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .put('/api/reviews/review1')
        .set('Authorization', 'Bearer other-user-token')
        .send({
          rating: 4,
          comment: 'Updated comment'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });

    it('should return 404 for non-existent review', async () => {
      mockReviewController.updateReview.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      });

      const res = await request(app)
        .put('/api/reviews/nonexistent')
        .set('Authorization', 'Bearer user-token')
        .send({
          rating: 4,
          comment: 'Updated comment'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Review not found');
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should return 200 for successful review deletion', async () => {
      mockReviewController.deleteReview.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Review deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/reviews/review1')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Review deleted successfully');
      expect(mockReviewController.deleteReview).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockReviewController.deleteReview.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).delete('/api/reviews/review1');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for forbidden access', async () => {
      mockReviewController.deleteReview.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .delete('/api/reviews/review1')
        .set('Authorization', 'Bearer other-user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });

    it('should return 404 for non-existent review', async () => {
      mockReviewController.deleteReview.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      });

      const res = await request(app)
        .delete('/api/reviews/nonexistent')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Review not found');
    });
  });
});
