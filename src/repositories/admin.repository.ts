import { BaseRepository } from './base.repository';
import { Admin } from '../models/admin.model';
import { IAdmin, IAdminDocument } from '../interfaces/admin.interface';
import { Types } from 'mongoose';
import { logger } from '../utils/logger.util';

export class AdminRepository extends BaseRepository<IAdminDocument> {
  constructor() {
    super(Admin);
  }

  async findByEmail(email: string): Promise<IAdminDocument | null> {
    logger.debug('Searching for admin with email:', email);
    const admin = await this.findOne({ email });
    logger.debug('Database query result:', admin);
    return admin;
  }

  async findByPhone(phone: string): Promise<IAdminDocument | null> {
    logger.debug('Searching for admin with phone:', phone);
    const admin = await this.findOne({ phone });
    logger.debug('Database query result:', admin);
    return admin;
  }

  async create(data: Partial<IAdminDocument>): Promise<IAdminDocument> {
    const adminData = {
      ...data,
      _id: new Types.ObjectId()
    };
    return super.create(adminData as Partial<IAdminDocument>);
  }
} 