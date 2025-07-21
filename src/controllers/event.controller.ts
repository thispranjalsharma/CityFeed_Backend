import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { EventManager } from '../models/eventManager.model';
import { EmailService } from '../services/email.service';
import { generateToken } from '../utils/jwt.util';
import cloudinary from '../config/cloudinary';
import { EventStaff } from '../models/eventStaff.model';

export class EventController {
  async createEvent(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const createdBy = req.user?._id;
      if (!createdBy) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const eventData = { ...req.body, createdBy, status: 'published' };
      const event = new Event(eventData);
      await event.save();
      return res.status(201).json({ success: true, data: event });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async createDraft(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const createdBy = req.user?._id;
      if (!createdBy) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const eventData = { ...req.body, createdBy, status: 'draft' };
      const event = new Event(eventData);
      await event.save();
      return res.status(201).json({ success: true, data: event });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async createDraftFlex(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const createdBy = req.user?._id;
      if (!createdBy) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const { name, type, manager, managerId, date } = req.body;
      if (!name || !type) {
        return res.status(400).json({ success: false, message: 'Event name and type are required' });
      }
      if (date) {
        const eventDate = new Date(date);
        if (eventDate < new Date()) {
          return res.status(400).json({ success: false, message: 'Event date must be in the future.' });
        }
      }
      let managerIdToUse = undefined;
      let managerObj = undefined;
      let verificationToken = undefined;
      if (managerId) {
        managerIdToUse = managerId;
        managerObj = await EventManager.findById(managerIdToUse);
        if (!managerObj) {
          return res.status(404).json({ success: false, message: 'Manager not found' });
        }
      } else if (manager && typeof manager === 'object') {
        const { name: mgrName, email, password, phone } = manager;
        if (!mgrName || !email || !password || !phone) {
          return res.status(400).json({ success: false, message: 'All manager fields are required' });
        }
        if (!isValidEmail(email)) {
          return res.status(400).json({ success: false, message: 'Invalid manager email format' });
        }
        if (!isValidPhone(phone)) {
          return res.status(400).json({ success: false, message: 'Invalid manager phone format' });
        }
        if (!isStrongPassword(password)) {
          return res.status(400).json({ success: false, message: 'Password must be at least 8 characters, include upper and lower case letters, a digit, and a special character' });
        }
        const existing = await EventManager.findOne({ email });
        if (existing) {
          return res.status(409).json({ success: false, message: 'Manager email already exists' });
        }
        const newManager = new EventManager({ name: mgrName, email, password, phone });
        await newManager.save();
        managerIdToUse = newManager._id;
        managerObj = newManager;
        // Send verification email to new manager
        verificationToken = generateToken({ _id: String(newManager._id), email: newManager.email, role: 'event_manager', type: 'event_manager' });
        const emailService = new EmailService();
        await emailService.sendVerificationEmail(newManager.email, verificationToken, 'event_manager');
      } else if (manager) {
        return res.status(400).json({ success: false, message: 'Invalid manager format' });
      }
      const eventData: any = { name, type, createdBy, status: 'draft' };
      if (managerIdToUse) eventData.managerId = managerIdToUse;
      const event = new Event(eventData);
      await event.save();
      return res.status(201).json({
        success: true,
        event: {
          ...event.toObject(),
          managerId: managerIdToUse ? managerIdToUse : undefined
        },
        manager: managerObj ? {
          _id: managerObj._id,
          name: managerObj.name,
          email: managerObj.email,
          phone: managerObj.phone
        } : undefined,
        verificationToken: verificationToken || undefined
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateDraft(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const event = await Event.findOne({ _id: req.params.id, status: 'draft' });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Draft event not found' });
      }
      // Only allow update if user is creator or assigned manager
      if (event.createdBy.toString() !== userId && (!event.managerId || event.managerId.toString() !== userId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to update this event' });
      }
      if (req.body.startEventDate && req.body.endEventDate) {
        const startEventDate = new Date(req.body.startEventDate);
        const endEventDate = new Date(req.body.endEventDate);
        if (startEventDate > endEventDate) {
          return res.status(400).json({ success: false, message: 'Start event date cannot be after end event date.' });
        }
        // If both are provided, remove 'date' field to avoid confusion
        delete req.body.date;
      }
      // Only update fields from JSON body (no file upload logic)
      Object.assign(event, req.body);
      await event.save();
      return res.status(200).json({ success: true, data: event });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateCoverImages(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const event = await Event.findOne({ _id: req.params.id, status: 'draft' });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Draft event not found' });
      }
      // Only allow update if user is creator or assigned manager
      if (event.createdBy.toString() !== userId && (!event.managerId || event.managerId.toString() !== userId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to update this event' });
      }
      const files = (req as any).files as Express.Multer.File[];
      if (files && Array.isArray(files)) {
        if (files.length < 1 || files.length > 3) {
          return res.status(400).json({ success: false, message: 'You must upload between 1 and 3 cover images.' });
        }
        // Upload each file to Cloudinary and collect URLs
        const uploadPromises = files.map(async (file: any) => {
          const b64 = Buffer.from(file.buffer).toString('base64');
          const dataURI = `data:${file.mimetype};base64,${b64}`;
          const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'event-covers',
            resource_type: 'auto',
          });
          return result.secure_url;
        });
        event.coverImages = await Promise.all(uploadPromises);
        await event.save();
        return res.status(200).json({ success: true, data: event });
      } else {
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async publishEvent(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const event = await Event.findOne({ _id: req.params.id, status: 'draft' });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Draft event not found' });
      }
      // Only allow publish if user is creator or assigned manager
      if (event.createdBy.toString() !== userId && (!event.managerId || event.managerId.toString() !== userId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to publish this event' });
      }
      // Validate required fields before publishing
      const requiredFields = ['name', 'description', 'type', 'coverImages', 'date', 'timezone', 'startTime', 'endTime', 'venue', 'saleStart', 'saleEnd', 'maxTicketsPerPerson', 'refundPolicy'];
      for (const field of requiredFields) {
        if (!event[field]) {
          return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
        }
      }
      // Additional check: coverImages must be an array with at least 1 image
      if (!Array.isArray(event.coverImages) || event.coverImages.length < 1) {
        return res.status(400).json({ success: false, message: 'At least one cover image is required.' });
      }
      event.status = 'published';
      await event.save();
      return res.status(200).json({ success: true, data: event });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async createEventStaff(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || !['event_manager', 'event_organizer'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event manager or organizer can create event staff.' });
      }
      const { eventId, name, email, password, phone, responsibilities } = req.body;
      if (!eventId || !name || !email || !password || !phone || !responsibilities) {
        return res.status(400).json({ success: false, message: 'All fields (eventId, name, email, password, phone, responsibilities) are required.' });
      }
      // Check event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      // Check for duplicate email
      const existing = await EventStaff.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Event staff email already exists.' });
      }
      // Create event staff with role set automatically
      const staff = new EventStaff({ name, email, password, phone, responsibilities, event: eventId, role: 'event_staff' });
      await staff.save();
      // Generate verification token and send email
      const token = generateToken({ _id: staff._id.toString(), email: staff.email, role: 'event_staff', type: 'event_staff' });
      const emailService = new EmailService();
      await emailService.sendVerificationEmail(staff.email, token, 'event_staff');
      return res.status(201).json({ success: true, data: { ...staff.toObject(), verificationToken: token } });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMyEvents(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'event_organizer') {
        return res.status(403).json({ success: false, message: 'Only event organizers can access their events.' });
      }
      const events = await Event.find({ createdBy: user._id });
      return res.status(200).json({ success: true, data: events });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getMyManagedEvents(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'event_manager') {
        return res.status(403).json({ success: false, message: 'Only event managers can access their assigned events.' });
      }
      const events = await Event.find({ managerId: user._id });
      return res.status(200).json({ success: true, data: events });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getMyStaffEvents(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'event_staff') {
        return res.status(403).json({ success: false, message: 'Only event staff can access their assigned events.' });
      }
      // Find all EventStaff assignments for this user
      const staffAssignments = await EventStaff.find({ _id: user._id });
      const eventIds = staffAssignments.map(s => s.event);
      const events = await Event.find({ _id: { $in: eventIds } });
      return res.status(200).json({ success: true, data: events });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getMyEventStaff(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'event_manager') {
        return res.status(403).json({ success: false, message: 'Only event managers can access their event staff.' });
      }

      // Get all events managed by this event manager
      const managedEvents = await Event.find({ managerId: user._id });
      const eventIds = managedEvents.map(event => event._id);

      // Get all event staff for these events
      const eventStaff = await EventStaff.find({ event: { $in: eventIds } }).populate('event', 'name date');

      return res.status(200).json({ success: true, data: eventStaff });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async activateEventStaff(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      const { staffId } = req.params;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizer or manager can activate staff.' });
      }
      const staff = await EventStaff.findById(staffId);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found.' });
      }
      const event = await Event.findById(staff.event);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to activate staff for this event.' });
      }
      staff.isActive = true;
      await staff.save();
      return res.status(200).json({ success: true, message: 'Event staff activated.', data: staff });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deactivateEventStaff(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      const { staffId } = req.params;
      if (!user || !['event_organizer', 'event_manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only event organizer or manager can deactivate staff.' });
      }
      const staff = await EventStaff.findById(staffId);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found.' });
      }
      const event = await Event.findById(staff.event);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      const isCreator = event.createdBy.toString() === user._id;
      const isManager = event.managerId && event.managerId.toString() === user._id;
      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to deactivate staff for this event.' });
      }
      staff.isActive = false;
      await staff.save();
      return res.status(200).json({ success: true, message: 'Event staff deactivated.', data: staff });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async editEvent(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Check authorization: only creator, assigned manager, or cityfeed admin can edit
      const isCreator = event.createdBy.toString() === userId;
      const isManager = event.managerId && event.managerId.toString() === userId;
      const isAdmin = userRole === 'cityfeed_admin';

      if (!isCreator && !isManager && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to edit this event' });
      }

      // Validate date if provided
      if (req.body.date) {
        const eventDate = new Date(req.body.date);
        if (eventDate < new Date()) {
          return res.status(400).json({ success: false, message: 'Event date must be in the future.' });
        }
      }

      // Update event fields
      Object.assign(event, req.body);
      await event.save();

      return res.status(200).json({ success: true, data: event });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteEvent(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Check authorization: only creator or cityfeed admin can delete
      const isCreator = event.createdBy.toString() === userId;
      const isAdmin = userRole === 'cityfeed_admin';

      if (!isCreator && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to delete this event' });
      }

      // Delete associated event staff
      await EventStaff.deleteMany({ event: req.params.id });

      // Delete the event
      await Event.findByIdAndDelete(req.params.id);

      return res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Fetch the event by ID, populate ticket tiers if they are in a separate collection
      const event = await Event.findById(id)
        .populate('tiers') // Only if you use virtuals for ticket tiers
        .lean();

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      return res.json({ success: true, data: event });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async listEvents(req: Request, res: Response) {
    try {
      const {
        search,
        date,
        location,
        category,
        minPrice,
        maxPrice,
        page = 1,
        limit = 10,
      } = req.query;

      const filter: any = {};
      const andFilters: any[] = [];

      if (search) {
        andFilters.push({ name: { $regex: search, $options: 'i' } });
      }
      if (date) {
        const start = new Date(date as string);
        const end = new Date(date as string);
        end.setHours(23, 59, 59, 999);
        andFilters.push({ date: { $gte: start, $lte: end } });
      }
      if (location) {
        andFilters.push({
          $or: [
            { 'venue.address': { $regex: location, $options: 'i' } },
            { 'venue.name': { $regex: location, $options: 'i' } }
          ]
        });
      }
      if (category) {
        andFilters.push({ type: category });
      }
      if (minPrice || maxPrice) {
        const priceFilter: any = {};
        if (minPrice) priceFilter.$gte = Number(minPrice);
        if (maxPrice) priceFilter.$lte = Number(maxPrice);
        andFilters.push({ 'tiers.price': priceFilter });
      }
      if (andFilters.length > 0) {
        filter.$and = andFilters;
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Only select key info for event cards
      const events = await Event.find(filter)
        .select('name date venue coverImages type')
        .sort({ date: 1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Event.countDocuments(filter);

      // Add event_type to each event
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventsWithType = events.map(event => {
        let eventType = '';
        if (event.date) {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          if (eventDate.getTime() === today.getTime()) {
            eventType = 'current_event';
          } else if (eventDate.getTime() > today.getTime()) {
            eventType = 'upcoming_event';
          }
        }
        return {
          ...event.toObject(),
          event_type: eventType
        };
      });

      return res.json({
        success: true,
        data: eventsWithType,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getEventTiers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Check if event exists
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      // Get all ticket tiers for this event
      const TicketTier = require('../models/ticketTier.model').TicketTier;
      const tiers = await TicketTier.find({ event: id }).lean();
      // Add real-time availability
      const tiersWithAvailability = tiers.map(tier => ({
        ...tier,
        available: tier.quantity - (tier.soldCount || 0)
      }));
      return res.json({ success: true, data: tiersWithAvailability });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
function isValidPhone(phone: string) {
  return /^\d{10}$/.test(phone);
}
function isStrongPassword(password: string) {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z\d]/.test(password);
} 