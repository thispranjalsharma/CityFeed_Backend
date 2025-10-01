import { inject, injectable } from "inversify";
import { IUserRepository } from "../repositories/user.repository";
import { IRewardHistoryRepository } from "../repositories/rewardHistory.repository";
import { AppErrorClass } from "../utils/appError";
import { logger } from "../utils/logger.util";

export interface IRewardService {
  calculateRewards(userId: string, amount: number): Promise<number>;
  calculateMaxRewardPointsUsage(
    totalBill: number,
    membershipType: string
  ): number;
  processReferralReward(referralCode: string, newUserId: string): Promise<void>;
  addCoinsToUser(userId: string, coins: number, reason: string): Promise<any>;
  addRewardPoints(
    userId: string,
    rewardPoints: number,
    sourceType?: string,
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string,
    referredUserId?: string
  ): Promise<void>;
  useRewardPoints(
    userId: string,
    totalBill: number,
    rewardPoints: number,
    sourceType?: string,
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string
  ): Promise<{ rewardPointsDeducted: number; remainingBill: number }>;
  getRewardHistory(
    userId: string,
    page?: number,
    limit?: number,
    transactionType?: string,
    sourceType?: string
  ): Promise<any>;
  getRewardSummary(userId: string): Promise<any>;
}

@injectable()
export class RewardService implements IRewardService {
  private readonly MAX_USAGE = {
    cityfeed_select: 3, // 3%
    cityfeed_edge: 6, // 6%
    cityfeed_prime: 9, // 9%
  };

  constructor(
    @inject("UserRepository") private userRepository: IUserRepository,
    @inject("RewardHistoryRepository")
    private rewardHistoryRepository: IRewardHistoryRepository
  ) {}

  calculateMaxRewardPointsUsage(
    totalBill: number,
    membershipType: string
  ): number {
    const percentage =
      this.MAX_USAGE[membershipType as keyof typeof this.MAX_USAGE] || 0;
    return Math.floor((totalBill * percentage) / 100);
  }

  async calculateRewards(userId: string, amount: number): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppErrorClass("User not found", 404);

    let multiplier = 1;
    switch (user.membershipType) {
      case "cityfeed_select":
        multiplier = 1.2;
        break;
      case "cityfeed_edge":
        multiplier = 1.5;
        break;
      case "cityfeed_prime":
        multiplier = 2.0;
        break;
    }
    const points = Math.round(amount * multiplier);
    logger.info(`Calculated ${points} reward points for user ${userId}`);
    return points;
  }

  async processReferralReward(
    referralCode: string,
    newUserId: string
  ): Promise<void> {
    const referrer = await this.userRepository.findByReferralCode(referralCode);
    if (!referrer) throw new AppErrorClass("Invalid referral code", 400);

    const newUser = await this.userRepository.findById(newUserId);
    if (!newUser) throw new AppErrorClass("New user not found", 404);

    const rewardAmount = 100; // fixed reward
    await this.addCoinsToUser(
      referrer._id.toString(),
      rewardAmount,
      `Referral reward for inviting ${newUser.name || newUser.phone}`
    );

    const prevBalance = referrer.coins || 0;
    await this.rewardHistoryRepository.create({
      userId: referrer._id.toString(),
      transactionType: "earned",
      amount: rewardAmount,
      sourceType: "referral",
      description: `Referral reward for inviting ${
        newUser.name || newUser.phone
      }`,
      balanceBefore: prevBalance,
      balanceAfter: prevBalance + rewardAmount,
      referredUserId: newUserId,
    });
    logger.info(
      `Referral reward processed for ${referrer._id.toString()} referring ${newUserId}`
    );
  }

  async addCoinsToUser(
    userId: string,
    coins: number,
    reason: string
  ): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppErrorClass("User not found", 404);

    const prevBalance = user.coins || 0;
    const updatedUser = await this.userRepository.update(userId, {
      coins: prevBalance + coins,
    });
    if (!updatedUser) throw new AppErrorClass("Failed to add coins", 500);

    await this.rewardHistoryRepository.create({
      userId,
      transactionType: "earned",
      amount: coins,
      sourceType: "adjustment",
      description: reason,
      balanceBefore: prevBalance,
      balanceAfter: prevBalance + coins,
    });
    logger.info(`Added ${coins} coins to user ${userId}`);
    return updatedUser;
  }

  async addRewardPoints(
    userId: string,
    rewardPoints: number,
    sourceType: string = "dine-in",
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string,
    referredUserId?: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppErrorClass("User not found", 404);

    const prevBalance = user.coins || 0;
    const updatedUser = await this.userRepository.update(userId, {
      coins: prevBalance + rewardPoints,
    });
    if (!updatedUser)
      throw new AppErrorClass("Failed to add reward points", 500);

    await this.rewardHistoryRepository.create({
      userId,
      transactionType: "earned",
      amount: rewardPoints,
      sourceType: "dine-in",
      sourceId,
      outletId,
      eventId,
      description:
        description || `Earned ${rewardPoints} points from ${sourceType}`,
      balanceBefore: prevBalance,
      balanceAfter: prevBalance + rewardPoints,
      referredUserId,
    });
    logger.info(`Added ${rewardPoints} reward points to user ${userId}`);
  }

  async useRewardPoints(
    userId: string,
    totalBill: number,
    rewardPoints: number,
    sourceType: string = "dine-in",
    sourceId?: string,
    outletId?: string,
    eventId?: string,
    description?: string
  ): Promise<{ rewardPointsDeducted: number; remainingBill: number }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppErrorClass("User not found", 404);

    if (user.coins < rewardPoints)
      throw new AppErrorClass("Insufficient coins", 402);

    const maxAllowed = this.calculateMaxRewardPointsUsage(
      totalBill,
      user.membershipType
    );
    if (rewardPoints > maxAllowed)
      throw new AppErrorClass(
        `Max allowed reward points usage is ${maxAllowed}`,
        400
      );

    const prevBalance = user.coins || 0;
    await this.userRepository.update(userId, {
      coins: prevBalance - rewardPoints,
    });

    await this.rewardHistoryRepository.create({
      userId,
      transactionType: "redeemed",
      amount: rewardPoints,
      sourceType: "dine-in",
      sourceId,
      outletId,
      eventId,
      description:
        description || `Redeemed ${rewardPoints} points for ${sourceType}`,
      balanceBefore: prevBalance,
      balanceAfter: prevBalance - rewardPoints,
    });
    logger.info(`User ${userId} redeemed ${rewardPoints} points`);

    return {
      rewardPointsDeducted: rewardPoints,
      remainingBill: totalBill - rewardPoints,
    };
  }

  async getRewardHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    transactionType?: string,
    sourceType?: string
  ) {
    return this.rewardHistoryRepository.getRewardHistoryByUserId(
      userId,
      page,
      limit,
      transactionType as
        | "earned"
        | "redeemed"
        | "refund"
        | "adjustment"
        | undefined
    );
  }

  async getRewardSummary(userId: string) {
    return this.rewardHistoryRepository.getRewardSummary(userId);
  }
}
