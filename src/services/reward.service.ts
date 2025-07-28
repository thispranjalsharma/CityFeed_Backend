import { UserRepository } from '../repositories/user.repository';
import { AppErrorClass } from '../utils/appError';
import { logger } from '../utils/logger.util';

export class RewardService {
  private userRepository: UserRepository;

  // Define reward percentages for each membership type
  private readonly REWARD_PERCENTAGES = {
    cityfeed_select: 2, // 2% reward points
    cityfeed_edge: 3,   // 3% reward points
    cityfeed_prime: 5   // 5% reward points
  };

  // Define maximum reward points usage percentage for each membership type
  private readonly MAX_REWARD_POINTS_USAGE = {
    cityfeed_select: 3, // 20% of total bill
    cityfeed_edge: 6,   // 30% of total bill
    cityfeed_prime: 9   // 40% of total bill
  };

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Calculate reward coins based on payment amount and membership type
   * @param amount Payment amount in coins
   * @param membershipType User's membership type
   * @returns Number of reward coins to be awarded
   */
  calculateRewardCoins(amount: number, membershipType: keyof typeof this.REWARD_PERCENTAGES): number {
    const percentage = this.REWARD_PERCENTAGES[membershipType];
    return Math.floor((amount * percentage) / 100);
  }

  /**
   * Calculate maximum reward points that can be used for a payment
   * @param totalBill Total bill amount
   * @param membershipType User's membership type
   * @returns Maximum reward points that can be used
   */
  calculateMaxRewardPointsUsage(totalBill: number, membershipType: keyof typeof this.MAX_REWARD_POINTS_USAGE): number {
    const percentage = this.MAX_REWARD_POINTS_USAGE[membershipType];
    return Math.round((totalBill * percentage) / 100);
  }

  /**
   * Add reward coins to user's account after successful payment
   * @param userId User ID
   * @param amount Payment amount in coins
   * @returns Updated user object with new reward coins
   */
  async addRewardCoins(userId: string, amount: number): Promise<void> {
    try {
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }

      const rewardCoins = this.calculateRewardCoins(amount, user.membershipType);
     
      
      // Update user's coins (unified field)
      const updatedUser = await this.userRepository.update(userId, {
        $inc: { coins: rewardCoins }
      });
      
      if (!updatedUser) {
        throw new AppErrorClass('Failed to update reward coins', 500);
      }
      // Disabled: reward_points logic
      // await this.userRepository.update(userId, { $inc: { reward_points: rewardCoins } });
    } catch (error) {
      logger.error('Error in addRewardCoins:', error);
      throw error;
    }
  }

  /**
   * Use coins for payment (unified field)
   * @param userId User ID
   * @param totalBill Total bill amount
   * @param coinsToUse Number of coins to use
   * @returns Object containing the amount to be deducted from coins and remaining bill amount
   */
  async useCoins(userId: string, totalBill: number, coinsToUse: number): Promise<{ coinsDeducted: number; remainingBill: number }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }

      // Check if user has enough coins
      if (user.coins < coinsToUse) {
        throw new AppErrorClass('Insufficient coins', 400);
      }

      // Calculate maximum coins usage if needed (optional, can be based on membership)
      // const maxCoinsUsage = this.calculateMaxRewardPointsUsage(totalBill, user.membershipType);
      // if (coinsToUse > maxCoinsUsage) {
      //   throw new AppErrorClass(`You can only use up to ${maxCoinsUsage} coins for this payment`, 400);
      // }

      // Deduct coins
      const updatedUser = await this.userRepository.update(userId, {
        $inc: { coins: -coinsToUse }
      });

      if (!updatedUser) {
        throw new AppErrorClass('Failed to update reward coins', 500);
      }

      return {
        coinsDeducted: coinsToUse,
        remainingBill: totalBill - coinsToUse
      };
      // Disabled: reward_points logic
      // if (user.reward_points < coinsToUse) throw new AppErrorClass('Insufficient reward points', 400);
      // await this.userRepository.update(userId, { $inc: { reward_points: -coinsToUse } });
    } catch (error) {
      logger.error('Error in useCoins:', error);
      throw error;
    }
  }
} 