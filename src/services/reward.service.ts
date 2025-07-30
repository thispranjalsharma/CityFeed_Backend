import { UserRepository } from '../repositories/user.repository';
import { AppErrorClass } from '../utils/appError';
import { logger } from '../utils/logger.util';

export class RewardService {
  private userRepository: UserRepository;

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
   * Add reward points to user's account after successful payment
   * @param userId User ID
   * @param rewardPointsToAdd Amount of reward points to add (discount amount)
   * @returns Updated user object with new reward points
   */
  async addRewardPoints(userId: string, rewardPointsToAdd: number): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }
      
      // Log the reward calculation for debugging
      logger.info(`Adding reward points: userId=${userId}, rewardPointsToAdd=${rewardPointsToAdd}`);
      
      // Update user's coins with the discount amount as reward points
      const updatedUser = await this.userRepository.update(userId, {
        $inc: { coins: rewardPointsToAdd }
      });
      if (!updatedUser) {
        throw new AppErrorClass('Failed to update coins with reward points', 500);
      }
      
      // Log the updated user for debugging
      logger.info(`User updated with reward points: userId=${userId}, newCoins=${updatedUser.coins}`);
    } catch (error) {
      logger.error('Error in addRewardPoints:', error);
      throw error;
    }
  }

  /**
   * Use reward points (now coins) for payment
   * @param userId User ID
   * @param totalBill Total bill amount
   * @param rewardPointsToUse Number of reward points to use
   * @returns Object containing the amount to be deducted from coins and remaining bill amount
   */
  async useRewardPoints(userId: string, totalBill: number, rewardPointsToUse: number): Promise<{ rewardPointsDeducted: number; remainingBill: number }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }
      // Check if user has enough coins
      if (user.coins < rewardPointsToUse) {
        throw new AppErrorClass('Insufficient coins', 400);
      }
      // Calculate maximum reward points that can be used
      const maxRewardPointsUsage = this.calculateMaxRewardPointsUsage(totalBill, user.membershipType);
      if (rewardPointsToUse > maxRewardPointsUsage) {
        throw new AppErrorClass(`You can only use up to ${maxRewardPointsUsage} coins for this payment`, 400);
      }
      // Deduct coins
      const updatedUser = await this.userRepository.update(userId, {
        $inc: { coins: -rewardPointsToUse }
      });
      if (!updatedUser) {
        throw new AppErrorClass('Failed to update coins', 500);
      }
      return {
        rewardPointsDeducted: rewardPointsToUse,
        remainingBill: totalBill - rewardPointsToUse
      };
    } catch (error) {
      logger.error('Error in useRewardPoints:', error);
      throw error;
    }
  }
} 