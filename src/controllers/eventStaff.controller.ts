import { EventStaff } from '../models/eventStaff.model';
import { Request, Response } from 'express';
import { Event } from '../models/event.model';
import { EmailService } from '../services/email.service';
import { EventManager } from '../models/eventManager.model';
import { generateToken } from '../utils/jwt.util';

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
      // Check if the current user is the creator of the event
      if (user && user.role === 'event_organizer' && event.createdBy.toString() !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only assign staff to events you created.' });
      }
      // Assign event only (no responsibilities)
      staff.event = eventId;
      await staff.save();
      const staffObj = staff.toObject();
      delete staffObj.password;
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
      // 1. Get all events assigned to this staff
      const staffAssignments = await EventStaff.find({ _id: staffId });
      const eventIds = staffAssignments.map(s => s.event).filter(Boolean);
      const now = new Date();
      // Additions for dashboard metrics (fixed to only count assigned events)
      const totalEvents = await Event.countDocuments({ _id: { $in: eventIds }, status: 'published' });
      const upcomingEventsCount = await Event.countDocuments({ _id: { $in: eventIds }, status: 'published', date: { $gte: now } });
      const completedEventsCount = await Event.countDocuments({ _id: { $in: eventIds }, status: 'published', date: { $lt: now } });
      // 2. Total assigned events (where this staff is assigned)
      const totalAssignedEvents = await EventStaff.countDocuments({ _id: staffId, isActive: true });
      // 3. Total tickets checked/validated (tickets scanned by this staff)
      const Ticket = require('../models/ticket.model').Ticket;
      const totalTicketsChecked = await Ticket.countDocuments({ scannedBy: staffId });
      // 4. Upcoming assigned events
      const upcomingEvents = await Event.find({ 'ticketTiers._id': { $exists: true }, status: 'published', date: { $gte: new Date() } })
        .sort({ date: 1 })
        .limit(5)
        .select('name date venue');
      // 5. Recent activity (last 10 tickets checked)
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
} 