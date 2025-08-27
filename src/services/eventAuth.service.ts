import { EventOrganizer } from '../models/eventOrganizer.model';
import { IEventOrganizer } from '../interfaces/eventOrganizer.interface';
import { EmailService } from './email.service';
import { generateToken } from '../utils/jwt.util';
import { AppErrorClass } from '../utils/appError';
import { EventManager, IEventManager } from '../models/eventManager.model';
import { EventStaff } from '../models/eventStaff.model';
import { verifyToken } from '../utils/jwt.util';
import bcrypt from 'bcryptjs';

export class EventAuthService {
  private emailService: EmailService;
  constructor() {
    this.emailService = EmailService.getInstance();
  }

  async registerEventOrganizer(data: { name: string; email: string; password: string; phone: string }): Promise<{ organizer: IEventOrganizer; token: string }> {
    const email = data.email.trim().toLowerCase();
    const existing = await EventOrganizer.findOne({ email, isDeleted: false });
    if (existing) throw new AppErrorClass('Email already registered', 409);
    
    // Check if phone number is already registered
    const existingByPhone = await EventOrganizer.findOne({ phone: data.phone, isDeleted: false });
    if (existingByPhone) throw new AppErrorClass('Phone number already registered', 409);
    
    const organizer = new EventOrganizer({ ...data, email, isEmailVerified: false });
    await organizer.save();
    const token = generateToken({ _id: organizer._id.toString(), email: organizer.email, role: 'event_organizer', type: 'event_organizer' });
    await this.emailService.sendVerificationEmail(organizer.email, token, 'event_organizer');
    return { organizer, token };
  }

  async verifyEmail(token: string): Promise<any> {
    // decode token and verify
    const decoded = verifyToken(token);
    if (!decoded || !decoded._id) throw new AppErrorClass('Invalid or expired token', 400);
    if (decoded.role === 'event_manager') {
      const manager = await EventManager.findById(decoded._id);
      if (!manager) throw new AppErrorClass('Invalid or expired token', 400);
      manager.isEmailVerified = true;
      await manager.save();
      return manager;
    } else if (decoded.role === 'event_staff') {
      const staff = await EventStaff.findById(decoded._id);
      if (!staff) throw new AppErrorClass('Invalid or expired token', 400);
      staff.isEmailVerified = true;
      await staff.save();
      return staff;
    } else {
      const organizer = await EventOrganizer.findById(decoded._id);
      if (!organizer) throw new AppErrorClass('Invalid or expired token', 400);
      organizer.isEmailVerified = true;
      await organizer.save();
      return organizer;
    }
  }

  async resendVerification(email: string): Promise<void> {
    email = email.trim().toLowerCase();
    const organizer = await EventOrganizer.findOne({ email, isDeleted: false });
    if (!organizer) throw new AppErrorClass('Event organizer not found', 404);
    if (organizer.isEmailVerified) throw new AppErrorClass('Email is already verified', 400);
    const token = generateToken({ _id: organizer._id.toString(), email: organizer.email, role: 'event_organizer', type: 'event_organizer' });
    await this.emailService.sendVerificationEmail(organizer.email, token, 'event_organizer');
  }

  async resendManagerVerification(email: string): Promise<void> {
    const manager = await EventManager.findOne({ email, isDeleted: false });
    if (!manager) throw new AppErrorClass('Event manager not found', 404);
    if (manager.isEmailVerified) throw new AppErrorClass('Email is already verified', 400);
    const token = generateToken({ _id: manager._id.toString(), email: manager.email, role: 'event_manager', type: 'event_manager' });
    await this.emailService.sendVerificationEmail(manager.email, token, 'event_manager');
  }

  async resendStaffVerification(email: string): Promise<void> {
    const staff = await EventStaff.findOne({ email, isDeleted: false });
    if (!staff) throw new AppErrorClass('Event staff not found', 404);
    if (staff.isEmailVerified) throw new AppErrorClass('Email is already verified', 400);
    const token = generateToken({ _id: staff._id.toString(), email: staff.email, role: 'event_staff', type: 'event_staff' });
    await this.emailService.sendVerificationEmail(staff.email, token, 'event_staff');
  }

  async sendManagerPasswordResetEmail(email: string) {
    const manager = await EventManager.findOne({ email, isDeleted: false });
    if (!manager) throw new AppErrorClass('Event manager not found', 404);
    const token = generateToken({ _id: manager._id.toString(), email: manager.email, role: 'event_manager', type: 'event_manager' });
    await this.emailService.sendPasswordResetEmail(manager.email, token, 'event_manager');
    return { message: 'Password reset email sent', token };
  }

  async sendStaffPasswordResetEmail(email: string) {
    const staff = await EventStaff.findOne({ email, isDeleted: false });
    if (!staff) throw new AppErrorClass('Event staff not found', 404);
    const token = generateToken({ _id: staff._id.toString(), email: staff.email, role: 'event_staff', type: 'event_staff' });
    await this.emailService.sendPasswordResetEmail(staff.email, token, 'event_staff');
    return { message: 'Password reset email sent', token };
  }

  async sendOrganizerPasswordResetEmail(email: string) {
    email = email.trim().toLowerCase();
    const organizer = await EventOrganizer.findOne({ email, isDeleted: false });
    if (!organizer) throw new AppErrorClass('Event organizer not found', 404);
    const token = generateToken({ _id: organizer._id.toString(), email: organizer.email, role: 'event_organizer', type: 'event_organizer' });
    await this.emailService.sendPasswordResetEmail(organizer.email, token, 'event_organizer');
    return { message: 'Password reset email sent', token };
  }

  validatePasswordStrength(password: string) {
    if (password.length < 8) throw new AppErrorClass('Password must be at least 8 characters', 400);
    if (!/[A-Z]/.test(password)) throw new AppErrorClass('Password must contain at least one uppercase letter', 400);
    if (!/[a-z]/.test(password)) throw new AppErrorClass('Password must contain at least one lowercase letter', 400);
    if (!/\d/.test(password)) throw new AppErrorClass('Password must contain at least one digit', 400);
    if (!/[^A-Za-z\d]/.test(password)) throw new AppErrorClass('Password must contain at least one special character', 400);
  }

  async resetManagerPassword(token: string, password: string) {
    this.validatePasswordStrength(password);
    const decoded = verifyToken(token);
    if (!decoded || !decoded._id) throw new AppErrorClass('Invalid or expired token', 400);
    const manager = await EventManager.findById(decoded._id);
    if (!manager) throw new AppErrorClass('Invalid or expired token', 400);
    manager.password = password;
    await manager.save();
    return manager;
  }

  async resetStaffPassword(token: string, password: string) {
    this.validatePasswordStrength(password);
    const decoded = verifyToken(token);
    if (!decoded || !decoded._id) throw new AppErrorClass('Invalid or expired token', 400);
    const staff = await EventStaff.findById(decoded._id);
    if (!staff) throw new AppErrorClass('Invalid or expired token', 400);
    staff.password = password;
    await staff.save();
    return staff;
  }

  async changeOrganizerPassword(organizerId: string, currentPassword: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const organizer = await EventOrganizer.findById(organizerId);
    if (!organizer) throw new AppErrorClass('Event organizer not found', 404);
    const isValid = await bcrypt.compare(currentPassword, organizer.password);
    if (!isValid) throw new AppErrorClass('Current password is incorrect', 400);
    organizer.password = newPassword;
    await organizer.save();
    return organizer;
  }

  async resetOrganizerPassword(token: string, password: string) {
    this.validatePasswordStrength(password);
    const decoded = verifyToken(token);
    if (!decoded || !decoded._id) throw new AppErrorClass('Invalid or expired token', 400);
    const organizer = await EventOrganizer.findById(decoded._id);
    if (!organizer) throw new AppErrorClass('Invalid or expired token', 400);
    organizer.password = password;
    await organizer.save();
    return organizer;
  }

  async generateAndSendManagerVerification(manager: IEventManager): Promise<string> {
    const token = generateToken({ _id: manager._id.toString(), email: manager.email, role: 'event_manager', type: 'event_manager' });
    await this.emailService.sendVerificationEmail(manager.email, token, 'event_manager');
    return token;
  }
} 