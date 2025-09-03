// DEBUG: Logging added to event draft creation and manager event fetch for troubleshooting managerId assignment and visibility issues.
import { Request, Response } from 'express';
import { Event, IAssignedStaff } from '../models/event.model';
import { EventManager } from '../models/eventManager.model';
import { EmailService } from '../services/email.service';
import { generateToken } from '../utils/jwt.util';
import cloudinary from '../config/cloudinary';
import { EventStaff } from '../models/eventStaff.model';
import { formatNamesCamelCase, objectIdsToStrings, datesToISOString } from '../utils/email.util';
import { TicketTier } from '../models/ticketTier.model';
import mongoose, { Document } from 'mongoose';
import { logger } from '../utils/logger.util';

// Interface for event with assigned staff
interface IEventWithStaff extends Omit<Document, '_id'> {
  _id: mongoose.Types.ObjectId;
  assignStaffs: IAssignedStaff[];
  cancellationInfo?: {
    isCancelled: boolean;
    cancelledBy?: mongoose.Types.ObjectId;
    cancelledAt?: Date;
    cancellationDescription?: string;
    cancellationInstructions?: string;
  };
}

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

      // Validate sale start and end dates against event ending date and time
      const validateSaleDates = () => {
        // Determine the event ending date and time
        let eventEndingDateTime: Date | null = null;
        
        if (req.body.date) {
          // Single day event
          const eventDate = new Date(req.body.date);
          const endTime = req.body.endTime;
          if (!endTime) {
            return { valid: false, message: 'End time is required for event creation' };
          }
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(eventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (req.body.startEventDate && req.body.endEventDate) {
          // Multi-day event
          const endEventDate = new Date(req.body.endEventDate);
          const endTime = req.body.endTime;
          if (!endTime) {
            return { valid: false, message: 'End time is required for event creation' };
          }
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(endEventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else {
          return { valid: false, message: 'Either date (for single-day events) or startEventDate and endEventDate (for multi-day events) are required' };
        }

        // Validate saleStart if provided
        if (req.body.saleStart) {
          const saleStart = new Date(req.body.saleStart);
          if (saleStart >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleEnd if provided
        if (req.body.saleEnd) {
          const saleEnd = new Date(req.body.saleEnd);
          if (saleEnd >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale end date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleStart is before saleEnd if both are provided
        if (req.body.saleStart && req.body.saleEnd) {
          const saleStart = new Date(req.body.saleStart);
          const saleEnd = new Date(req.body.saleEnd);
          if (saleStart >= saleEnd) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before sale end date and time' 
            };
          }
        }

        return { valid: true };
      };

      const saleDateValidation = validateSaleDates();
      if (!saleDateValidation.valid) {
        return res.status(400).json({ success: false, message: saleDateValidation.message });
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

      // Validate sale start and end dates against event ending date and time
      const validateSaleDates = () => {
        // Determine the event ending date and time
        let eventEndingDateTime: Date | null = null;
        
        if (req.body.date) {
          // Single day event
          const eventDate = new Date(req.body.date);
          const endTime = req.body.endTime;
          if (!endTime) {
            return { valid: false, message: 'End time is required for event creation' };
          }
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(eventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (req.body.startEventDate && req.body.endEventDate) {
          // Multi-day event
          const endEventDate = new Date(req.body.endEventDate);
          const endTime = req.body.endTime;
          if (!endTime) {
            return { valid: false, message: 'End time is required for event creation' };
          }
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(endEventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else {
          return { valid: false, message: 'Either date (for single-day events) or startEventDate and endEventDate (for multi-day events) are required' };
        }

        // Validate saleStart if provided
        if (req.body.saleStart) {
          const saleStart = new Date(req.body.saleStart);
          if (saleStart >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleEnd if provided
        if (req.body.saleEnd) {
          const saleEnd = new Date(req.body.saleEnd);
          if (saleEnd >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale end date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleStart is before saleEnd if both are provided
        if (req.body.saleStart && req.body.saleEnd) {
          const saleStart = new Date(req.body.saleStart);
          const saleEnd = new Date(req.body.saleEnd);
          if (saleStart >= saleEnd) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before sale end date and time' 
            };
          }
        }

        return { valid: true };
      };

      const saleDateValidation = validateSaleDates();
      if (!saleDateValidation.valid) {
        return res.status(400).json({ success: false, message: saleDateValidation.message });
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
        const emailService = EmailService.getInstance();
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

      // Validate sale start and end dates against event ending date and time
      const validateSaleDates = () => {
        // Determine the event ending date and time
        let eventEndingDateTime: Date | null = null;
        
        if (req.body.date) {
          // Single day event
          const eventDate = new Date(req.body.date);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(eventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (req.body.startEventDate && req.body.endEventDate) {
          // Multi-day event
          const endEventDate = new Date(req.body.endEventDate);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(endEventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (event.date) {
          // Existing single day event
          const eventDate = new Date(event.date);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(eventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (event.startEventDate && event.endEventDate) {
          // Existing multi-day event
          const endEventDate = new Date(event.endEventDate);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(endEventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        }

        if (!eventEndingDateTime) {
          return { valid: false, message: 'Unable to determine event ending date and time' };
        }

        // Validate saleStart if provided
        if (req.body.saleStart) {
          const saleStart = new Date(req.body.saleStart);
          if (saleStart >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleEnd if provided
        if (req.body.saleEnd) {
          const saleEnd = new Date(req.body.saleEnd);
          if (saleEnd >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale end date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleStart is before saleEnd if both are provided
        if (req.body.saleStart && req.body.saleEnd) {
          const saleStart = new Date(req.body.saleStart);
          const saleEnd = new Date(req.body.saleEnd);
          if (saleStart >= saleEnd) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before sale end date and time' 
            };
          }
        }

        return { valid: true };
      };

      const saleDateValidation = validateSaleDates();
      if (!saleDateValidation.valid) {
        return res.status(400).json({ success: false, message: saleDateValidation.message });
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
      const event = await Event.findOne({ _id: req.params.id });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
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
      const requiredFields = ['name', 'description', 'type', 'coverImages', 'startTime', 'endTime', 'venue', 'saleStart', 'saleEnd', 'refundPolicy'];
      
      // Check for date fields - either single date or multi-day dates
      const hasSingleDate = event.date;
      const hasMultiDayDates = event.startEventDate && event.endEventDate;
      
      if (!hasSingleDate && !hasMultiDayDates) {
        return res.status(400).json({ success: false, message: 'Missing required field: date (for single-day events) or startEventDate and endEventDate (for multi-day events)' });
      }
      
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
      // Use embedded ticket tiers from event instead of deprecated collection
      const hasTicketTiers = Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0;
      
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
      if (hasTicketTiers) {
        totalTierQty = event.ticketTiers.reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0);
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
      
      // Find events created by this organizer
      const events = await Event.find({ createdBy: user._id });
      
      // Get all event IDs to find assigned staff
      const eventIds = events.map(event => event._id);
      
      // Find all staff assigned to these events
      const { EventStaff } = await import('../models/eventStaff.model');
      const assignedStaff = await EventStaff.find({
        $or: [
          { event: { $in: eventIds } },
          { assignedEvents: { $in: eventIds } }
        ],
        isDeleted: false
      }).select('name email phone role event assignedEvents');
      
      // Create a map of event ID to assigned staff
      const eventStaffMap = new Map();
      
      assignedStaff.forEach(staff => {
        // Handle single event assignment
        if (staff.event) {
          const eventId = staff.event.toString();
          if (!eventStaffMap.has(eventId)) {
            eventStaffMap.set(eventId, new Map()); // Use Map to track staff by ID
          }
          // Only add if not already present
          if (!eventStaffMap.get(eventId).has(staff._id.toString())) {
            eventStaffMap.get(eventId).set(staff._id.toString(), {
              _id: staff._id,
              name: staff.name,
              email: staff.email,
              phone: staff.phone,
              role: staff.role
            });
          }
        }
        
        // Handle multiple event assignments
        if (staff.assignedEvents && Array.isArray(staff.assignedEvents)) {
          staff.assignedEvents.forEach(eventId => {
            const eventIdStr = eventId.toString();
            if (!eventStaffMap.has(eventIdStr)) {
              eventStaffMap.set(eventIdStr, new Map()); // Use Map to track staff by ID
            }
            // Only add if not already present
            if (!eventStaffMap.get(eventIdStr).has(staff._id.toString())) {
              eventStaffMap.get(eventIdStr).set(staff._id.toString(), {
                _id: staff._id,
                name: staff.name,
                email: staff.email,
                phone: staff.phone,
                role: staff.role
              });
            }
          });
        }
      });
      
      // Add assigned staff to each event (convert Map values to array)
      const eventsWithStaff = events.map(event => {
        const eventObj = event.toObject() as IEventWithStaff;
        const staffMap = eventStaffMap.get(event._id.toString());
        eventObj.assignStaffs = staffMap ? Array.from(staffMap.values()) : [];
        
        // Add cancellation information if event is cancelled
        if (event.isCancelled) {
          eventObj.cancellationInfo = {
            isCancelled: event.isCancelled,
            cancelledBy: event.cancelledBy,
            cancelledAt: event.cancelledAt,
            cancellationDescription: event.cancellationDescription,
            cancellationInstructions: event.cancellationInstructions
          };
        }
        
        return eventObj;
      });
      
      return res.status(200).json({ success: true, data: eventsWithStaff });
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
      
      // Add cancellation information to each event
      const eventsWithCancellationInfo = events.map(event => {
        const eventObj: any = event.toObject();
        
        // Add cancellation information if event is cancelled
        if (event.isCancelled) {
          eventObj.cancellationInfo = {
            isCancelled: event.isCancelled,
            cancelledBy: event.cancelledBy,
            cancelledAt: event.cancelledAt,
            cancellationDescription: event.cancellationDescription,
            cancellationInstructions: event.cancellationInstructions
          };
        }
        
        return eventObj;
      });
      
      return res.status(200).json({ success: true, data: eventsWithCancellationInfo });
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
      
      // Find the event staff record for this user
      const staffRecord = await EventStaff.findById(user._id);
      if (!staffRecord) {
        return res.status(404).json({ success: false, message: 'Event staff record not found.' });
      }
      
      // Collect all event IDs from both current event and assigned events
      const eventIds = [];
      
      // Add current event if assigned
      if (staffRecord.event) {
        eventIds.push(staffRecord.event);
      }
      
      // Add all assigned events from the assignedEvents array
      if (staffRecord.assignedEvents && Array.isArray(staffRecord.assignedEvents)) {
        eventIds.push(...staffRecord.assignedEvents);
      }
      
      // Remove duplicates
      const uniqueEventIds = [...new Set(eventIds.map(id => id.toString()))];
      
      if (uniqueEventIds.length === 0) {
        return res.status(200).json({ 
          success: true, 
          data: [],
          message: 'No events assigned to this staff member'
        });
      }
      
      // Fetch all assigned events with full details
      const events = await Event.find({ 
        _id: { $in: uniqueEventIds },
        status: 'published'  // Only return published events
      });
      
      // Add event_type to each event
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventsWithType = events.map(event => {
        let eventType = '';
        if (event.date) {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          
          if (eventDate.getTime() === today.getTime()) {
            // Event is today - check if it's currently running based on time
            if (event.startTime && event.endTime) {
              const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
              const startTime = event.startTime.split(':').map(Number);
              const endTime = event.endTime.split(':').map(Number);
              const eventStartMinutes = startTime[0] * 60 + startTime[1];
              const eventEndMinutes = endTime[0] * 60 + endTime[1];
              
              if (currentTime >= eventStartMinutes && currentTime <= eventEndMinutes) {
                eventType = 'current_event';
              } else if (currentTime < eventStartMinutes) {
                eventType = 'upcoming_event';
              } else {
                eventType = 'past_event';
              }
            } else {
              // If no time specified, consider it current for the whole day
              eventType = 'current_event';
            }
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
      
      // Sort by date (latest first)
      eventsWithType.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return res.status(200).json({ 
        success: true, 
        data: eventsWithType,
        totalAssigned: eventsWithType.length
      });
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

      // Validate sale start and end dates against event ending date and time
      const validateSaleDates = () => {
        // Determine the event ending date and time
        let eventEndingDateTime: Date | null = null;
        
        if (req.body.date) {
          // Single day event
          const eventDate = new Date(req.body.date);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(eventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (req.body.startEventDate && req.body.endEventDate) {
          // Multi-day event
          const endEventDate = new Date(req.body.endEventDate);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(endEventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (event.date) {
          // Existing single day event
          const eventDate = new Date(event.date);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(eventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        } else if (event.startEventDate && event.endEventDate) {
          // Existing multi-day event
          const endEventDate = new Date(event.endEventDate);
          const endTime = req.body.endTime || event.endTime;
          const [hours, minutes] = endTime.split(':').map(Number);
          eventEndingDateTime = new Date(endEventDate);
          eventEndingDateTime.setHours(hours, minutes, 0, 0);
        }

        if (!eventEndingDateTime) {
          return { valid: false, message: 'Unable to determine event ending date and time' };
        }

        // Validate saleStart if provided
        if (req.body.saleStart) {
          const saleStart = new Date(req.body.saleStart);
          if (saleStart >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleEnd if provided
        if (req.body.saleEnd) {
          const saleEnd = new Date(req.body.saleEnd);
          if (saleEnd >= eventEndingDateTime) {
            return { 
              valid: false, 
              message: 'Sale end date and time must be before the event ending date and time' 
            };
          }
        }

        // Validate saleStart is before saleEnd if both are provided
        if (req.body.saleStart && req.body.saleEnd) {
          const saleStart = new Date(req.body.saleStart);
          const saleEnd = new Date(req.body.saleEnd);
          if (saleStart >= saleEnd) {
            return { 
              valid: false, 
              message: 'Sale start date and time must be before sale end date and time' 
            };
          }
        }

        return { valid: true };
      };

      const saleDateValidation = validateSaleDates();
      if (!saleDateValidation.valid) {
        return res.status(400).json({ success: false, message: saleDateValidation.message });
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
        
        // Preserve existing soldCount values when updating ticket tiers
        const updatedTicketTiers = req.body.ticketTiers.map((newTier: any) => {
          // Find existing tier with the same ID to preserve soldCount
          const existingTier = event.ticketTiers.find((existing: any) => 
            existing._id && existing._id.toString() === newTier._id
          );
          
          return {
            ...newTier,
            soldCount: existingTier ? existingTier.soldCount : 0
          };
        });
        
        event.ticketTiers = updatedTicketTiers;
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

      // Include cancelled events but mark them clearly
      // No more 410 status - show cancelled events with cancellation info

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

      // Use embedded ticket tiers from event instead of deprecated collection
      const embeddedTiers: any[] = Array.isArray((event as any).ticketTiers)
        ? (event as any).ticketTiers
        : [];
      const eventTicketTiers = embeddedTiers;
      
      // Import activeBookingSessions for real-time availability calculation
      const { activeBookingSessions } = await import('../server');
      
      // Calculate totalSoldCount first so it can be used below
      let totalSoldCount = 0;
      if (eventTicketTiers && Array.isArray(eventTicketTiers) && eventTicketTiers.length > 0) {
        totalSoldCount = eventTicketTiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
      } else {
        totalSoldCount = event.totalSoldCount || 0;
      }

      // Calculate totalSeats and availableSeats with real-time booking sessions
      let totalSeats = 0;
      let availableSeats = 0;

      if (eventTicketTiers && Array.isArray(eventTicketTiers) && eventTicketTiers.length > 0) {
        totalSeats = eventTicketTiers.reduce((sum, tier) => sum + (tier.quantity || 0), 0);
        
        // Calculate available seats including active booking sessions
        const activeSessionsForEvent = Array.from(activeBookingSessions.values())
          .filter(session => session.eventId === id);
        
        const reservedQuantity = activeSessionsForEvent.reduce((sum, session) => sum + session.quantity, 0);
        availableSeats = totalSeats - totalSoldCount - reservedQuantity;
      } else if (event.venue && event.venue.capacity) {
        totalSeats = event.venue.capacity;
        
        // For events without tiers, check general booking sessions
        const activeSessionsForEvent = Array.from(activeBookingSessions.values())
          .filter(session => session.eventId === id && !session.tierId);
        
        const reservedQuantity = activeSessionsForEvent.reduce((sum, session) => sum + session.quantity, 0);
        availableSeats = event.venue.capacity - totalSoldCount - reservedQuantity;
      }

      // Update ticket tiers with real-time availability (maintaining existing structure)
      let ticketTiersWithAvailable = eventTicketTiers;
      if (eventTicketTiers && Array.isArray(eventTicketTiers)) {
        ticketTiersWithAvailable = eventTicketTiers.map(tier => {
          // Calculate reserved tickets for this specific tier
          const activeSessionsForTier = Array.from(activeBookingSessions.values())
            .filter(session => session.tierId === tier._id?.toString() && session.eventId === id);
          
          const reservedForTier = activeSessionsForTier.reduce((sum, session) => sum + session.quantity, 0);
          const actuallyAvailable = (tier.quantity || 0) - (tier.soldCount || 0) - reservedForTier;
          
          return {
            ...tier,
            available: Math.max(0, actuallyAvailable) // Update existing 'available' field with real-time data
          };
        });
      }

      // Format date fields to 'YYYY-MM-DD' (date only)
      function formatDateOnly(dateVal: any) {
        if (!dateVal) return undefined;
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return undefined;
        return d.toISOString().split('T')[0];
      }

      const eventWithEventType: any = {
        ...event,
        date: formatDateOnly(event.date),
        startEventDate: formatDateOnly((event as any).startEventDate),
        endEventDate: formatDateOnly((event as any).endEventDate),
        event_type: eventType,
        totalSeats,
        availableSeats: Math.max(0, availableSeats), // Update existing field with real-time data
        totalSoldCount,
        ticketPrice: event.ticketPrice,
        ticketTiers: ticketTiersWithAvailable
        // Note: NOT adding new fields to maintain backward compatibility
      };

      // Add cancellation information if event is cancelled
      if (event.isCancelled) {
        eventWithEventType.cancellationInfo = {
          isCancelled: true,
          cancelledBy: event.cancelledBy,
          cancelledAt: event.cancelledAt,
          cancellationDescription: event.cancellationDescription,
          cancellationInstructions: event.cancellationInstructions
        };
      }

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
      } = req.query;

      const filter: any = { status: 'published' };
      const andFilters: any[] = [];

      // Include cancelled events in public listings (don't filter them out)
      // andFilters.push({ isCancelled: { $ne: true } }); // REMOVED - show cancelled events

      // Exclude past events - only show current and upcoming events
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Handle both single-day and multi-day events
      andFilters.push({
        $or: [
          // Single-day events: date >= today
          { date: { $gte: today } },
          // Multi-day events: endEventDate >= today (event hasn't ended yet)
          { endEventDate: { $gte: today } }
        ]
      });

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
      
      // Filter for upcoming events only if requested
      if (upcoming === 'true' || upcoming === '1') {
        andFilters.push({ date: { $gte: now } });
      }
      
      if (andFilters.length > 0) {
        filter.$and = andFilters;
      }

      // Get all events without pagination
      const events = await Event.find(filter)
        .select('name date startEventDate endEventDate venue coverImages type ticketPrice ticketTiers startTime endTime isCancelled cancelledBy cancelledAt cancellationDescription cancellationInstructions');

      // Add event_type to each event
      const eventsWithType = events.map(event => {
        let eventType = '';
        
        // Handle single-day events
        if (event.date) {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          
          if (eventDate.getTime() === today.getTime()) {
            // Event is today - check if it's currently running based on time
            if (event.startTime && event.endTime) {
              const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
              const startTime = event.startTime.split(':').map(Number);
              const endTime = event.endTime.split(':').map(Number);
              const eventStartMinutes = startTime[0] * 60 + startTime[1];
              const eventEndMinutes = endTime[0] * 60 + endTime[1];
              
              if (currentTime >= eventStartMinutes && currentTime <= eventEndMinutes) {
                eventType = 'current_event';
              } else if (currentTime < eventStartMinutes) {
                eventType = 'upcoming_event';
              } else {
                eventType = 'past_event';
              }
            } else {
              // If no time specified, consider it current for the whole day
              eventType = 'current_event';
            }
          } else if (eventDate.getTime() > today.getTime()) {
            eventType = 'upcoming_event';
          } else {
            eventType = 'past_event';
          }
        }
        // Handle multi-day events
        else if (event.startEventDate && event.endEventDate) {
          const startEventDate = new Date(event.startEventDate);
          const endEventDate = new Date(event.endEventDate);
          startEventDate.setHours(0, 0, 0, 0);
          endEventDate.setHours(0, 0, 0, 0);
          
          // Check if today falls within the multi-day event period
          if (today.getTime() >= startEventDate.getTime() && today.getTime() <= endEventDate.getTime()) {
            // Event is happening today - check if it's currently running based on time
            if (event.startTime && event.endTime) {
              const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
              const startTime = event.startTime.split(':').map(Number);
              const endTime = event.endTime.split(':').map(Number);
              const eventStartMinutes = startTime[0] * 60 + startTime[1];
              const eventEndMinutes = endTime[0] * 60 + endTime[1];
              
              if (currentTime >= eventStartMinutes && currentTime <= eventEndMinutes) {
                eventType = 'current_event';
              } else if (currentTime < eventStartMinutes) {
                eventType = 'upcoming_event';
              } else {
                eventType = 'past_event';
              }
            } else {
              // If no time specified, consider it current for the whole day
              eventType = 'current_event';
            }
          } else if (startEventDate.getTime() > today.getTime()) {
            eventType = 'upcoming_event';
          } else {
            eventType = 'past_event';
          }
        }
        
        // Add cancellation information if event is cancelled
        const eventWithType: any = {
          ...event.toObject(),
          event_type: eventType
        };

        // Add cancellation details if event is cancelled
        if (event.isCancelled) {
          eventWithType.cancellationInfo = {
            isCancelled: true,
            cancelledBy: event.cancelledBy,
            cancelledAt: event.cancelledAt,
            cancellationDescription: event.cancellationDescription,
            cancellationInstructions: event.cancellationInstructions
          };
        }
        
        return eventWithType;
      });

      // Sort events by priority: current events first, then upcoming, then past
      eventsWithType.sort((a, b) => {
        const priority = { 'current_event': 1, 'upcoming_event': 2, 'past_event': 3 };
        return priority[a.event_type] - priority[b.event_type];
      });

      return res.json({
        success: true,
        data: eventsWithType,
        total: eventsWithType.length
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
      // Get all ticket tiers from embedded tiers instead of deprecated collection
      const tiers = event.ticketTiers || [];
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

  async getEventTicketBookings(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 10, status, search } = req.query;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Authorization check based on user role
      let hasPermission = false;
      
      if (user.role === 'event_organizer') {
        // Event organizers can only access events they created
        hasPermission = event.createdBy.toString() === user._id.toString();
      } else if (user.role === 'event_manager') {
        // Event managers can only access events they're assigned to manage
        hasPermission = Boolean(event.managerId) && event.managerId!.toString() === user._id.toString();
      } else if (user.role === 'event_staff') {
        // Event staff can access events they're assigned to
        const staff = await EventStaff.findById(user._id);
        if (staff && staff.assignedEvents && staff.assignedEvents.includes(eventId as any)) {
          hasPermission = true;
        }
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: You do not have permission to access this event\'s ticket bookings' 
        });
      }

      // Import Ticket model
      const { Ticket } = await import('../models/ticket.model');
      const { User } = await import('../models/user.model');

      // Build query
      const query: any = { eventId };
      
      if (status) {
        query.status = status;
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Get tickets with user details
      let ticketsQuery = Ticket.find(query)
        .populate({
          path: 'userId',
          select: 'name email phone membershipType membershipExpiryDate profilePicture address'
        })
        .populate({
          path: 'ticketTierId',
          select: 'name price description'
        })
        .populate({
          path: 'scannedBy',
          select: 'name email'
        })
        .sort({ issuedAt: -1 });

      // Add search functionality
      if (search) {
        ticketsQuery = ticketsQuery.populate({
          path: 'userId',
          match: {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } }
            ]
          },
          select: 'name email phone membershipType membershipExpiryDate profilePicture address'
        });
      }

      const tickets = await ticketsQuery.skip(skip).limit(Number(limit)).lean();
      const totalTickets = await Ticket.countDocuments(query);

      // Filter out tickets where user doesn't match search (if search is applied)
      const filteredTickets = search ? tickets.filter(ticket => ticket.userId) : tickets;

      // Format response
      const formattedTickets = filteredTickets.map(ticket => ({
        ticketId: ticket._id,
        orderId: ticket.orderId,
        status: ticket.status,
        quantity: ticket.quantity,
        issuedAt: ticket.issuedAt,
        scannedAt: ticket.scannedAt,
        qrCodeUrl: ticket.qrCodeUrl,
        user: ticket.userId && typeof ticket.userId === 'object' && '_id' in ticket.userId ? {
          id: (ticket.userId as any)._id,
          name: (ticket.userId as any).name,
          email: (ticket.userId as any).email,
          phone: (ticket.userId as any).phone,
          membershipType: (ticket.userId as any).membershipType,
          membershipExpiryDate: (ticket.userId as any).membershipExpiryDate,
          profilePicture: (ticket.userId as any).profilePicture,
          address: (ticket.userId as any).address
        } : null,
        ticketTier: ticket.ticketTierId && typeof ticket.ticketTierId === 'object' && '_id' in ticket.ticketTierId ? {
          id: (ticket.ticketTierId as any)._id,
          name: (ticket.ticketTierId as any).name,
          price: (ticket.ticketTierId as any).price,
          description: (ticket.ticketTierId as any).description
        } : null,
        scannedBy: ticket.scannedBy && typeof ticket.scannedBy === 'object' && '_id' in ticket.scannedBy ? {
          id: (ticket.scannedBy as any)._id,
          name: (ticket.scannedBy as any).name,
          email: (ticket.scannedBy as any).email
        } : null
      }));

      // Calculate statistics
      const stats = await Ticket.aggregate([
        { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);

      const statistics = {
        total: 0,
        active: 0,
        used: 0,
        invalidated: 0,
        totalQuantity: 0
      };

      stats.forEach(stat => {
        statistics[stat._id as keyof typeof statistics] = stat.count;
        statistics.totalQuantity += stat.totalQuantity;
      });

      res.json({
        success: true,
        data: {
          event: {
            id: event._id,
            name: event.name,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            venue: event.venue
          },
          tickets: formattedTickets,
          statistics,
          pagination: {
            total: totalTickets,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalTickets / Number(limit))
          }
        }
      });

    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async cancelEvent(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const { eventId } = req.params;
      const { description, instructions, otp } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check if user has permission to cancel events
      if (!['event_organizer', 'event_manager', 'cityfeed_admin'].includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Only event organizers and event managers can cancel events' 
        });
      }

      // Validate event ID
      if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ success: false, message: 'Invalid event ID' });
      }

      // Find the event
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Check if user can cancel this specific event
      if (user.role === 'event_organizer' && event.createdBy.toString() !== user._id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Only the event creator can cancel this event' 
        });
      }

      if (user.role === 'event_manager') {
        const isAssignedManager = event.managerId && event.managerId.toString() === user._id;
        if (!isAssignedManager) {
          return res.status(403).json({ 
            success: false, 
            message: 'Forbidden: Only the event creator or assigned manager can cancel this event' 
          });
        }
      }

      // Check if event is already cancelled
      if (event.isCancelled) {
        return res.status(400).json({ 
          success: false, 
          message: 'Event is already cancelled' 
        });
      }

      // OTP verification is required for event cancellation
      if (!otp) {
        return res.status(400).json({ 
          success: false, 
          message: 'OTP is required for event cancellation. Please request an OTP first.',
          data: {
            requiresOTP: true,
            message: 'Use /api/events/{eventId}/cancel/request-otp to get verification code'
          }
        });
      }

      // Verify OTP
      try {
        const { OTPService } = await import('../services/otp.service');
        const otpService = new OTPService();
        
        // Get user's email for OTP verification
        const { User } = await import('../models/user.model');
        const { EventOrganizer } = await import('../models/eventOrganizer.model');
        const { EventManager } = await import('../models/eventManager.model');
        
        logger.info('🔍 [DEBUG] Importing user models for OTP verification', { 
          userId: user._id,
          userRole: user.role 
        });
        
        let userDoc: any = null;
        let userCollection = '';
        
        // Search in appropriate collection based on role
        if (user.role === 'event_organizer') {
          userDoc = await EventOrganizer.findById(user._id);
          userCollection = 'EventOrganizer';
        } else if (user.role === 'event_manager') {
          userDoc = await EventManager.findById(user._id);
          userCollection = 'EventManager';
        } else if (user.role === 'cityfeed_admin') {
          userDoc = await User.findById(user._id);
          userCollection = 'User';
        } else {
          userDoc = await User.findById(user._id);
          userCollection = 'User';
        }
        
        logger.info('🔍 [DEBUG] User lookup result for OTP verification', {
          userId: user._id,
          userRole: user.role,
          userCollection,
          userFound: !!userDoc,
          hasEmail: userDoc ? !!userDoc.email : false,
          email: userDoc?.email || 'NO_EMAIL'
        });
        
        if (!userDoc || !userDoc.email) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email address required for event cancellation. Please add an email address to your profile.',
            data: {
              requiresEmail: true,
              message: 'Event organizers and managers must have a valid email address for security verification',
              instructions: 'Please update your profile with a valid email address and try again'
            }
          });
        }

        const isOTPValid = await otpService.verifyEmailOTP(userDoc.email, otp, 'event_cancellation');
        
        if (!isOTPValid) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid or expired OTP. Please request a new one.' 
          });
        }
      } catch (otpError: any) {
        logger.error('OTP verification error:', otpError);
        return res.status(400).json({ 
          success: false, 
          message: 'OTP verification failed. Please try again.' 
        });
      }

      // Proceed with event cancellation
      event.isCancelled = true;
      event.cancelledBy = new mongoose.Types.ObjectId(user._id);
      event.cancelledAt = new Date();
      event.cancellationDescription = description || null;
      event.cancellationInstructions = instructions || null;

      await event.save();

      // Find all ticket holders and send email notifications
      const { Ticket } = await import('../models/ticket.model');
      const tickets = await Ticket.find({
        eventId: eventId,
        status: { $in: ['active', 'used'] }
      }).populate('userId', 'name email');

      if (tickets.length > 0) {
        const emailService = EmailService.getInstance();
        const eventDate = event.date ? new Date(event.date).toLocaleDateString() :
                         (event.startEventDate ? new Date(event.startEventDate).toLocaleDateString() : 'TBD');

        const emailPromises = tickets.map(async (ticket) => {
          try {
            if (ticket.userId && (ticket.userId as any).email) {
              await emailService.sendEventCancellationNotification({
                to: (ticket.userId as any).email,
                userName: (ticket.userId as any).name || 'Valued Customer',
                eventName: event.name,
                eventDate: eventDate,
                cancellationReason: event.cancellationDescription,
                cancellationInstructions: event.cancellationInstructions
              });
            }
          } catch (error) {
            console.error(`Failed to send cancellation email to user ${ticket.userId}:`, error);
          }
        });

        Promise.allSettled(emailPromises).then(results => {
          const successful = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          logger.info(`Event cancellation emails: ${successful} sent, ${failed} failed`);
        });
      }

      return res.status(200).json({
        success: true,
        message: `Event cancelled successfully. ${tickets.length} ticket holders will be notified via email.`,
        data: {
          eventId: event._id,
          isCancelled: true,
          cancelledBy: event.cancelledBy,
          cancelledAt: event.cancelledAt,
          cancellationDescription: event.cancellationDescription,
          cancellationInstructions: event.cancellationInstructions,
          notificationsSent: tickets.length
        }
      });

    } catch (error) {
      logger.error('Error in cancelEvent:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  /**
   * Request OTP for event cancellation
   */
  async requestCancellationOTP(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const { eventId } = req.params;
      const user = req.user;

      logger.info('🔍 [DEBUG] requestCancellationOTP called', {
        eventId,
        userId: user?._id,
        userRole: user?.role,
        timestamp: new Date().toISOString()
      });

      if (!user) {
        logger.error('❌ [DEBUG] No user found in request');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      logger.info('✅ [DEBUG] User authenticated', {
        userId: user._id,
        userRole: user.role
      });

      // Check if user has permission to cancel events
      if (!['event_organizer', 'event_manager', 'cityfeed_admin'].includes(user.role)) {
        logger.warn('🚫 [DEBUG] User lacks permission to cancel events', {
          userId: user._id,
          userRole: user.role,
          allowedRoles: ['event_organizer', 'event_manager', 'cityfeed_admin']
        });
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Only event organizers and event managers can cancel events' 
        });
      }

      logger.info('✅ [DEBUG] User has permission to cancel events', {
        userId: user._id,
        userRole: user.role
      });

      // Validate event ID
      if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
        logger.error('❌ [DEBUG] Invalid event ID', {
          eventId,
          isValid: mongoose.Types.ObjectId.isValid(eventId)
        });
        return res.status(400).json({ success: false, message: 'Invalid event ID' });
      }

      logger.info('✅ [DEBUG] Event ID validated', { eventId });

      // Find the event
      const event = await Event.findById(eventId);
      if (!event) {
        logger.error('❌ [DEBUG] Event not found in database', { eventId });
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      logger.info('✅ [DEBUG] Event found in database', {
        eventId: event._id,
        eventName: event.name,
        eventStatus: event.status,
        isCancelled: event.isCancelled,
        createdBy: event.createdBy
      });

      // Check if user can cancel this specific event
      if (user.role === 'event_organizer' && event.createdBy.toString() !== user._id) {
        logger.warn('🚫 [DEBUG] User is not the event creator', {
          userId: user._id,
          eventCreatorId: event.createdBy.toString(),
          isCreator: event.createdBy.toString() === user._id
        });
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Only the event creator can cancel this event' 
        });
      }

      if (user.role === 'event_manager') {
        const isAssignedManager = event.managerId && event.managerId.toString() === user._id;
        logger.info('🔍 [DEBUG] Checking if user is assigned manager', {
          userId: user._id,
          eventManagerId: event.managerId?.toString(),
          isAssignedManager
        });
        
        if (!isAssignedManager) {
          logger.warn('🚫 [DEBUG] User is not the assigned manager', {
            userId: user._id,
            eventManagerId: event.managerId?.toString(),
            isAssignedManager
          });
          return res.status(403).json({ 
            success: false, 
            message: 'Forbidden: Only the event creator or assigned manager can cancel this event' 
          });
        }
      }

      logger.info('✅ [DEBUG] User has permission to cancel this specific event', {
        userId: user._id,
        userRole: user.role,
        eventId: event._id
      });

      // Check if event is already cancelled
      if (event.isCancelled) {
        logger.warn('⚠️ [DEBUG] Event is already cancelled', {
          eventId: event._id,
          cancelledBy: event.cancelledBy,
          cancelledAt: event.cancelledAt
        });
        return res.status(400).json({ 
          success: false, 
          message: 'Event is already cancelled' 
        });
      }

      logger.info('✅ [DEBUG] Event is not cancelled, proceeding with OTP request');

      // Get user's email
      const { User } = await import('../models/user.model');
      const { EventOrganizer } = await import('../models/eventOrganizer.model');
      const { EventManager } = await import('../models/eventManager.model');
      
      logger.info('🔍 [DEBUG] Importing user models and searching for user', { 
        userId: user._id,
        userRole: user.role 
      });
      
      let userDoc: any = null;
      let userCollection = '';
      
      // Search in appropriate collection based on role
      if (user.role === 'event_organizer') {
        userDoc = await EventOrganizer.findById(user._id);
        userCollection = 'EventOrganizer';
      } else if (user.role === 'event_manager') {
        userDoc = await EventManager.findById(user._id);
        userCollection = 'EventManager';
      } else if (user.role === 'cityfeed_admin') {
        userDoc = await User.findById(user._id);
        userCollection = 'User';
      } else {
        userDoc = await User.findById(user._id);
        userCollection = 'User';
      }
      
      logger.info('🔍 [DEBUG] User lookup result', {
        userId: user._id,
        userRole: user.role,
        userCollection,
        userFound: !!userDoc,
        hasEmail: userDoc ? !!userDoc.email : false,
        email: userDoc?.email || 'NO_EMAIL',
        docUserRole: userDoc?.role || 'NO_ROLE',
        userPhone: userDoc?.phone || 'NO_PHONE'
      });
      
      if (!userDoc || !userDoc.email) {
        logger.error('❌ [DEBUG] User email not found or user not found', {
          userId: user._id,
          userFound: !!userDoc,
          hasEmail: userDoc ? !!userDoc.email : false,
          email: userDoc?.email || 'NO_EMAIL',
          userRole: userDoc?.role || 'NO_ROLE'
        });
        return res.status(400).json({ 
          success: false, 
          message: 'Email address required for event cancellation. Please add an email address to your profile.',
          data: {
            requiresEmail: true,
            message: 'Event organizers and managers must have a valid email address for security verification',
            instructions: 'Please update your profile with a valid email address and try again'
          }
        });
      }

      logger.info('✅ [DEBUG] User email found, proceeding to send OTP', {
        userId: user._id,
        email: userDoc.email,
        userRole: userDoc.role
      });

      // Send OTP to user's email
      try {
        const { OTPService } = await import('../services/otp.service');
        const otpService = new OTPService();
        
        logger.info('🔍 [DEBUG] OTPService imported and instantiated');
        
        const otpResult = await otpService.sendOTPToEmail(userDoc.email, 'event_cancellation');
        
        logger.info('✅ [DEBUG] OTP sent successfully', {
          userId: user._id,
          email: userDoc.email,
          otpResult: otpResult ? 'OTP_GENERATED' : 'NO_OTP'
        });
        
        return res.status(200).json({
          success: true,
          message: 'OTP sent to your registered email for verification',
          data: {
            otpSent: true,
            otpType: 'email',
            email: userDoc.email,
            message: 'Please check your email and enter the OTP to confirm event cancellation',
            expiresIn: '5 minutes'
          }
        });
      } catch (otpError: any) {
        logger.error('❌ [DEBUG] Failed to send OTP for event cancellation', {
          userId: user._id,
          email: userDoc.email,
          error: otpError.message,
          errorStack: otpError.stack
        });
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send verification code. Please try again later.' 
        });
      }

    } catch (error) {
      logger.error('❌ [DEBUG] Error in requestCancellationOTP', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }

  async getEventTicketHolders(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Only event organizers and event managers can view ticket holders
      if (!['event_organizer', 'event_manager'].includes(userRole || '')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Only event organizers and event managers can view ticket holders' 
        });
      }

      const { eventId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Validate eventId
      if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ success: false, message: 'Invalid event ID' });
      }

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Authorization check: only creator or assigned manager can view
      const isCreator = event.createdBy.toString() === userId;
      const isManager = event.managerId && event.managerId.toString() === userId;

      if (!isCreator && !isManager) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Only the event creator or assigned manager can view ticket holders for this event' 
        });
      }

      // Find users who have booked tickets for this event
      const { Ticket } = await import('../models/ticket.model');
      
      const skip = (Number(page) - 1) * Number(limit);
      
      // Query tickets with valid user references
      const tickets = await Ticket.find({ 
        eventId: eventId,
        status: { $in: ['active', 'used'] },
        userId: { $exists: true, $ne: null } // Ensure userId exists and is not null
      })
      .populate('userId', 'name email phone')
      .populate('ticketTierId', 'name price')
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

      const totalTickets = await Ticket.countDocuments({ 
        eventId: eventId,
        status: { $in: ['active', 'used'] },
        userId: { $exists: true, $ne: null } // Ensure userId exists and is not null
      });

      // Format the response
      const ticketHolders = tickets.map(ticket => {
        // Check if userId exists and is populated
        if (!ticket.userId) {
          console.warn(`Ticket ${ticket._id} has no userId`);
          return null; // Skip this ticket
        }

        const user = ticket.userId as any;
        
        return {
          ticketId: ticket._id,
          orderId: ticket.orderId,
          user: {
            id: user._id,
            name: user.name || 'Unknown User',
            email: user.email || 'No email',
            phone: user.phone || 'No phone'
          },
          ticketTier: ticket.ticketTierId ? {
            id: (ticket.ticketTierId as any)._id,
            name: (ticket.ticketTierId as any).name,
            price: (ticket.ticketTierId as any).price
          } : null,
          quantity: ticket.quantity,
          status: ticket.status,
          issuedAt: ticket.issuedAt,
          qrCodeUrl: ticket.qrCodeUrl
        };
      }).filter(Boolean); // Remove null entries

      return res.status(200).json({
        success: true,
        data: {
          event: {
            id: event._id,
            name: event.name,
            date: event.date,
            startEventDate: event.startEventDate,
            endEventDate: event.endEventDate,
            isCancelled: event.isCancelled
          },
          ticketHolders,
          pagination: {
            total: totalTickets,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalTickets / Number(limit))
          }
        }
      });

    } catch (error: any) {
      console.error('Error in getEventTicketHolders:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error while retrieving ticket holders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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