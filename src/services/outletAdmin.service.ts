import { OutletAdmin } from '../models/outletAdmin.model';
import { IOutletAdmin } from '../interfaces/outletAdmin.interface';
import { EmailService } from './email.service';
import { OutletAdminRepository } from '../repositories/outletAdmin.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import {Outlet} from '../models/outlet.model';

export class OutletAdminService {
  private emailService: EmailService;
  private outletAdminRepository: OutletAdminRepository;

  constructor() {
    this.emailService = new EmailService();
    this.outletAdminRepository = new OutletAdminRepository();
  }

  async createOutletAdmin(data: Partial<IOutletAdmin>): Promise<IOutletAdmin> {
    const existing = await this.outletAdminRepository.findByEmail(data.email!);
    if (existing) throw new Error('Outlet admin already exists with this email');
    
    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const outletAdmin = new OutletAdmin({
      ...data,
      password: hashedPassword,
      isFirstLogin: true
    });
    
    await outletAdmin.save();
    await this.sendVerificationEmail(outletAdmin);
    return outletAdmin;
  }

  async findByEmail(email: string): Promise<IOutletAdmin | null> {
    return this.outletAdminRepository.findByEmail(email);
  }

  async findById(id: string): Promise<IOutletAdmin | null> {
    return this.outletAdminRepository.findById(id);
  }

  async login(email: string, password: string): Promise<{ outletAdmin: IOutletAdmin; token: string; outletId: string | null }> {
    const outletAdmin = await OutletAdmin.findOne({ 
      email,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
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
    // const { Outlet } = require('../models/outlet.model');
    const outlet = await Outlet.findOne({ 
      assignedAdmin: outletAdmin._id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    const outletId = outlet ? outlet._id.toString() : null;
    
    return { outletAdmin, token, outletId };
  }

  async sendVerificationEmail(outletAdmin: IOutletAdmin) {
    const token = jwt.sign({ _id: outletAdmin._id }, config.jwtSecret, { expiresIn: '1d' });
    await this.emailService.sendVerificationEmail(outletAdmin.email, token, 'outlet_admin');
  }

  async verifyEmail(token: string): Promise<IOutletAdmin> {
    const decoded = jwt.verify(token, config.jwtSecret) as { _id: string };
    const outletAdmin = await OutletAdmin.findOne({
      _id: decoded._id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    if (!outletAdmin) throw new Error('Invalid or expired token');
    
    outletAdmin.isEmailVerified = true;
    await outletAdmin.save();
    return outletAdmin;
  }

  async updatePassword(id: string, newPassword: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findOne({
      _id: id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    if (!outletAdmin) throw new Error('Outlet admin not found');
    outletAdmin.password = newPassword;
    outletAdmin.isFirstLogin = false;
    await outletAdmin.save();
    return outletAdmin;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findOne({
      _id: id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    if (!outletAdmin) throw new Error('Outlet admin not found');
    const isMatch = await outletAdmin.comparePassword(currentPassword);
    if (!isMatch) throw new Error('Current password is incorrect');
    outletAdmin.password = newPassword;
    outletAdmin.isFirstLogin = false;
    await outletAdmin.save();
    return outletAdmin;
  }

  async activateAccount(id: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findOne({
      _id: id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    if (!outletAdmin) throw new Error('Outlet admin not found');
    
    outletAdmin.isActive = true;
    await outletAdmin.save();
    
    return outletAdmin;
  }

  async deactivateAccount(id: string): Promise<IOutletAdmin> {
    const outletAdmin = await OutletAdmin.findOne({
      _id: id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    if (!outletAdmin) throw new Error('Outlet admin not found');
    
    outletAdmin.isActive = false;
    await outletAdmin.save();
    
    return outletAdmin;
  }

  // Soft delete outlet admin
  async softDeleteOutletAdmin(id: string): Promise<IOutletAdmin | null> {
    return this.outletAdminRepository.softDelete(id);
  }

  // Restore soft deleted outlet admin
  async restoreOutletAdmin(id: string): Promise<IOutletAdmin | null> {
    return this.outletAdminRepository.restore(id);
  }

  // Get deleted outlet admins
  async getDeletedOutletAdmins(): Promise<IOutletAdmin[]> {
    return this.outletAdminRepository.findDeleted();
  }
} 