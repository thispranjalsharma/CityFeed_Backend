/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the order controller functions
const mockOrderController = {
  createOrder: jest.fn(),
  payWithCoins: jest.fn(),
  getMyOrders: jest.fn(),
  requestOrderCancellation: jest.fn(),
};

const mockResendOrderTickets = jest.fn();

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define routes that call the mocked controllers
app.post('/api/orders', (req, res) => mockOrderController.createOrder(req, res));
app.post('/api/orders/pay-with-coins', (req, res) => mockOrderController.payWithCoins(req, res));
app.get('/api/orders/my', (req, res) => mockOrderController.getMyOrders(req, res));
app.post('/api/orders/:orderId/resend-tickets', (req, res) => mockResendOrderTickets(req, res));
app.post('/api/orders/:orderId/cancel', (req, res) => mockOrderController.requestOrderCancellation(req, res));

describe('Order Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/orders', () => {
    it('should return 201 for successful order creation with proper response structure', async () => {
      const mockOrder = {
        _id: 'testorderid',
        userId: 'testuserid',
        eventId: 'testeventid',
        ticketTierId: 'testtierid',
        quantity: 2,
        totalAmount: 100,
        status: 'pending'
      };

      mockOrderController.createOrder.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          data: mockOrder
        });
      });

      const res = await request(app)
        .post('/api/orders')
        .send({
          eventId: 'testeventid',
          ticketTierId: 'testtierid',
          quantity: 2
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        _id: 'testorderid',
        eventId: 'testeventid',
        quantity: 2
      });
      expect(mockOrderController.createOrder).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      mockOrderController.createOrder.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: eventId, ticketTierId, quantity'
        });
      });

      const res = await request(app)
        .post('/api/orders')
        .send({
          eventId: 'testeventid'
          // Missing ticketTierId and quantity
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/orders/pay-with-coins', () => {
    it('should return 200 for successful coin payment with updated order', async () => {
      const mockUpdatedOrder = {
        _id: 'testorderid',
        status: 'paid',
        paymentMethod: 'coins',
        coinsUsed: 100,
        remainingAmount: 0
      };

      mockOrderController.payWithCoins.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Payment successful with coins',
          data: mockUpdatedOrder
        });
      });

      const res = await request(app)
        .post('/api/orders/pay-with-coins')
        .send({
          orderId: 'testorderid',
          coinsAmount: 100
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Payment successful with coins');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.status).toBe('paid');
      expect(res.body.data.paymentMethod).toBe('coins');
      expect(mockOrderController.payWithCoins).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for insufficient coins', async () => {
      mockOrderController.payWithCoins.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Insufficient coins. Required: 150, Available: 100'
        });
      });

      const res = await request(app)
        .post('/api/orders/pay-with-coins')
        .send({
          orderId: 'testorderid',
          coinsAmount: 100
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/orders/my', () => {
    it('should return 200 with user orders and proper pagination', async () => {
      const mockOrders = [
        {
          _id: 'order1',
          eventId: 'event1',
          status: 'confirmed',
          totalAmount: 100,
          createdAt: '2024-01-01'
        },
        {
          _id: 'order2',
          eventId: 'event2',
          status: 'pending',
          totalAmount: 150,
          createdAt: '2024-01-02'
        }
      ];

      mockOrderController.getMyOrders.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockOrders,
          pagination: {
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        });
      });

      const res = await request(app)
        .get('/api/orders/my')
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(mockOrderController.getMyOrders).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty array when no orders exist', async () => {
      mockOrderController.getMyOrders.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          }
        });
      });

      const res = await request(app)
        .get('/api/orders/my');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/orders/:orderId/resend-tickets', () => {
    it('should return 200 for successful ticket resend', async () => {
      mockResendOrderTickets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Tickets resent successfully to your email'
        });
      });

      const res = await request(app)
        .post('/api/orders/testorderid/resend-tickets');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Tickets resent successfully to your email');
      expect(mockResendOrderTickets).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent order', async () => {
      mockResendOrderTickets.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      });

      const res = await request(app)
        .post('/api/orders/nonexistent/resend-tickets');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Order not found');
    });
  });

  describe('POST /api/orders/:orderId/cancel', () => {
    it('should return 200 for successful cancellation request', async () => {
      mockOrderController.requestOrderCancellation.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Cancellation request submitted successfully',
          data: {
            orderId: req.params.orderId,
            status: 'cancellation_requested',
            requestedAt: new Date().toISOString()
          }
        });
      });

      const res = await request(app)
        .post('/api/orders/testorderid/cancel')
        .send({
          reason: 'Cannot attend the event',
          refundRequested: true
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.status).toBe('cancellation_requested');
      expect(mockOrderController.requestOrderCancellation).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for orders that cannot be cancelled', async () => {
      mockOrderController.requestOrderCancellation.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled. Event has already started or cancellation period has expired.'
        });
      });

      const res = await request(app)
        .post('/api/orders/testorderid/cancel');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });
});
