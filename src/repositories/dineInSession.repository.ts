import { DineInSession } from '../models/dineInSession.model';
import { IDineInSession, CreateDineInSessionDto, UpdateDineInSessionDto } from '../interfaces/dineInSession.interface';

export class DineInSessionRepository {
  async create(data: CreateDineInSessionDto): Promise<IDineInSession> {
    const session = new DineInSession(data);
    return await session.save();
  }

  async findById(id: string): Promise<IDineInSession | null> {
    return await DineInSession.findById(id);
  }

  async findByUserId(userId: string): Promise<IDineInSession[]> {
    return await DineInSession.find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByMerchantId(merchantId: string): Promise<IDineInSession[]> {
    return await DineInSession.find({ merchantId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, data: UpdateDineInSessionDto): Promise<IDineInSession | null> {
    return await DineInSession.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await DineInSession.findByIdAndDelete(id);
    return result !== null;
  }

  async findActiveSession(userId: string, merchantId: string): Promise<IDineInSession | null> {
    return await DineInSession.findOne({
      userId,
      merchantId,
      status: { $in: ['pending', 'active'] }
    });
  }
} 