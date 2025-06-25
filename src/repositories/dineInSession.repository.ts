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

  async findByOutletId(outletId: string): Promise<IDineInSession[]> {
    return await DineInSession.find({ outletId })
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

  async findActiveSession(userId: string, outletId: string): Promise<IDineInSession | null> {
    return await DineInSession.findOne({
      userId,
      outletId,
      status: { $in: ['pending', 'active'] }
    });
  }
} 