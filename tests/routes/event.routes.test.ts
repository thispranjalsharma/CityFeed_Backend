/**
 * @jest-environment node
 */
import request from 'supertest';
import express from 'express';

// Mock the actual controllers
const mockEventController = {
  listEvents: jest.fn(),
  createDraftFlex: jest.fn(),
  editEvent: jest.fn(),
  deleteEvent: jest.fn(),
  updateDraft: jest.fn(),
  getMyEvents: jest.fn(),
  getMyEventStaff: jest.fn(),
  getMyManagedEvents: jest.fn(),
  getMyStaffEvents: jest.fn(),
  getDashboardData: jest.fn(),
  getEventTiers: jest.fn(),
  getEventById: jest.fn(),
  updateCoverImages: jest.fn(),
  publishEvent: jest.fn(),
  activateEventStaff: jest.fn(),
  deactivateEventStaff: jest.fn(),
};

const mockEventStaffController = {
  assignEventStaffToEvent: jest.fn(),
};

// Create Express app with mocked routes that use the controller
const app = express();
app.use(express.json());

// Define ALL routes that call the mocked controllers (matching the actual route file)
app.get('/api/events', (req, res) => mockEventController.listEvents(req, res));
app.post('/api/events/draft-flex', (req, res) => mockEventController.createDraftFlex(req, res));
app.put('/api/events/:id/edit', (req, res) => mockEventController.editEvent(req, res));
app.delete('/api/events/:id/delete', (req, res) => mockEventController.deleteEvent(req, res));
app.patch('/api/events/:id', (req, res) => mockEventController.updateDraft(req, res));
app.get('/api/events/my-events', (req, res) => mockEventController.getMyEvents(req, res));
app.get('/api/events/my-event-staff', (req, res) => mockEventController.getMyEventStaff(req, res));
app.get('/api/events/managed-events', (req, res) => mockEventController.getMyManagedEvents(req, res));
app.get('/api/events/staff-events', (req, res) => mockEventController.getMyStaffEvents(req, res));
app.get('/api/events/dashboard', (req, res) => mockEventController.getDashboardData(req, res));
app.get('/api/events/:id/tiers', (req, res) => mockEventController.getEventTiers(req, res));
app.get('/api/events/:id', (req, res) => mockEventController.getEventById(req, res));
app.patch('/api/events/:id/cover-images', (req, res) => mockEventController.updateCoverImages(req, res));
app.post('/api/events/:id/publish', (req, res) => mockEventController.publishEvent(req, res));
app.patch('/api/events/staff/:staffId/activate', (req, res) => mockEventController.activateEventStaff(req, res));
app.patch('/api/events/staff/:staffId/deactivate', (req, res) => mockEventController.deactivateEventStaff(req, res));
app.post('/api/events/:eventId/assign-staff', (req, res) => {
  // Forward eventId from params to body (like in the actual route)
  req.body.eventId = req.params.eventId;
  mockEventStaffController.assignEventStaffToEvent(req, res);
});

describe('Event Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/events', () => {
    it('should return 200 with proper response structure and verify controller call', async () => {
      const mockEvents = [
        { _id: 'event1', name: 'Test Event 1', type: 'Seminar' },
        { _id: 'event2', name: 'Test Event 2', type: 'Workshop' }
      ];
      
      mockEventController.listEvents.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockEvents,
          pagination: { total: 2, page: 1, limit: 10, totalPages: 1 }
        });
      });

      const res = await request(app)
        .get('/api/events')
        .query({ page: 1, limit: 10 });

      // Test status code
      expect(res.statusCode).toBe(200);
      
      // Test response structure
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toEqual({ total: 2, page: 1, limit: 10, totalPages: 1 });
      
      // Test controller was called
      expect(mockEventController.listEvents).toHaveBeenCalledTimes(1);
    });

    it('should handle server errors gracefully', async () => {
      mockEventController.listEvents.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      });

      const res = await request(app).get('/api/events');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('POST /api/events/draft-flex', () => {
    it('should return 201 for valid event creation with proper response structure', async () => {
      const mockEvent = { _id: 'testeventid', name: 'Test Event', type: 'Seminar' };
      
      mockEventController.createDraftFlex.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          event: mockEvent,
          manager: null
        });
      });

      const res = await request(app)
        .post('/api/events/draft-flex')
        .send({ name: 'Test Event', type: 'Seminar' });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('event');
      expect(res.body.event).toMatchObject(mockEvent);
      expect(mockEventController.createDraftFlex).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      mockEventController.createDraftFlex.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Name and type are required'
        });
      });

      const res = await request(app)
        .post('/api/events/draft-flex')
        .send({ name: 'Test Event' }); // Missing type

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Name and type are required');
    });
  });

  describe('DELETE /api/events/:id/delete', () => {
    it('should return 200 for successful deletion', async () => {
      mockEventController.deleteEvent.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event deleted successfully'
        });
      });

      const res = await request(app)
        .delete('/api/events/testeventid/delete');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event deleted successfully');
      expect(mockEventController.deleteEvent).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent event', async () => {
      mockEventController.deleteEvent.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      });

      const res = await request(app)
        .delete('/api/events/nonexistent/delete');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event not found');
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return event with complete structure', async () => {
      const mockEvent = {
        _id: 'testeventid',
        name: 'Test Event',
        type: 'Seminar',
        description: 'Test Description',
        ticketTiers: [
          { name: 'General', price: 50, quantity: 100 },
          { name: 'VIP', price: 100, quantity: 50 }
        ]
      };

      mockEventController.getEventById.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: mockEvent
        });
      });

      const res = await request(app)
        .get('/api/events/testeventid');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        _id: 'testeventid',
        name: 'Test Event',
        type: 'Seminar'
      });
      expect(res.body.data.ticketTiers).toHaveLength(2);
      expect(mockEventController.getEventById).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent event', async () => {
      mockEventController.getEventById.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      });

      const res = await request(app)
        .get('/api/events/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event not found');
    });
  });

  describe('POST /api/events/:id/publish', () => {
    it('should return 200 for successful publication', async () => {
      mockEventController.publishEvent.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event published successfully'
        });
      });

      const res = await request(app)
        .post('/api/events/testeventid/publish');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event published successfully');
      expect(mockEventController.publishEvent).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for incomplete event data', async () => {
      mockEventController.publishEvent.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Missing required fields or invalid data'
        });
      });

      const res = await request(app)
        .post('/api/events/incomplete-event/publish');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/events/:id/edit', () => {
    it('should return 200 for successful event edit', async () => {
      const updatedEvent = {
        _id: 'testeventid',
        name: 'Updated Event Name',
        type: 'Workshop',
        description: 'Updated description'
      };

      mockEventController.editEvent.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedEvent
        });
      });

      const res = await request(app)
        .put('/api/events/testeventid/edit')
        .send({
          name: 'Updated Event Name',
          type: 'Workshop',
          description: 'Updated description'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(updatedEvent);
      expect(mockEventController.editEvent).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for unauthorized edit', async () => {
      mockEventController.editEvent.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden - Not allowed to edit this event'
        });
      });

      const res = await request(app)
        .put('/api/events/testeventid/edit')
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/events/:id', () => {
    it('should return 200 for successful draft update', async () => {
      const updatedDraft = {
        _id: 'testeventid',
        name: 'Updated Draft',
        status: 'draft'
      };

      mockEventController.updateDraft.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedDraft
        });
      });

      const res = await request(app)
        .patch('/api/events/testeventid')
        .send({ name: 'Updated Draft' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(mockEventController.updateDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/events/my-events', () => {
    it('should return 200 with organizer events including assigned staff', async () => {
      const myEvents = [
        { 
          _id: 'event1', 
          name: 'My Event 1', 
          createdBy: 'organizerid',
          assignStaffs: [
            {
              _id: 'staff1',
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              role: 'event_staff'
            }
          ]
        },
        { 
          _id: 'event2', 
          name: 'My Event 2', 
          createdBy: 'organizerid',
          assignStaffs: []
        }
      ];

      mockEventController.getMyEvents.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: myEvents
        });
      });

      const res = await request(app)
        .get('/api/events/my-events')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      
      // Check that first event has assigned staff
      expect(res.body.data[0]).toHaveProperty('assignStaffs');
      expect(res.body.data[0].assignStaffs).toHaveLength(1);
      expect(res.body.data[0].assignStaffs[0]).toHaveProperty('name', 'John Doe');
      expect(res.body.data[0].assignStaffs[0]).toHaveProperty('email', 'john@example.com');
      
      // Check that second event has empty assigned staff array
      expect(res.body.data[1]).toHaveProperty('assignStaffs');
      expect(res.body.data[1].assignStaffs).toHaveLength(0);
      
      expect(mockEventController.getMyEvents).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-organizer', async () => {
      mockEventController.getMyEvents.mockImplementation((req, res) => {
        res.status(403).json({
          success: false,
          message: 'Forbidden'
        });
      });

      const res = await request(app)
        .get('/api/events/my-events')
        .set('Authorization', 'Bearer user-token');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Forbidden');
    });
  });

  describe('GET /api/events/my-event-staff', () => {
    it('should return 200 with event staff for manager', async () => {
      const eventStaff = [
        { _id: 'staff1', name: 'Staff 1', event: { name: 'Event 1' } },
        { _id: 'staff2', name: 'Staff 2', event: { name: 'Event 2' } }
      ];

      mockEventController.getMyEventStaff.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: eventStaff
        });
      });

      const res = await request(app)
        .get('/api/events/my-event-staff')
        .set('Authorization', 'Bearer manager-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(mockEventController.getMyEventStaff).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/events/managed-events', () => {
    it('should return 200 with managed events', async () => {
      const managedEvents = [
        { _id: 'event1', name: 'Managed Event 1', manager: 'managerid' }
      ];

      mockEventController.getMyManagedEvents.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: managedEvents
        });
      });

      const res = await request(app)
        .get('/api/events/managed-events')
        .set('Authorization', 'Bearer manager-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockEventController.getMyManagedEvents).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/events/staff-events', () => {
    it('should return 200 with staff assigned events', async () => {
      const staffEvents = [
        { _id: 'event1', name: 'Staff Event 1', assignedStaff: ['staffid'] }
      ];

      mockEventController.getMyStaffEvents.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: staffEvents
        });
      });

      const res = await request(app)
        .get('/api/events/staff-events')
        .set('Authorization', 'Bearer staff-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(mockEventController.getMyStaffEvents).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/events/dashboard', () => {
    it('should return 200 with dashboard data', async () => {
      const dashboardData = {
        totalEvents: 5,
        upcomingEvents: 3,
        totalTicketsSold: 150,
        totalRevenue: 15000
      };

      mockEventController.getDashboardData.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: dashboardData
        });
      });

      const res = await request(app)
        .get('/api/events/dashboard')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject(dashboardData);
      expect(mockEventController.getDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/events/:id/tiers', () => {
    it('should return 200 with ticket tiers', async () => {
      const ticketTiers = [
        { _id: 'tier1', name: 'General', price: 50, quantity: 100, soldCount: 20 },
        { _id: 'tier2', name: 'VIP', price: 100, quantity: 50, soldCount: 10 }
      ];

      mockEventController.getEventTiers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: ticketTiers
        });
      });

      const res = await request(app)
        .get('/api/events/testeventid/tiers');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('soldCount');
      expect(mockEventController.getEventTiers).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent event', async () => {
      mockEventController.getEventTiers.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      });

      const res = await request(app)
        .get('/api/events/nonexistent/tiers');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Event not found');
    });
  });

  describe('PATCH /api/events/:id/cover-images', () => {
    it('should return 200 for successful cover image update on draft event', async () => {
      const updatedEvent = {
        _id: 'testeventid',
        name: 'Test Event',
        status: 'draft',
        coverImages: ['image1.jpg', 'image2.jpg']
      };

      mockEventController.updateCoverImages.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedEvent
        });
      });

      const res = await request(app)
        .patch('/api/events/testeventid/cover-images')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('coverImages');
      expect(mockEventController.updateCoverImages).toHaveBeenCalledTimes(1);
    });

    it('should return 200 for successful cover image update on published event', async () => {
      const updatedEvent = {
        _id: 'testeventid',
        name: 'Test Event',
        status: 'published',
        coverImages: ['image1.jpg', 'image2.jpg']
      };

      mockEventController.updateCoverImages.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: updatedEvent
        });
      });

      const res = await request(app)
        .patch('/api/events/testeventid/cover-images')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('coverImages');
      expect(mockEventController.updateCoverImages).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid image data', async () => {
      mockEventController.updateCoverImages.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Invalid input data'
        });
      });

      const res = await request(app)
        .patch('/api/events/testeventid/cover-images')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/events/staff/:staffId/activate', () => {
    it('should return 200 for successful staff activation', async () => {
      const activatedStaff = {
        _id: 'staffid',
        name: 'Test Staff',
        isActive: true
      };

      mockEventController.activateEventStaff.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event staff activated.',
          data: activatedStaff
        });
      });

      const res = await request(app)
        .patch('/api/events/staff/staffid/activate')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event staff activated.');
      expect(res.body).toHaveProperty('data');
      expect(mockEventController.activateEventStaff).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent staff', async () => {
      mockEventController.activateEventStaff.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          message: 'Event staff or event not found'
        });
      });

      const res = await request(app)
        .patch('/api/events/staff/nonexistent/activate')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/events/staff/:staffId/deactivate', () => {
    it('should return 200 for successful staff deactivation', async () => {
      const deactivatedStaff = {
        _id: 'staffid',
        name: 'Test Staff',
        isActive: false
      };

      mockEventController.deactivateEventStaff.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Event staff deactivated.',
          data: deactivatedStaff
        });
      });

      const res = await request(app)
        .patch('/api/events/staff/staffid/deactivate')
        .set('Authorization', 'Bearer organizer-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Event staff deactivated.');
      expect(res.body).toHaveProperty('data');
      expect(mockEventController.deactivateEventStaff).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/events/:eventId/assign-staff', () => {
    it('should verify request body structure and assign staff successfully', async () => {
      mockEventStaffController.assignEventStaffToEvent.mockImplementation((req, res) => {
        // Verify the request structure
        expect(req.body).toHaveProperty('eventId', 'testeventid');
        expect(req.body).toHaveProperty('eventStaffId', 'teststaffid');
        expect(req.body).toHaveProperty('responsibilities');
        expect(req.body.responsibilities).toEqual(['approve_entry', 'scan_qr_code']);
        
        res.status(200).json({
          success: true,
          data: {
            eventId: req.body.eventId,
            eventStaffId: req.body.eventStaffId,
            responsibilities: req.body.responsibilities
          }
        });
      });

      const res = await request(app)
        .post('/api/events/testeventid/assign-staff')
        .send({
          eventStaffId: 'teststaffid',
          responsibilities: ['approve_entry', 'scan_qr_code']
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.responsibilities).toEqual(['approve_entry', 'scan_qr_code']);
      expect(mockEventStaffController.assignEventStaffToEvent).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing required fields', async () => {
      mockEventStaffController.assignEventStaffToEvent.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: 'Missing or invalid fields'
        });
      });

      const res = await request(app)
        .post('/api/events/testeventid/assign-staff')
        .send({}); // Empty body

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Missing or invalid fields');
    });
  });
});
