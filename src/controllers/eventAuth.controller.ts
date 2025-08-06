import { Request, Response } from 'express';
import { EventAuthService } from '../services/eventAuth.service';
import { EventOrganizer } from '../models/eventOrganizer.model';
import { EventManager } from '../models/eventManager.model';
import { EventStaff } from '../models/eventStaff.model';

const eventAuthService = new EventAuthService();

export class EventAuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone } = req.body;
      if (!name || !email || !password || !phone) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }
      const { organizer, token } = await eventAuthService.registerEventOrganizer({ name, email, password, phone });
      res.status(201).json({ success: true, data: { organizer, token }, message: 'Registration successful. Verification email sent.' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, message: 'Token is required' });
      const organizer = await eventAuthService.verifyEmail(token);
      res.status(200).json({ success: true, data: { organizer }, message: 'Email verified successfully.' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      let profile;
      if (user.role === 'event_organizer') {
        profile = await EventOrganizer.findOne({ _id: user._id });
      } else if (user.role === 'event_staff') {
        profile = await EventStaff.findOne({ _id: user._id });
      } else {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
      if (profile.isDeleted) {
        return res.status(410).json({ success: false, message: 'This account has been deleted.' });
      }
      return res.status(200).json({ success: true, data: profile });
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
      let profile;
      if (user.role === 'event_organizer') {
        profile = await EventOrganizer.findByIdAndUpdate(user._id, updates, { new: true });
      } else if (user.role === 'event_staff') {
        profile = await EventStaff.findByIdAndUpdate(user._id, updates, { new: true });
      } else {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
      return res.status(200).json({ success: true, data: profile });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteEventOrganizerProfile(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const organizer = await EventOrganizer.findById(userId);
      if (!organizer) {
        return res.status(404).json({ success: false, message: 'Event organizer not found.' });
      }
      organizer.isDeleted = true;
      await organizer.save();
      return res.status(200).json({ success: true, message: 'Event organizer profile marked as deleted.' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteEventManagerProfile(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const manager = await EventManager.findById(userId);
      if (!manager) {
        return res.status(404).json({ success: false, message: 'Event manager not found.' });
      }
      manager.isDeleted = true;
      await manager.save();
      return res.status(200).json({ success: true, message: 'Event manager profile marked as deleted.' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteEventStaffProfile(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const staff = await EventStaff.findById(userId);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found.' });
      }
      staff.isDeleted = true;
      await staff.save();
      return res.status(200).json({ success: true, message: 'Event staff profile marked as deleted.' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMyEventManagers(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'event_organizer') {
        return res.status(403).json({ success: false, message: 'Only event organizers can access their event managers.' });
      }
      const managers = await EventManager.find({ createdBy: user._id });
      return res.status(200).json({ success: true, data: managers });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getMyEventStaff(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'event_organizer') {
        return res.status(403).json({ success: false, message: 'Only event organizers can access their event staff.' });
      }

      // Find all managers created by this organizer
      const managers = await EventManager.find({ createdBy: user._id });
      const managerIds = managers.map((m: any) => m._id);
      // Find all staff created by this organizer or by their managers
      const staff = await EventStaff.find({
        $or: [
          { createdBy: user._id },
          { createdBy: { $in: managerIds } }
        ]
      });
      return res.status(200).json({ success: true, data: staff });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getEventOrganizerProfile(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const organizer = await EventOrganizer.findOne({ _id: userId, isDeleted: false });
      if (!organizer) {
        return res.status(404).json({ success: false, message: 'Event organizer not found.' });
      }
      return res.status(200).json({ success: true, data: organizer });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getEventManagerProfile(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const manager = await EventManager.findOne({ _id: userId });
      if (!manager) {
        return res.status(404).json({ success: false, message: 'Event manager not found.' });
      }
      if (manager.isDeleted) {
        return res.status(410).json({ success: false, message: 'This account has been deleted.' });
      }
      return res.status(200).json({ success: true, data: manager });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getEventStaffProfile(req: Request & { user?: { _id: string } }, res: Response) {
    try {
      const userId = req.user?._id;
      const staff = await EventStaff.findOne({ _id: userId, isDeleted: false });
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Event staff not found.' });
      }
      return res.status(200).json({ success: true, data: staff });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
} 