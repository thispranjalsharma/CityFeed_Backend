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
   * Calculate reward points based on payment amount and membership type
   * @param amount Payment amount in coins
   * @param membershipType User's membership type
   * @returns Number of reward points to be awarded
   */
  calculateRewardPoints(amount: number, membershipType: keyof typeof this.REWARD_PERCENTAGES): number {
    const percentage = this.REWARD_PERCENTAGES[membershipType];
    return Math.round((amount * percentage) / 100);
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
   * @param amount Payment amount in coins
   * @returns Updated user object with new reward points
   */
  async addRewardPoints(userId: string, amount: number): Promise<void> {
    try {
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }

      const rewardPoints = this.calculateRewardPoints(amount, user.membershipType);
     
      
      // Update user's reward points
      const updatedUser = await this.userRepository.update(userId, {
        $inc: { reward_points: rewardPoints }
      });
      
      if (!updatedUser) {
        throw new AppErrorClass('Failed to update reward points', 500);
      }
    } catch (error) {
      logger.error('Error in addRewardPoints:', error);
      throw error;
    }
  }

  /**
   * Use reward points for payment
   * @param userId User ID
   * @param totalBill Total bill amount
   * @param rewardPointsToUse Number of reward points to use
   * @returns Object containing the amount to be deducted from reward points and remaining bill amount
   */
  async useRewardPoints(userId: string, totalBill: number, rewardPointsToUse: number): Promise<{ rewardPointsDeducted: number; remainingBill: number }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }

      // Check if user has enough reward points
      if (user.reward_points < rewardPointsToUse) {
        throw new AppErrorClass('Insufficient reward points', 400);
      }

      // Calculate maximum reward points that can be used
      const maxRewardPointsUsage = this.calculateMaxRewardPointsUsage(totalBill, user.membershipType);
      if (rewardPointsToUse > maxRewardPointsUsage) {
        throw new AppErrorClass(`You can only use up to ${maxRewardPointsUsage} reward points for this payment`, 400);
      }

      // Deduct reward points
      const updatedUser = await this.userRepository.update(userId, {
        $inc: { reward_points: -rewardPointsToUse }
      });

      if (!updatedUser) {
        throw new AppErrorClass('Failed to update reward points', 500);
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