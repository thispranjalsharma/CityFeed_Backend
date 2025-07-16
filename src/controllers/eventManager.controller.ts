import { Request, Response } from 'express';
import { EventManager } from '../models/eventManager.model';
import { EventAuthService } from '../services/eventAuth.service';
import { EventController } from './event.controller';

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
      const existing = await EventManager.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
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
    const eventController = new EventController();
    return eventController.createEventStaff(req, res);
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
} 