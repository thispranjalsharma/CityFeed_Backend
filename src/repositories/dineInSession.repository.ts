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
      .populate({
        path: 'userId',
        select: 'name email phone'
      })
      .populate({
        path: 'outletId',
        select: 'name businessName'
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByOutletIdPaginated(outletId: string, page: number = 1, limit: number = 10): Promise<{
    sessions: IDineInSession[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const skip = (page - 1) * limit;
    
    const [sessions, totalItems] = await Promise.all([
      DineInSession.find({ outletId })
        .populate({
          path: 'userId',
          select: 'name email phone'
        })
        .populate({
          path: 'outletId',
          select: 'name businessName'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      DineInSession.countDocuments({ outletId })
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      sessions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage,
        hasPrevPage
      }
    };
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