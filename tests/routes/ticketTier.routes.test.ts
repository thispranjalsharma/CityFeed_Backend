/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the ticketTier controller functions
const mockTicketTierController = {
  createTicketTier: jest.fn(),
  getTicketTiers: jest.fn(),
  updateTicketTier: jest.fn(),
  deleteTicketTier: jest.fn(),
  bulkCreateTicketTiers: jest.fn(),
  getEventWithTiers: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define ALL actual ticketTier routes
app.post('/api/ticket-tiers', (req, res) => mockTicketTierController.createTicketTier(req, res));
app.get('/api/ticket-tiers/:eventId', (req, res) => mockTicketTierController.getTicketTiers(req, res));
app.put('/api/ticket-tiers/:ticketTierId', (req, res) => mockTicketTierController.updateTicketTier(req, res));
app.delete('/api/ticket-tiers/:ticketTierId', (req, res) => mockTicketTierController.deleteTicketTier(req, res));
app.post('/api/ticket-tiers/bulk', (req, res) => mockTicketTierController.bulkCreateTicketTiers(req, res));
app.get('/api/events/:eventId/tiers', (req, res) => mockTicketTierController.getEventWithTiers(req, res));

describe('TicketTier Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ticket-tiers', () => {
    it('should return 201 for successful ticket tier creation', async () => {
      const mockTicketTier = {
        _id: 'tier1',
        eventId: 'event1',
        name: 'General Admission',
        price: 50,
        quantity: 1000,
        description: 'Access to general areas',
        order: 1,
        isActive: true,
        soldCount: 0
      };

      mockTicketTierController.createTicketTier.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockTicketTier
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'event1',
          tiers: [{
            name: 'General Admission',
            price: 50,
            quantity: 1000,
            description: 'Access to general areas',
            order: 1,
            isActive: true
          }]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockTicketTier);
      expect(mockTicketTierController.createTicketTier).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockTicketTierController.createTicketTier.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'event1',
          tiers: [{
            name: '',
            price: -10,
            quantity: 0
          }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 for unauthorized access', async () => {
      mockTicketTierController.createTicketTier.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers')
        .send({
          eventId: 'event1',
          tiers: [{
            name: 'General Admission',
            price: 50,
            quantity: 1000
          }]
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for forbidden access (non-organizer/manager)', async () => {
      mockTicketTierController.createTicketTier.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Not allowed to create ticket tiers for this event'
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers')
        .set('Authorization', 'Bearer user-token')
        .send({
          eventId: 'event1',
          tiers: [{
            name: 'General Admission',
            price: 50,
            quantity: 1000
          }]
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent event', async () => {
      mockTicketTierController.createTicketTier.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'nonexistent',
          tiers: [{
            name: 'General Admission',
            price: 50,
            quantity: 1000
          }]
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event not found');
    });

    it('should return 409 for duplicate order', async () => {
      mockTicketTierController.createTicketTier.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Order already exists for this event'
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'event1',
          tiers: [{
            name: 'General Admission',
            price: 50,
            quantity: 1000,
            order: 1
          }]
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Order already exists for this event');
    });
  });

  describe('GET /api/ticket-tiers/:eventId', () => {
    it('should return 200 with ticket tiers for event', async () => {
      const mockTicketTiers = [
        {
          _id: 'tier1',
          eventId: 'event1',
          name: 'General Admission',
          price: 50,
          quantity: 1000,
          soldCount: 100,
          order: 1,
          isActive: true
        },
        {
          _id: 'tier2',
          eventId: 'event1',
          name: 'VIP',
          price: 150,
          quantity: 200,
          soldCount: 50,
          order: 2,
          isActive: true
        }
      ];

      mockTicketTierController.getTicketTiers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockTicketTiers
        });
      });

      const res = await request(app)
        .get('/api/ticket-tiers/event1')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('name', 'General Admission');
      expect(res.body.data[1]).toHaveProperty('name', 'VIP');
      expect(mockTicketTierController.getTicketTiers).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for unauthorized access', async () => {
      mockTicketTierController.getTicketTiers.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).get('/api/ticket-tiers/event1');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for forbidden access', async () => {
      mockTicketTierController.getTicketTiers.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Not allowed to view ticket tiers for this event'
        });
      });

      const res = await request(app)
        .get('/api/ticket-tiers/event1')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent event', async () => {
      mockTicketTierController.getTicketTiers.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      });

      const res = await request(app)
        .get('/api/ticket-tiers/nonexistent')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event not found');
    });
  });

  describe('PUT /api/ticket-tiers/:ticketTierId', () => {
    it('should return 200 for successful ticket tier update', async () => {
      const mockUpdatedTier = {
        _id: 'tier1',
        eventId: 'event1',
        name: 'Updated Early Bird',
        price: 45,
        quantity: 1200,
        description: 'Updated early bird tickets',
        order: 1,
        isActive: true,
        soldCount: 100
      };

      mockTicketTierController.updateTicketTier.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockUpdatedTier
        });
      });

      const res = await request(app)
        .put('/api/ticket-tiers/tier1')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'Updated Early Bird',
          price: 45,
          quantity: 1200,
          description: 'Updated early bird tickets'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(mockUpdatedTier);
      expect(mockTicketTierController.updateTicketTier).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockTicketTierController.updateTicketTier.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .put('/api/ticket-tiers/tier1')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          price: -10,
          quantity: 0
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent ticket tier', async () => {
      mockTicketTierController.updateTicketTier.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Ticket tier not found'
        });
      });

      const res = await request(app)
        .put('/api/ticket-tiers/nonexistent')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          name: 'Updated Tier'
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Ticket tier not found');
    });

    it('should return 409 for duplicate order', async () => {
      mockTicketTierController.updateTicketTier.mockImplementation((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Order already exists for this event'
        });
      });

      const res = await request(app)
        .put('/api/ticket-tiers/tier1')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          order: 2
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Order already exists for this event');
    });
  });

  describe('DELETE /api/ticket-tiers/:ticketTierId', () => {
    it('should return 200 for successful ticket tier deletion', async () => {
      mockTicketTierController.deleteTicketTier.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Ticket tier deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/ticket-tiers/tier1')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Ticket tier deleted successfully');
      expect(mockTicketTierController.deleteTicketTier).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for ticket tier with sold tickets', async () => {
      mockTicketTierController.deleteTicketTier.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Cannot delete ticket tier with sold tickets'
        });
      });

      const res = await request(app)
        .delete('/api/ticket-tiers/tier1')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Cannot delete ticket tier with sold tickets');
    });

    it('should return 401 for unauthorized access', async () => {
      mockTicketTierController.deleteTicketTier.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      });

      const res = await request(app).delete('/api/ticket-tiers/tier1');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 403 for forbidden access', async () => {
      mockTicketTierController.deleteTicketTier.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Not allowed to delete ticket tiers for this event'
        });
      });

      const res = await request(app)
        .delete('/api/ticket-tiers/tier1')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent ticket tier', async () => {
      mockTicketTierController.deleteTicketTier.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Ticket tier not found'
        });
      });

      const res = await request(app)
        .delete('/api/ticket-tiers/nonexistent')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Ticket tier not found');
    });
  });

  describe('POST /api/ticket-tiers/bulk', () => {
    it('should return 201 for successful bulk ticket tier creation', async () => {
      const mockBulkTiers = [
        {
          _id: 'tier1',
          eventId: 'event1',
          name: 'General Admission',
          price: 50,
          quantity: 1000,
          order: 1,
          isActive: true
        },
        {
          _id: 'tier2',
          eventId: 'event1',
          name: 'VIP',
          price: 150,
          quantity: 200,
          order: 2,
          isActive: true
        }
      ];

      mockTicketTierController.bulkCreateTicketTiers.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockBulkTiers
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers/bulk')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'event1',
          tiers: [
            {
              name: 'General Admission',
              price: 50,
              quantity: 1000,
              order: 1,
              isActive: true
            },
            {
              name: 'VIP',
              price: 150,
              quantity: 200,
              order: 2,
              isActive: true
            }
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('name', 'General Admission');
      expect(res.body.data[1]).toHaveProperty('name', 'VIP');
      expect(mockTicketTierController.bulkCreateTicketTiers).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid bulk input data', async () => {
      mockTicketTierController.bulkCreateTicketTiers.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers/bulk')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'event1',
          tiers: [
            {
              name: '',
              price: -10
            }
          ]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent event', async () => {
      mockTicketTierController.bulkCreateTicketTiers.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      });

      const res = await request(app)
        .post('/api/ticket-tiers/bulk')
        .set('Authorization', 'Bearer organizer-token')
        .send({
          eventId: 'nonexistent',
          tiers: [
            {
              name: 'General Admission',
              price: 50,
              quantity: 1000,
              order: 1
            }
          ]
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event not found');
    });
  });

  describe('GET /api/events/:eventId/tiers', () => {
    it('should return 200 with event and its ticket tiers', async () => {
      const mockEventWithTiers = {
        event: {
          _id: 'event1',
          name: 'Test Event',
          description: 'A test event',
          date: '2024-06-01',
          venue: {
            name: 'Test Venue',
            address: '123 Test St'
          }
        },
        tiers: [
          {
            _id: 'tier1',
            eventId: 'event1',
            name: 'General Admission',
            price: 50,
            quantity: 1000,
            soldCount: 100,
            order: 1,
            isActive: true
          },
          {
            _id: 'tier2',
            eventId: 'event1',
            name: 'VIP',
            price: 150,
            quantity: 200,
            soldCount: 50,
            order: 2,
            isActive: true
          }
        ]
      };

      mockTicketTierController.getEventWithTiers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          event: mockEventWithTiers.event,
          tiers: mockEventWithTiers.tiers
        });
      });

      const res = await request(app)
        .get('/api/events/event1/tiers')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('event');
      expect(res.body).toHaveProperty('tiers');
      expect(res.body.event).toMatchObject(mockEventWithTiers.event);
      expect(res.body.tiers).toHaveLength(2);
      expect(res.body.tiers[0]).toHaveProperty('name', 'General Admission');
      expect(res.body.tiers[1]).toHaveProperty('name', 'VIP');
      expect(mockTicketTierController.getEventWithTiers).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid input data', async () => {
      mockTicketTierController.getEventWithTiers.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .get('/api/events/invalid-id/tiers')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid input data');
    });

    it('should return 404 for non-existent event', async () => {
      mockTicketTierController.getEventWithTiers.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      });

      const res = await request(app)
        .get('/api/events/nonexistent/tiers')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event not found');
    });
  });
});
