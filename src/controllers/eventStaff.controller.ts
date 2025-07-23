import { EventStaff } from '../models/eventStaff.model';
import { Request, Response } from 'express';
import { Event } from '../models/event.model';
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
      const existing = await EventStaff.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }
      // Create event staff (no event, no responsibilities)
      const staff = new EventStaff({ name, email, password, phone, role: 'event_staff', isActive: true, createdBy: user?._id });
      await staff.save();
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
  async getProfile(req: any, res: any) {
    return res.status(501).json({ success: false, message: 'Not implemented: getProfile is missing.' });
  }
  async updateProfile(req: any, res: any) {
    return res.status(501).json({ success: false, message: 'Not implemented: updateProfile is missing.' });
  }
  async deleteEventStaffProfile(req: any, res: any) {
    return res.status(501).json({ success: false, message: 'Not implemented: deleteEventStaffProfile is missing.' });
  }
} 