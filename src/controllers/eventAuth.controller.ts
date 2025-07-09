import { Request, Response } from 'express';
import { EventAuthService } from '../services/eventAuth.service';

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
} 