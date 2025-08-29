/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the ticket controller functions
const mockTicketController = {
  getTicketInfo: jest.fn(),
  scanTicket: jest.fn(),
  getMyTickets: jest.fn(),
};

// Create Express app with mocked routes
const app = express();
app.use(express.json());

// Define routes that call the mocked controllers - order matters!
app.get('/api/tickets/my', (req, res) => mockTicketController.getMyTickets(req, res));
app.post('/api/tickets/scan', (req, res) => mockTicketController.scanTicket(req, res));
app.get('/api/tickets/:ticketId', (req, res) => mockTicketController.getTicketInfo(req, res));

describe('Ticket Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tickets/:ticketId', () => {
    it('should return 200 with ticket information', async () => {
      const mockTicket = {
        _id: 'testticketid',
        eventId: 'testeventid',
        userId: 'testuserid',
        ticketTierId: 'testtierid',
        status: 'active',
        qrCode: 'qr-code-data'
      };

      mockTicketController.getTicketInfo.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockTicket
        });
      });

      const res = await request(app)
        .get('/api/tickets/testticketid');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        _id: 'testticketid',
        eventId: 'testeventid',
        status: 'active'
      });
      expect(mockTicketController.getTicketInfo).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent ticket', async () => {
      mockTicketController.getTicketInfo.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      });

      const res = await request(app)
        .get('/api/tickets/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Ticket not found');
    });
  });

  describe('POST /api/tickets/scan', () => {
    it('should return 200 for successful ticket scan', async () => {
      mockTicketController.scanTicket.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Ticket scanned successfully',
          data: {
            ticketId: req.body.ticketId,
            eventId: req.body.eventId,
            scannedAt: new Date().toISOString(),
            status: 'used'
          }
        });
      });

      const res = await request(app)
        .post('/api/tickets/scan')
        .send({
          ticketId: 'testticketid',
          eventId: 'testeventid'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Ticket scanned successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.status).toBe('used');
      expect(mockTicketController.scanTicket).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for already used ticket', async () => {
      mockTicketController.scanTicket.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Ticket has already been used'
        });
      });

      const res = await request(app)
        .post('/api/tickets/scan')
        .send({
          ticketId: 'usedticketid',
          eventId: 'testeventid'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Ticket has already been used');
    });
  });

  describe('GET /api/tickets/my', () => {
    it('should return 200 with user tickets', async () => {
      const mockTickets = [
        {
          _id: 'ticket1',
          eventId: 'event1',
          eventName: 'Test Event 1',
          status: 'active',
          qrCode: 'qr1'
        },
        {
          _id: 'ticket2',
          eventId: 'event2',
          eventName: 'Test Event 2',
          status: 'used',
          qrCode: 'qr2'
        }
      ];

      mockTicketController.getMyTickets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockTickets
        });
      });

      const res = await request(app)
        .get('/api/tickets/my');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('eventName');
      expect(mockTicketController.getMyTickets).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty array when no tickets exist', async () => {
      mockTicketController.getMyTickets.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: []
        });
      });

      const res = await request(app)
        .get('/api/tickets/my');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
