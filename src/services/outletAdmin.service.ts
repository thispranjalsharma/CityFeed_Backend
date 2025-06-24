import { OutletAdmin } from '../models/outletAdmin.model';
import { IOutletAdmin } from '../interfaces/outletAdmin.interface';
import { EmailService } from './email.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export class OutletAdminService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async createOutletAdmin(data: Partial<IOutletAdmin>): Promise<IOutletAdmin> {
    const existing = await OutletAdmin.findOne({ email: data.email });
    if (existing) throw new Error('Outlet admin already exists with this email');
    
    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const outletAdmin = new OutletAdmin({
      ...data,
      password: hashedPassword
    });
    
    await outletAdmin.save();
    await this.sendVerificationEmail(outletAdmin);
    return outletAdmin;
  }

  async findByEmail(email: string): Promise<IOutletAdmin | null> {
    return OutletAdmin.findOne({ email });
  }

  async findById(id: string): Promise<IOutletAdmin | null> {
    return OutletAdmin.findById(id);
  }

  async login(email: string, password: string): Promise<{ outletAdmin: IOutletAdmin; token: string; outletId: string | null }> {
    const outletAdmin = await OutletAdmin.findOne({ email });
    if (!outletAdmin) throw new Error('Outlet admin not found');
    
    const isMatch = await bcrypt.compare(password, outletAdmin.password);
    if (!isMatch) throw new Error('Invalid password');
    
    if (!outletAdmin.isEmailVerified) {
      // Resend verification email if not verified
      await this.sendVerificationEmail(outletAdmin);
      throw new Error('Email not verified. A new verification email has been sent to your email address.');
    }
    
    if (!outletAdmin.isActive) throw new Error('Account is deactivated');
    
    const token = jwt.sign(
      { _id: outletAdmin._id, email: outletAdmin.email, role: 'outlet_admin', type: 'outlet_admin' },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Find the outlet where this admin is assigned
    const { Outlet } = require('../models/outlet.model');
    const outlet = await Outlet.findOne({ assignedAdmin: outletAdmin._id });
    const outletId = outlet ? outlet._id.toString() : null;
    
    return { outletAdmin, token, outletId };
  }

  async sendVerificationEmail(outletAdmin: IOutletAdmin) {
    const token = jwt.sign({ _id: outletAdmin._id }, config.jwtSecret, { expiresIn: '1d' });
    await this.emailService.sendVerificationEmail(outletAdmin.email, token, 'outlet_admin');
  }

  async verifyEmail(token: string): Promise<IOutletAdmin> {
    const decoded = jwt.verify(token, config.jwtSecret) as { _id: string };
    const outletAdmin = await OutletAdmin.findById(decoded._id);
    if (!outletAdmin) throw new Error('Invalid or expired token');
    
    outletAdmin.isEmailVerified = true;
    await outletAdmin.save();
    return outletAdmin;
  }

  async updatePassword(id: string, newPassword: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findById(id);
    if (!outletAdmin) throw new Error('Outlet admin not found');
    outletAdmin.password = newPassword;
    await outletAdmin.save();
    return outletAdmin;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findById(id);
    if (!outletAdmin) throw new Error('Outlet admin not found');
    const isMatch = await outletAdmin.comparePassword(currentPassword);
    if (!isMatch) throw new Error('Current password is incorrect');
    outletAdmin.password = newPassword;
    await outletAdmin.save();
    return outletAdmin;
  }

  async activateAccount(id: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findById(id);
    if (!outletAdmin) throw new Error('Outlet admin not found');
    
    outletAdmin.isActive = true;
    await outletAdmin.save();
    
    return outletAdmin;
  }

  async deactivateAccount(id: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findById(id);
    if (!outletAdmin) throw new Error('Outlet admin not found');
    
    outletAdmin.isActive = false;
    await outletAdmin.save();
    
    return outletAdmin;
  }
} 