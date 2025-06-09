import { BaseRepository } from './base.repository';
import { Admin } from '../models/admin.model';
import { IAdmin, IAdminDocument } from '../interfaces/admin.interface';
import { Types } from 'mongoose';

export class AdminRepository extends BaseRepository<IAdminDocument> {
  constructor() {
    super(Admin);
  }

  async findByEmail(email: string): Promise<IAdminDocument | null> {
    console.log('Searching for admin with email:', email);
    const admin = await this.findOne({ email });
    console.log('Database query result:', admin);
    return admin;
  }

  async create(data: Omit<IAdmin, '_id' | 'createdAt' | 'updatedAt'>): Promise<IAdminDocument> {
    const adminData = {
      ...data,
      _id: new Types.ObjectId()
    };
    return super.create(adminData as Partial<IAdminDocument>);
  }
} 