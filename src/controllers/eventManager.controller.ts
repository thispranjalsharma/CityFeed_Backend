import { Request, Response } from 'express';
import { EventManager } from '../models/eventManager.model';
import { EventAuthService } from '../services/eventAuth.service';
import { EventController } from './event.controller';
import { Event } from '../models/event.model';
import { EventStaff } from '../models/eventStaff.model';

export class EventManagerController {
  private eventAuthService: EventAuthService;
  constructor() {
    this.eventAuthService = new EventAuthService();
  }

  async createEventManager(req: Request, res: Response) {
    try {
      const { name, email, password, phone } = req.body;
      if (!name || !email || !password || !phone) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }
      
      // Check for existing event manager with same email
      const existingEmail = await EventManager.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }
      
      // Check for existing event manager with same phone number
      const existingPhone = await EventManager.findOne({ phone });
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'Phone number already exists' });
      }
      
      const organizerId = (req as any).user?._id;
      if (!organizerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const manager = new EventManager({ name, email, password, phone, createdBy: organizerId });
      await manager.save();
      // Generate verification token and send email
      const token = await this.eventAuthService.generateAndSendManagerVerification(manager);
      return res.status(201).json({
        success: true,
        data: {
          _id: manager._id,
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
          role: manager.role,
          verificationToken: token // For testing in Swagger
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async createEventStaff(req: any, res: any) {
    // No implementation for createEventStaffOnly in EventController. Throw error for now.
    return res.status(501).json({ success: false, message: 'Not implemented: createEventStaffOnly is missing. Please implement event staff creation logic.' });
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const manager = await EventManager.findById(user._id);
      if (!manager) return res.status(404).json({ success: false, message: 'Manager not found' });
      if (manager.isDeleted) {
        return res.status(410).json({ success: false, message: 'This account has been deleted.' });
      }
      return res.status(200).json({ success: true, data: manager });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const updates = req.body;
      delete updates.email;
      delete updates.password;
      const manager = await EventManager.findByIdAndUpdate(user._id, updates, { new: true });
      if (!manager) return res.status(404).json({ success: false, message: 'Manager not found' });
      return res.status(200).json({ success: true, data: manager });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const manager = await EventManager.findById(user._id);
      if (!manager) return res.status(404).json({ success: false, message: 'Manager not found' });
      manager.isDeleted = true;
      await manager.save();
      return res.status(200).json({ success: true, message: 'Profile deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async activateEventManager(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      const { managerId } = req.params;
      if (!user || user.role !== 'event_organizer') {
        return res.status(403).json({ success: false, message: 'Only event organizers can activate event managers.' });
      }
      const manager = await EventManager.findById(managerId);
      if (!manager) {
        return res.status(404).json({ success: false, message: 'Event manager not found.' });
      }
      manager.isActive = true;
      await manager.save();
      return res.status(200).json({ success: true, message: 'Event manager activated.', data: manager });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deactivateEventManager(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const user = req.user;
      const { managerId } = req.params;
      if (!user || user.role !== 'event_organizer') {
        return res.status(403).json({ success: false, message: 'Only event organizers can deactivate event managers.' });
      }
      const manager = await EventManager.findById(managerId);
      if (!manager) {
        return res.status(404).json({ success: false, message: 'Event manager not found.' });
      }
      manager.isActive = false;
      await manager.save();
      return res.status(200).json({ success: true, message: 'Event manager deactivated.', data: manager });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getDashboardData(req: Request & { user?: { _id: string, role: string } }, res: Response) {
    try {
      const managerId = req.user?._id;
      if (!managerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      // 1. Get all events managed by this manager
      const events = await Event.find({ managerId: managerId });
      const eventIds = events.map(e => e._id);
      const now = new Date();
      // 2. Active event count (published, saleEnd in future)
      const activeEventCount = await Event.countDocuments({ managerId: managerId, status: 'published', saleEnd: { $gte: now } });
      // 3. Event staff count (for these events)
      const eventStaffCount = await EventStaff.countDocuments({ event: { $in: eventIds } });
      // 4. Total tickets sold (all managed events)
      const totalTicketsSold = await Event.aggregate([
        { $match: { managerId: managerId } },
        { $group: { _id: null, total: { $sum: '$totalSoldCount' } } }
      ]);
      // 5. Monthly ticket sales revenue (current FY)
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(year, 3, 1);
      const monthlySales = await Event.aggregate([
        { $match: { managerId: managerId, status: 'published', date: { $gte: fyStart } } },
        { $unwind: '$ticketTiers' },
        { $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' } },
          total: { $sum: { $multiply: ['$ticketTiers.soldCount', '$ticketTiers.price'] } }
        } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      // 6. Recent ticket sales (last 10, by event date)
      const recentTicketSales = await Event.find({ managerId: managerId, status: 'published' })
        .sort({ date: -1 })
        .limit(10)
        .select('name date totalSoldCount ticketTiers');
      // 7. Upcoming managed events
      const upcomingEvents = await Event.find({ managerId: managerId, status: 'published', date: { $gte: now } })
        .sort({ date: 1 })
        .limit(5)
        .select('name date venue');
      res.json({
        success: true,
        data: {
          activeEventCount,
          eventStaffCount,
          totalTicketsSold: totalTicketsSold[0]?.total || 0,
          monthlySales,
          recentTicketSales,
          upcomingEvents
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
} 