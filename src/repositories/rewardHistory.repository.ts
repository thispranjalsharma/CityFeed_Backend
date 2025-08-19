import { BaseRepository } from './base.repository';
import { RewardHistory } from '../models/rewardHistory.model';
import { IRewardHistory, IRewardHistoryCreate } from '../interfaces/rewardHistory.interface';

export class RewardHistoryRepository extends BaseRepository<IRewardHistory> {
  constructor() {
    super(RewardHistory);
  }

  async createRewardHistory(data: IRewardHistoryCreate): Promise<IRewardHistory> {
    return await this.create(data);
  }

  async getRewardHistoryByUserId(
    userId: string, 
    page: number = 1, 
    limit: number = 10,
    transactionType?: 'earned' | 'redeemed' | 'refund' | 'adjustment',
    sourceType?: 'dine-in' | 'event' | 'referral' | 'membership' | 'adjustment' | 'refund'
  ): Promise<{
    history: IRewardHistory[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter: any = { userId };
    if (transactionType) filter.transactionType = transactionType;
    if (sourceType) filter.sourceType = sourceType;

    const [history, totalCount] = await Promise.all([
      this.model.find(filter)
        .populate('outletId', 'name address')
        .populate('eventId', 'name')
        .populate('referredUserId', 'name phone email') // Populate referred user information for referral rewards
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter)
    ]);

    return {
      history: history as IRewardHistory[],
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  }

  async getRewardSummaryByUserId(userId: string): Promise<{
    totalEarned: number;
    totalRedeemed: number;
    currentBalance: number;
    transactionCount: number;
  }> {
    const summary = await this.model.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$transactionType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let totalEarned = 0;
    let totalRedeemed = 0;
    let transactionCount = 0;

    summary.forEach(item => {
      transactionCount += item.count;
      if (item._id === 'earned') {
        totalEarned = item.totalAmount;
      } else if (item._id === 'redeemed') {
        totalRedeemed = item.totalAmount;
      }
    });

    const currentBalance = totalEarned - totalRedeemed;

    return {
      totalEarned,
      totalRedeemed,
      currentBalance,
      transactionCount
    };
  }

  async getRewardHistoryBySourceId(sourceId: string): Promise<IRewardHistory[]> {
    return await this.model.find({ sourceId }).sort({ createdAt: -1 }).lean();
  }
}
