import { BaseRepository } from './base.repository';
import { User } from '../models/user.model';
import { IUser, IUserDocument } from '../interfaces/user.interface';
import { Types } from 'mongoose';

export class UserRepository extends BaseRepository<IUserDocument> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    console.log('Searching for user with email:', email);
    const user = await this.findOne({ email });
    console.log('Database query result:', user);
    return user;
  }

  async findByPhone(phone: string): Promise<IUserDocument | null> {
    return this.findOne({ phone });
  }

  async create(data: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>): Promise<IUserDocument> {
    const userData = {
      ...data,
      _id: new Types.ObjectId()
    };
    return super.create(userData as Partial<IUserDocument>);
  }

  async verifyEmail(id: string): Promise<IUserDocument | null> {
    return this.update(id, { isEmailVerified: true });
  }

  async verifyPhone(id: string): Promise<IUserDocument | null> {
    return this.update(id, { isPhoneVerified: true });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<IUserDocument | null> {
    return this.update(id, { password: hashedPassword });
  }

  async activateUser(id: string): Promise<IUserDocument | null> {
    return this.update(id, { isActive: true });
  }

  async deactivateUser(id: string): Promise<IUserDocument | null> {
    return this.update(id, { isActive: false });
  }
} 