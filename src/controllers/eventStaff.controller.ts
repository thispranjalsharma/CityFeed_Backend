import { EventStaff } from '../models/eventStaff.model';
import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { EmailService } from '../services/email.service';
import { EventManager } from '../models/eventManager.model';
import { generateToken } from '../utils/jwt.util';
import mongoose from 'mongoose';

export class EventStaffController {
  // Create event staff (no event assignment)
  async createEventStaffOnly(req: Request, res: Response) {
    try {
      const { name, email, password, phone } = req.body;
      const user = (req as any).user;
      if (!name || !email || !password || !phone) {
        return res.status(400).json({ success: false, message: 'Missing required fields: name, email, password, phone' });
      }
      
      // Check for duplicate email
      const existingEmail = await EventStaff.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }
      
      // Check for duplicate phone number
      const existingPhone = await EventStaff.findOne({ phone });
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'Phone number already exists' });
      }
      
      // Determine organizerId
      let organizerId;
      if (user.role === 'event_organizer') {
        organizerId = user._id;
      } else if (user.role === 'event_manager') {
        const manager = await EventManager.findById(user._id);
        if (!manager) {
          return res.status(404).json({ success: false, message: 'Event manager not found' });
        }
        organizerId = manager.createdBy;
      } else {
        return res.status(403).json({ success: false, message: 'Only event organizers or managers can create staff.' });
      }
      // Create event staff (no event, no responsibilities)
      const staff = new EventStaff({ name, email, password, phone, role: 'event_staff', isActive: true, createdBy: user?._id, organizerId });
      await staff.save();
      // Send verification email
      const emailService = new EmailService();
      const token = generateToken({ _id: staff._id.toString(), email: staff.email, role: 'event_staff', type: 'event_staff' });
      await emailService.sendVerificationEmail(staff.email, token, 'event_staff');
      // Remove password from response
      const staffObj = staff.toObject();
      delete staffObj.password;
      return res.status(201).json({ success: true, data: staffObj });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async assignEventStaffToEvent(req: Request, res: Response) {
    try {
      const { eventId, eventStaffId } = req.body;
      const user = (req as any).user;
      if (!eventId || !eventStaffId) {
        return res.status(400).json({ success: false, message: 'Missing required fields: eventId, eventStaffId' });
      }
      
      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      
      // Check if staff exists
      const staff = await EventStaff.findById(eventStaffId);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found' });
      }
      
      // Permission check based on user role
      let hasPermission = false;
      
      if (user.role === 'event_organizer') {
        // Event organizers can only assign staff to events they created
        hasPermission = event.createdBy.toString() === user._id.toString();
        if (!hasPermission) {
          return res.status(403).json({ 
            success: false, 
            message: 'Forbidden: You can only assign staff to events you created.' 
          });
        }
      } else if (user.role === 'event_manager') {
        // Event managers can only assign staff to events they're assigned to manage
        hasPermission = Boolean(event.managerId) && event.managerId!.toString() === user._id.toString();
        if (!hasPermission) {
          return res.status(403).json({ 
            success: false, 
            message: 'Forbidden: You can only assign staff to events you are assigned to manage.' 
          });
        }
      } else {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Only event organizers and event managers can assign staff to events.' 
        });
      }

      // Prevent overlapping event assignments
      const parseTime = (timeStr: string | undefined) => {
        if (!timeStr) return { hours: 0, minutes: 0 };
        const [h, m] = timeStr.split(':').map((n: string) => parseInt(n, 10));
        return { hours: Number.isFinite(h) ? h : 0, minutes: Number.isFinite(m) ? m : 0 };
      };
      const getEventRange = (ev: any) => {
        // Support both single-day and multi-day events
        const hasMultiDay = ev.startEventDate && ev.endEventDate;
        if (hasMultiDay) {
          const startEventDate = new Date(ev.startEventDate);
          const endEventDate = new Date(ev.endEventDate);
          if (isNaN(startEventDate.getTime()) || isNaN(endEventDate.getTime())) {
            return { start: null as Date | null, end: null as Date | null };
          }
          const { hours: sh, minutes: sm } = parseTime(ev.startTime);
          const { hours: eh, minutes: em } = parseTime(ev.endTime);
          const start = new Date(startEventDate);
          start.setHours(Number.isFinite(sh) ? sh : 0, Number.isFinite(sm) ? sm : 0, 0, 0);
          const end = new Date(endEventDate);
          end.setHours(Number.isFinite(eh) ? eh : 23, Number.isFinite(em) ? em : 59, 59, 999);
          return { start, end };
        }
        // Fallback to single-day event using ev.date + startTime/endTime
        const baseDate = ev.date ? new Date(ev.date) : null;
        if (!baseDate || isNaN(baseDate.getTime())) {
          return { start: null as Date | null, end: null as Date | null };
        }
        const { hours: sh, minutes: sm } = parseTime(ev.startTime);
        const { hours: eh, minutes: em } = parseTime(ev.endTime);
        const start = new Date(baseDate);
        start.setHours(Number.isFinite(sh) ? sh : 0, Number.isFinite(sm) ? sm : 0, 0, 0);
        const end = new Date(baseDate);
        // If no endTime provided, assume 23:59
        end.setHours(Number.isFinite(eh) ? eh : 23, Number.isFinite(em) ? em : 59, 59, 999);
        return { start, end };
      };
      const isOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
        return aStart < bEnd && bStart < aEnd;
      };

      const { start: newStart, end: newEnd } = getEventRange(event);
      if (!newStart || !newEnd) {
        return res.status(400).json({ success: false, message: 'Event date/time not configured for the selected event' });
      }

      // Build list of already assigned event IDs (including legacy single "event" field)
      const assignedIds = new Set<string>();
      if ((staff as any).assignedEvents && Array.isArray((staff as any).assignedEvents)) {
        for (const id of (staff as any).assignedEvents) {
          if (id) assignedIds.add(id.toString());
        }
      }
      if (staff.event) assignedIds.add(staff.event.toString());
      // Remove the same event if already present
      assignedIds.delete(eventId.toString());

      if (assignedIds.size > 0) {
        const existingEvents = await Event.find({ _id: { $in: Array.from(assignedIds) } });
        for (const ev of existingEvents) {
          const { start, end } = getEventRange(ev);
          // If either event lacks proper date range, conservatively block same-day assignment
          if (!start || !end) {
            const sameDay = ev.date && event.date && new Date(ev.date).toDateString() === new Date(event.date).toDateString();
            if (sameDay) {
              return res.status(409).json({ 
                success: false, 
                message: 'Event staff is already assigned to another event on the same date and time.' 
              });
            }
            continue;
          }
          if (isOverlap(start, end, newStart, newEnd)) {
            return res.status(409).json({ 
              success: false, 
              message: 'Event staff is already assigned to another event during this time window.' 
            });
          }
        }
      }

      // Persist assignment: keep legacy single-field for current/last assignment, and maintain history in assignedEvents
      const currentAssigned: string[] = Array.isArray((staff as any).assignedEvents) ? (staff as any).assignedEvents.map((id: any) => id.toString()) : [];
      if (!currentAssigned.includes(eventId.toString())) {
        (staff as any).assignedEvents = [...currentAssigned, new mongoose.Types.ObjectId(eventId)];
      }
      staff.event = eventId; // latest assignment reference

      await staff.save();
      const staffObj = staff.toObject();
      delete (staffObj as any).password;
      return res.status(200).json({ success: true, data: staffObj });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const staff = await EventStaff.findById(user._id);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found' });
      }
      if (staff.isDeleted) {
        return res.status(410).json({ success: false, message: 'This account has been deleted.' });
      }
      const staffObj = staff.toObject();
      delete staffObj.password;
      return res.status(200).json({ success: true, data: staffObj });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const updates: any = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.phone) updates.phone = req.body.phone;
      // Do not allow email or password update here
      const staff = await EventStaff.findByIdAndUpdate(user._id, updates, { new: true });
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found' });
      }
      if (staff.isDeleted) {
        return res.status(410).json({ success: false, message: 'This account has been deleted.' });
      }
      const staffObj = staff.toObject();
      delete staffObj.password;
      return res.status(200).json({ success: true, data: staffObj });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteEventStaffProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const staff = await EventStaff.findById(user._id);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found' });
      }
      staff.isDeleted = true;
      await staff.save();
      return res.status(200).json({ success: true, message: 'Profile deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getDashboardData(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const staffId = req.user?._id;
      if (!staffId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      // 1. Get the event staff record for this user
      const staffRecord = await EventStaff.findById(staffId);
      if (!staffRecord) {
        return res.status(404).json({ success: false, message: 'Event staff record not found.' });
      }
      
      // 2. Collect all event IDs from both current event and assigned events
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
      
      const now = new Date();
      
      // 3. Dashboard metrics (fixed to only count assigned events)
      const totalEvents = await Event.countDocuments({ 
        _id: { $in: uniqueEventIds }, 
        status: 'published' 
      });
      
      const upcomingEventsCount = await Event.countDocuments({ 
        _id: { $in: uniqueEventIds }, 
        status: 'published', 
        date: { $gte: now } 
      });
      
      const completedEventsCount = await Event.countDocuments({ 
        _id: { $in: uniqueEventIds }, 
        status: 'published', 
        date: { $lt: now } 
      });
      
      // 4. Total assigned events (count unique assigned event IDs for this staff)
      const totalAssignedEvents = uniqueEventIds.length;
      
      // 5. Total tickets checked/validated (tickets scanned by this staff)
      const Ticket = require('../models/ticket.model').Ticket;
      const totalTicketsChecked = await Ticket.countDocuments({ scannedBy: staffId });
      
      // 6. Upcoming assigned events (only events assigned to this staff)
      const upcomingEvents = await Event.find({ 
        _id: { $in: uniqueEventIds }, 
        status: 'published', 
        date: { $gte: new Date() } 
      })
        .sort({ date: 1 })
        .limit(5)
        .select('name date venue');
      
      // 7. Recent activity (last 10 tickets checked)
      const recentActivity = await Ticket.find({ scannedBy: staffId })
        .sort({ scannedAt: -1 })
        .limit(10)
        .select('eventId scannedAt status');
      
      res.json({
        success: true,
        data: {
          totalAssignedEvents,
          totalTicketsChecked,
          upcomingEvents,
          recentActivity,
          totalEvents,
          upcomingEventsCount,
          completedEventsCount
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAssignedEventTicketBookings(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 10, status, search } = req.query;
      const staffId = req.user?._id;

      if (!staffId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Check if staff is assigned to this event
      const staff = await EventStaff.findById(staffId);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found' });
      }

      // Check if staff is assigned to this event
      const isAssignedToEvent = (
        (staff.event && staff.event.toString() === eventId) ||
        (staff.assignedEvents && staff.assignedEvents.includes(eventId as any))
      );

      if (!isAssignedToEvent) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: You can only access ticket bookings for events you are assigned to' 
        });
      }

      // Import Ticket model
      const { Ticket } = await import('../models/ticket.model');

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
} 