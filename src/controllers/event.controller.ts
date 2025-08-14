// DEBUG: Logging added to event draft creation and manager event fetch for troubleshooting managerId assignment and visibility issues.
import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { EventManager } from '../models/eventManager.model';
import { EmailService } from '../services/email.service';
import { generateToken } from '../utils/jwt.util';
import cloudinary from '../config/cloudinary';
import { EventStaff } from '../models/eventStaff.model';
import { formatNamesCamelCase, objectIdsToStrings, datesToISOString } from '../utils/email.util';
import { TicketTier } from '../models/ticketTier.model';
import mongoose from 'mongoose';

export class EventController {
  async createEvent(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const createdBy = req.user?._id;
      if (!createdBy) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Validation: ticketPrice logic based on ticketTiers
      const { ticketTiers, ticketPrice } = req.body;
      if (!Array.isArray(ticketTiers) || ticketTiers.length === 0) {
        // No ticket tiers provided, set ticketPrice to 0 if not provided
        if (ticketPrice === undefined || ticketPrice === null) {
          req.body.ticketPrice = 0;
        } else if (typeof ticketPrice !== 'number' || ticketPrice < 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'ticketPrice must be a non-negative number' 
          });
        }
      } else {
        // Ticket tiers provided, set ticketPrice to 0 by default
        req.body.ticketPrice = 0;
      }

      const eventData = { ...req.body, createdBy, status: 'published', totalSoldCount: 0 };
      
      // Validation: if ticketTiers are provided, sum their quantity and compare to venue.capacity
      if (Array.isArray(req.body.ticketTiers) && req.body.venue && req.body.venue.capacity) {
        const totalSeats = req.body.ticketTiers.reduce((sum: number, tier: any) => sum + (Number(tier.quantity) || 0), 0);
        if (totalSeats > req.body.venue.capacity) {
          return res.status(400).json({ success: false, message: `Total ticket tier seats (${totalSeats}) exceed venue capacity (${req.body.venue.capacity})` });
        }
      }
      
      const event = new Event(eventData);
      await event.save();
      return res.status(201).json({ success: true, data: formatNamesCamelCase(event) });
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

      // Validation: ticketPrice logic based on ticketTiers
      const { ticketTiers, ticketPrice } = req.body;
      if (!Array.isArray(ticketTiers) || ticketTiers.length === 0) {
        // No ticket tiers provided, set ticketPrice to 0 if not provided
        if (ticketPrice === undefined || ticketPrice === null) {
          req.body.ticketPrice = 0;
        } else if (typeof ticketPrice !== 'number' || ticketPrice < 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'ticketPrice must be a non-negative number' 
          });
        }
      } else {
        // Ticket tiers provided, set ticketPrice to 0 by default
        req.body.ticketPrice = 0;
      }

      const eventData = { ...req.body, createdBy, status: 'draft', totalSoldCount: 0 };
      const event = new Event(eventData);
      await event.save();
      return res.status(201).json({ success: true, data: formatNamesCamelCase(event) });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async createDraftFlex(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'event_organizer') {
        return res.status(403).json({ success: false, message: 'Only event organizers can create events.' });
      }
      const createdBy = user._id;
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
        // Check for existing event manager with same email
        const existingEmail = await EventManager.findOne({ email });
        if (existingEmail) {
          return res.status(409).json({ success: false, message: 'Manager email already exists' });
        }
        
        // Check for existing event manager with same phone number
        const existingPhone = await EventManager.findOne({ phone });
        if (existingPhone) {
          return res.status(409).json({ success: false, message: 'Manager phone number already exists' });
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
      // If manager assignment is expected but managerId is missing, throw error
      if (manager && !managerIdToUse) {
        return res.status(400).json({ success: false, message: 'Manager assignment expected but managerId is missing.' });
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

      // Validation: ticketPrice logic based on ticketTiers (if updating these fields)
      if (req.body.ticketTiers !== undefined || req.body.ticketPrice !== undefined) {
        const ticketTiers = req.body.ticketTiers !== undefined ? req.body.ticketTiers : event.ticketTiers;
        const ticketPrice = req.body.ticketPrice !== undefined ? req.body.ticketPrice : event.ticketPrice;
        
        if (!Array.isArray(ticketTiers) || ticketTiers.length === 0) {
          // No ticket tiers provided, set ticketPrice to 0 if not provided
          if (ticketPrice === undefined || ticketPrice === null) {
            req.body.ticketPrice = 0;
          } else if (typeof ticketPrice !== 'number' || ticketPrice < 0) {
            return res.status(400).json({ 
              success: false, 
              message: 'ticketPrice must be a non-negative number' 
            });
          }
        } else {
          // Ticket tiers provided, set ticketPrice to 0 by default
          req.body.ticketPrice = 0;
        }
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
      const requiredFields = ['name', 'description', 'type', 'coverImages', 'date', 'startTime', 'endTime', 'venue', 'saleStart', 'saleEnd', 'refundPolicy'];
      for (const field of requiredFields) {
        if (!event[field]) {
          return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
        }
      }
      // Additional check: coverImages must be an array with at least 1 image
      if (!Array.isArray(event.coverImages) || event.coverImages.length < 1) {
        return res.status(400).json({ success: false, message: 'At least one cover image is required.' });
      }

      // Validate ticketPrice if no ticket tiers are used
      const collTiers = await TicketTier.find({ event: event._id }).lean();
      const hasTicketTiers = collTiers.length > 0 || (Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0);
      
      if (!hasTicketTiers) {
        // No ticket tiers, ticketPrice is required and must be valid
        if (event.ticketPrice === undefined || event.ticketPrice === null) {
          return res.status(400).json({ 
            success: false, 
            message: 'ticketPrice is required when publishing an event without ticket tiers' 
          });
        }
        if (typeof event.ticketPrice !== 'number' || event.ticketPrice < 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'ticketPrice must be a non-negative number when publishing an event without ticket tiers' 
          });
        }
      }

      // Capacity enforcement before publishing: ensure sum of tier quantities does not exceed venue capacity
      const capacity = event.venue?.capacity || 0;
      let totalTierQty = 0;
      if (collTiers.length > 0) {
        totalTierQty = collTiers.reduce((sum, t) => sum + (Number((t as any).quantity) || 0), 0);
      } else if (Array.isArray((event as any).ticketTiers) && (event as any).ticketTiers.length > 0) {
        totalTierQty = (event as any).ticketTiers.reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0);
      }
      if (capacity > 0 && totalTierQty > capacity) {
        return res.status(400).json({ success: false, message: `Total ticket tier seats (${totalTierQty}) exceed venue capacity (${capacity})` });
      }

      event.status = 'published';
      await event.save();
      const plain = event.toObject({ virtuals: true });
      const serializedIds = objectIdsToStrings(plain);
      const serialized = datesToISOString(serializedIds);
      return res.status(200).json({ success: true, data: formatNamesCamelCase(serialized) });
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
      if (!user || (user.role !== 'event_manager' && user.role !== 'event_organizer')) {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can access their event staff.' });
      }

      let organizerId;
      if (user.role === 'event_organizer') {
        organizerId = user._id;
      } else if (user.role === 'event_manager') {
        const manager = await EventManager.findById(user._id);
        if (!manager) {
          return res.status(404).json({ success: false, message: 'Event manager not found.' });
        }
        organizerId = manager.createdBy;
      }

      // Fetch all staff associated with this organizer, regardless of who created them or isActive status
      const eventStaff = await EventStaff
        .find({ organizerId: organizerId, isDeleted: false })
        .populate('event', 'name date')
        .populate('assignedEvents', 'name date startTime endTime');

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
      if (staff.isActive) {
        return res.status(400).json({ success: false, message: 'Event staff is already activated.' });
      }
      // Permission check: if event is assigned, check creator/manager; else allow both event_organizer and event_manager
      let allow = false;
      if (staff.event) {
        const event = await Event.findById(staff.event);
        if (event) {
          const isCreator = event.createdBy.toString() === user._id;
          // Allow any event_manager, not just the specific manager assigned to this event
          const isManager = user.role === 'event_manager';
          allow = isCreator || isManager;
        } else {
          // If event is missing, allow both event_organizer and event_manager
          allow = user.role === 'event_organizer' || user.role === 'event_manager';
        }
      } else {
        allow = user.role === 'event_organizer' || user.role === 'event_manager';
      }
      if (!allow) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to activate staff.' });
      }
      staff.isActive = true;
      if (!staff.organizerId && user.role === 'event_organizer') {
        staff.organizerId = new mongoose.Types.ObjectId(user._id);
      }
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
      if (!staff.isActive) {
        return res.status(400).json({ success: false, message: 'Event staff is already deactivated.' });
      }
      // Permission check: if event is assigned, check creator/manager; else allow both event_organizer and event_manager
      let allow = false;
      if (staff.event) {
        const event = await Event.findById(staff.event);
        if (event) {
          const isCreator = event.createdBy.toString() === user._id;
          // Allow any event_manager, not just the specific manager assigned to this event
          const isManager = user.role === 'event_manager';
          allow = isCreator || isManager;
        } else {
          // If event is missing, allow both event_organizer and event_manager
          allow = user.role === 'event_organizer' || user.role === 'event_manager';
        }
      } else {
        allow = user.role === 'event_organizer' || user.role === 'event_manager';
      }
      if (!allow) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to deactivate staff.' });
      }
      staff.isActive = false;
      if (!staff.organizerId && user.role === 'event_organizer') {
        staff.organizerId = new mongoose.Types.ObjectId(user._id);
      }
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

      // Allow update if user is creator, assigned manager, or cityfeed admin
      const isCreator = event.createdBy.toString() === userId;
      const isManager = event.managerId && event.managerId.toString() === userId;
      const isAdmin = userRole === 'cityfeed_admin';

      if (!isCreator && !isManager && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden: Not allowed to update this event' });
      }

      // Validate date if provided
      if (req.body.date) {
        const eventDate = new Date(req.body.date);
        if (eventDate < new Date()) {
          return res.status(400).json({ success: false, message: 'Event date must be in the future.' });
        }
      }

      // Handle cover image uploads if files are provided
      const files = (req as any).files as Express.Multer.File[];
      if (files && Array.isArray(files) && files.length > 0) {
        if (files.length < 1 || files.length > 3) {
          return res.status(400).json({ success: false, message: 'You must upload between 1 and 3 cover images.' });
        }
        // Upload each file to Cloudinary and collect URLs
        const uploadPromises = files.map(async (file: any) => {
          const b64 = Buffer.from(file.buffer).toString('base64');
          const dataURI = `data:${file.mimetype};base64,${b64}`;
          const result = await import('../config/cloudinary').then(mod => mod.default.uploader.upload(dataURI, {
            folder: 'event-covers',
            resource_type: 'auto',
          }));
          return result.secure_url;
        });
        event.coverImages = await Promise.all(uploadPromises);
      }
      // Update event fields
      const { ...rest } = req.body;
      Object.assign(event, rest);
      await event.save();

      // Update ticketTiers if provided with capacity enforcement
      if (Array.isArray(req.body.ticketTiers)) {
        const capacity = (req.body.venue?.capacity) ?? event.venue?.capacity ?? 0;
        const totalSeats = req.body.ticketTiers.reduce((sum: number, tier: any) => sum + (Number(tier.quantity) || 0), 0);
        if (capacity > 0 && totalSeats > capacity) {
          return res.status(400).json({ success: false, message: `Total ticket tier seats (${totalSeats}) exceed venue capacity (${capacity})` });
        }
        // Optionally, validate each ticket tier object here
        event.ticketTiers = req.body.ticketTiers;
      }

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

      // Allow delete if user is creator, assigned manager, or cityfeed admin
      const isCreator = event.createdBy.toString() === userId;
      const isManager = event.managerId && event.managerId.toString() === userId;
      const isAdmin = userRole === 'cityfeed_admin';

      if (!isCreator && !isManager && !isAdmin) {
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
      // Fetch the event by ID
      const event = await Event.findById(id)
        .lean({ virtuals: true });

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Add event_type to the event object
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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

      // Reconcile embedded vs collection tiers
      // If the event has embedded tiers, prefer those as the canonical list
      // (this matches what admins/editors see on the event document)
      const embeddedTiers: any[] = Array.isArray((event as any).ticketTiers)
        ? (event as any).ticketTiers
        : [];
      let ticketTiers: any[] = [];
      if (embeddedTiers.length > 0) {
        const embeddedIds = embeddedTiers
          .filter(t => t && t._id)
          .map(t => (t._id as any).toString());
        ticketTiers = await TicketTier.find({ event: id, _id: { $in: embeddedIds } }).lean();
        // If for some reason none found in collection, fallback to embedded
        if (ticketTiers.length === 0) {
          ticketTiers = embeddedTiers;
        }
      } else {
        // No embedded tiers → use collection
        ticketTiers = await TicketTier.find({ event: id }).lean();
      }
      // Calculate totalSoldCount first so it can be used below
      let totalSoldCount = 0;
      if (ticketTiers && Array.isArray(ticketTiers) && ticketTiers.length > 0) {
        totalSoldCount = ticketTiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
      } else {
        totalSoldCount = event.totalSoldCount || 0;
      }
      // Calculate totalSeats and availableSeats
      let totalSeats = 0;
      let availableSeats = 0;
      if (ticketTiers && Array.isArray(ticketTiers) && ticketTiers.length > 0) {
        totalSeats = ticketTiers.reduce((sum, tier) => sum + (tier.quantity || 0), 0);
        availableSeats = ticketTiers.reduce((sum, tier) => sum + ((tier.quantity || 0) - (tier.soldCount || 0)), 0);
      } else if (event.venue && event.venue.capacity) {
        totalSeats = event.venue.capacity;
        availableSeats = event.venue.capacity - totalSoldCount;
      }

      // Add 'available' field to each ticket tier
      let ticketTiersWithAvailable = ticketTiers;
      if (ticketTiers && Array.isArray(ticketTiers)) {
        ticketTiersWithAvailable = ticketTiers.map(tier => ({
          ...tier,
          available: (tier.quantity || 0) - (tier.soldCount || 0)
        }));
      }

      // Format date fields to 'YYYY-MM-DD' (date only)
      function formatDateOnly(dateVal: any) {
        if (!dateVal) return undefined;
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return undefined;
        return d.toISOString().split('T')[0];
      }
      const eventWithEventType = {
        ...event,
        date: formatDateOnly(event.date),
        startEventDate: formatDateOnly((event as any).startEventDate),
        endEventDate: formatDateOnly((event as any).endEventDate),
        event_type: eventType,
        totalSeats,
        availableSeats,
        totalSoldCount,
        ticketPrice: event.ticketPrice,
        ticketTiers: ticketTiersWithAvailable,
      };

      return res.json({ success: true, data: eventWithEventType });
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
        upcoming,
        page = 1,
        limit = 10,
      } = req.query;

      const filter: any = { status: 'published' };
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
        
        // Handle both events with ticketTiers and events with only ticketPrice
        andFilters.push({
          $or: [
            // Events with ticket tiers
            { 'ticketTiers.price': priceFilter },
            // Events with only ticketPrice (single-price events)
            { ticketPrice: priceFilter }
          ]
        });
      }
      
      // Filter for upcoming events only if requested
      if (upcoming === 'true' || upcoming === '1') {
        const now = new Date();
        andFilters.push({ date: { $gte: now } });
      }
      
      if (andFilters.length > 0) {
        filter.$and = andFilters;
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Only select key info for event cards
      const events = await Event.find(filter)
        .select('name date venue coverImages type ticketPrice ticketTiers')
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
          } else {
            eventType = 'past_event';
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

  async getDashboardData(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const organizerId = req.user?._id;
      if (!organizerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      // 1. Get all events created by this organizer
      const events = await Event.find({ createdBy: organizerId });
      const eventIds = events.map(e => e._id);
      const now = new Date();
      // Additions for dashboard metrics
      const totalEvents = await Event.countDocuments({ createdBy: organizerId });
      const upcomingEventsCount = await Event.countDocuments({ createdBy: organizerId, status: 'published', date: { $gte: now } });
      const completedEventsCount = await Event.countDocuments({ createdBy: organizerId, status: 'published', date: { $lt: now } });
      // 2. Active event count (published, saleEnd in future)
      const activeEventCount = await Event.countDocuments({ createdBy: organizerId, status: 'published', saleEnd: { $gte: now } });
      // 3. Event manager count
      const eventManagerCount = await EventManager.countDocuments({ createdBy: organizerId });
      // 4. Event staff count
      const eventStaffCount = await EventStaff.countDocuments({ organizerId });
      // 5. Total tickets sold (all events)
      const totalTicketsSold = await Event.aggregate([
        { $match: { createdBy: organizerId } },
        { $group: { _id: null, total: { $sum: '$totalSoldCount' } } }
      ]);
      // 6. Monthly ticket sales revenue (current FY)
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(year, 3, 1);
      const monthlySales = await Event.aggregate([
        { $match: { createdBy: organizerId, status: 'published', date: { $gte: fyStart } } },
        { $unwind: '$ticketTiers' },
        { $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' } },
          total: { $sum: { $multiply: ['$ticketTiers.soldCount', '$ticketTiers.price'] } }
        } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      // 7. Recent ticket sales (last 10, by event date)
      const recentTicketSales = await Event.find({ createdBy: organizerId, status: 'published' })
        .sort({ date: -1 })
        .limit(10)
        .select('name date totalSoldCount ticketTiers');
      // 8. Upcoming events
      const upcomingEvents = await Event.find({ createdBy: organizerId, status: 'published', date: { $gte: now } })
        .sort({ date: 1 })
        .limit(5)
        .select('name date venue');
      res.json({
        success: true,
        data: {
          activeEventCount,
          eventManagerCount,
          eventStaffCount,
          totalTicketsSold: totalTicketsSold[0]?.total || 0,
          monthlySales,
          recentTicketSales,
          upcomingEvents,
          totalEvents,
          upcomingEventsCount,
          completedEventsCount
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
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