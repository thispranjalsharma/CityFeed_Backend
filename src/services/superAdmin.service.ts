import { SuperAdmin } from '../models/superAdmin.model';
import { ISuperAdmin } from '../interfaces/superAdmin.interface';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export class SuperAdminService {
  async createSuperAdmin(data: Partial<ISuperAdmin>): Promise<ISuperAdmin> {
    const existing = await SuperAdmin.findOne({ email: data.email });
    if (existing) throw new Error('Super admin already exists');
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
    if (!superAdmin.isEmailVerified) throw new Error('Email not verified');
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
    // TODO: Replace with your email sending logic
    console.log(`Send verification email to ${superAdmin.email} with link: ${config.frontendUrl || 'http://localhost:3000'}/verify-email/super-admin?token=${token}`);
  }

  async verifyEmail(token: string): Promise<ISuperAdmin> {
    const decoded = jwt.verify(token, config.jwtSecret) as { _id: string };
    const superAdmin = await SuperAdmin.findById(decoded._id);
    if (!superAdmin) throw new Error('Invalid or expired token');
    superAdmin.isEmailVerified = true;
    await superAdmin.save();
    return superAdmin;
  }

  async approveSuperAdmin(id: string): Promise<ISuperAdmin> {
    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) throw new Error('Super admin not found');
    superAdmin.isApproved = true;
    await superAdmin.save();
    return superAdmin;
  }
} 