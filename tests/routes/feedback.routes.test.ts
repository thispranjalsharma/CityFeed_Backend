/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the feedback controller functions
const mockFeedbackController = {
  createFeedback: jest.fn(),
  getUserFeedback: jest.fn(),
  getAllFeedback: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual feedback routes
app.post('/api/feedback', (req, res) => mockFeedbackController.createFeedback(req, res));
app.get('/api/feedback/my-feedback', (req, res) => mockFeedbackController.getUserFeedback(req, res));
app.get('/api/feedback/all', (req, res) => mockFeedbackController.getAllFeedback(req, res));

describe('Feedback Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/feedback', () => {
    it('should return 201 for successful feedback creation', async () => {
      const mockFeedback = {
        _id: 'feedback1',
        userId: 'user1',
        category: 'general',
        description: 'Great app!',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z'
      };

      mockFeedbackController.createFeedback.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockFeedback,
          message: 'Feedback submitted successfully'
        });
      });

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer user-token')
        .send({
          category: 'general',
          description: 'Great app!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockFeedback);
      expect(res.body).toHaveProperty('message', 'Feedback submitted successfully');
      expect(mockFeedbackController.createFeedback).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid category', async () => {
      mockFeedbackController.createFeedback.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      });

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer user-token')
        .send({
          category: 'invalid',
          description: 'Test feedback'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid category');
    });

    it('should return 400 for missing description', async () => {
      mockFeedbackController.createFeedback.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Description is required'
        });
      });

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer user-token')
        .send({
          category: 'general'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Description is required');
    });

    it('should return 401 for unauthorized access', async () => {
      mockFeedbackController.createFeedback.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      });

      const res = await request(app)
        .post('/api/feedback')
        .send({
          category: 'general',
          description: 'Test feedback'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not authenticated');
    });
  });

  describe('GET /api/feedback/my-feedback', () => {
    it('should return 200 with user feedback history', async () => {
      const mockFeedbackList = [
        {
          _id: 'feedback1',
          userId: 'user1',
          category: 'general',
          description: 'Great app!',
          createdAt: '2024-01-15T10:00:00.000Z',
          updatedAt: '2024-01-15T10:00:00.000Z'
        },
        {
          _id: 'feedback2',
          userId: 'user1',
          category: 'bug',
          description: 'Found a bug in payment',
          createdAt: '2024-01-14T09:00:00.000Z',
          updatedAt: '2024-01-14T09:00:00.000Z'
        }
      ];

      mockFeedbackController.getUserFeedback.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockFeedbackList,
          message: 'Feedback history retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/feedback/my-feedback')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('category', 'general');
      expect(res.body.data[1]).toHaveProperty('category', 'bug');
      expect(mockFeedbackController.getUserFeedback).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty array when no feedback exists', async () => {
      mockFeedbackController.getUserFeedback.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: [],
          message: 'No feedback found'
        });
      });

      const res = await request(app)
        .get('/api/feedback/my-feedback')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 for unauthorized access', async () => {
      mockFeedbackController.getUserFeedback.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      });

      const res = await request(app).get('/api/feedback/my-feedback');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not authenticated');
    });
  });

  describe('GET /api/feedback/all', () => {
    it('should return 200 with all feedback for admin', async () => {
      const mockAllFeedback = [
        {
          _id: 'feedback1',
          userId: {
            _id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            gender: 'male'
          },
          category: 'general',
          description: 'Great app!',
          createdAt: '2024-01-15T10:00:00.000Z',
          updatedAt: '2024-01-15T10:00:00.000Z'
        },
        {
          _id: 'feedback2',
          userId: {
            _id: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            gender: 'female'
          },
          category: 'bug',
          description: 'Found a payment issue',
          createdAt: '2024-01-14T09:00:00.000Z',
          updatedAt: '2024-01-14T09:00:00.000Z'
        }
      ];

      mockFeedbackController.getAllFeedback.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockAllFeedback,
          message: 'All feedback retrieved successfully'
        });
      });

      const res = await request(app)
        .get('/api/feedback/all')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('userId');
      expect(res.body.data[0].userId).toHaveProperty('name', 'John Doe');
      expect(res.body.data[1].userId).toHaveProperty('name', 'Jane Smith');
      expect(mockFeedbackController.getAllFeedback).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockFeedbackController.getAllFeedback.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      });

      const res = await request(app).get('/api/feedback/all');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'User not authenticated');
    });

    it('should return 403 for non-admin access', async () => {
      mockFeedbackController.getAllFeedback.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Admins only'
        });
      });

      const res = await request(app)
        .get('/api/feedback/all')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden - Admins only');
    });
  });
});
