import { SuperAdmin } from '../models/superAdmin.model';
import { ISuperAdmin } from '../interfaces/superAdmin.interface';
import { EmailService } from './email.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

export class SuperAdminService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async createSuperAdmin(data: Partial<ISuperAdmin>): Promise<ISuperAdmin> {
    // Normalize email and name to lowercase as a safeguard
    if (data.email) data.email = data.email.toLowerCase();
    if (data.name) data.name = data.name.toLowerCase();
    
    // Check for existing super admin with same email
    const existingEmail = await SuperAdmin.findOne({ email: data.email });
    if (existingEmail) throw new Error('Super admin with this email already exists');
    
    // Check for existing super admin with same phone number
    const existingPhone = await SuperAdmin.findOne({ phone: data.phone });
    if (existingPhone) throw new Error('Super admin with this phone number already exists');
    
    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const superAdmin = new SuperAdmin({
      ...data,
      password: hashedPassword
    });
    await superAdmin.save();
    await this.sendVerificationEmail(superAdmin);
    return superAdmin;
  }

  async findByEmail(email: string): Promise<ISuperAdmin | null> {
    return SuperAdmin.findOne({ email });
  }

  async login(email: string, password: string): Promise<{ superAdmin: ISuperAdmin; token: string }> {
    const superAdmin = await SuperAdmin.findOne({ email });
    if (!superAdmin) throw new Error('Super admin not found');
    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) throw new Error('Invalid password');
    if (!superAdmin.isEmailVerified) {
      // Resend verification email if not verified
      await this.sendVerificationEmail(superAdmin);
      throw new Error('Email not verified. A new verification email has been sent to your email address.');
    }
    if (!superAdmin.isApproved) throw new Error('Account not approved');
    const token = jwt.sign(
      { _id: superAdmin._id, email: superAdmin.email, role: 'super_admin', type: 'super_admin' },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    return { superAdmin, token };
  }

  async sendVerificationEmail(superAdmin: ISuperAdmin) {
    const token = jwt.sign({ _id: superAdmin._id }, config.jwtSecret, { expiresIn: '1d' });
    await this.emailService.sendVerificationEmail(superAdmin.email, token, 'super_admin');
  }

  async verifyEmail(token: string): Promise<ISuperAdmin> {
    const decoded = jwt.verify(token, config.jwtSecret) as { _id: string };
    const superAdmin = await SuperAdmin.findByIdAndUpdate(
      decoded._id,
      { isEmailVerified: true },
      { new: true }
    );
    if (!superAdmin) throw new Error('Invalid or expired token');
    logger.debug('Super admin verified:', superAdmin.email, superAdmin.isEmailVerified);
    return superAdmin;
  }

  async approveSuperAdmin(id: string): Promise<ISuperAdmin> {
    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) throw new Error('Super admin not found');
    superAdmin.isApproved = true;
    await superAdmin.save();
    return superAdmin;
  }

  async updatePassword(id: string, newPassword: string): Promise<ISuperAdmin> {
    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) throw new Error('Super admin not found');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hashedPassword;
    await superAdmin.save();
    return superAdmin;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<ISuperAdmin> {
    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) throw new Error('Super admin not found');
    const isMatch = await bcrypt.compare(currentPassword, superAdmin.password);
    if (!isMatch) throw new Error('Current password is incorrect');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hashedPassword;
    await superAdmin.save();
    return superAdmin;
  }

  async getAllSuperAdmins(): Promise<ISuperAdmin[]> {
    return SuperAdmin.find();
  }

  async findById(id: string): Promise<ISuperAdmin | null> {
    return SuperAdmin.findById(id);
  }

  async updateById(id: string, updates: Partial<ISuperAdmin>): Promise<ISuperAdmin | null> {
    return SuperAdmin.findByIdAndUpdate(id, updates, { new: true });
  }

  async deleteById(id: string): Promise<ISuperAdmin | null> {
    return SuperAdmin.findByIdAndDelete(id);
  }
} 