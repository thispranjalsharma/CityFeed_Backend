import { UserRepository } from '../repositories/user.repository';
import { AppErrorClass } from '../middleware/error.middleware';

export class RewardService {
  private userRepository: UserRepository;

  // Define reward percentages for each membership type
  private readonly REWARD_PERCENTAGES = {
    cityfeed_select: 2, // 2% reward points
    cityfeed_edge: 3,   // 3% reward points
    cityfeed_prime: 5   // 5% reward points
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
   * Add reward points to user's account after successful payment
   * @param userId User ID
   * @param amount Payment amount in coins
   * @returns Updated user object with new reward points
   */
  async addRewardPoints(userId: string, amount: number): Promise<void> {
    try {
      console.log('Starting reward points calculation:', { userId, amount });
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }

      console.log('User details:', { 
        userId, 
        membershipType: user.membershipType, 
        currentRewardPoints: user.reward_points,
        paymentAmount: amount
      });

      const rewardPoints = this.calculateRewardPoints(amount, user.membershipType);
      console.log('Calculated reward points:', { 
        amount, 
        membershipType: user.membershipType, 
        rewardPoints,
        percentage: this.REWARD_PERCENTAGES[user.membershipType]
      });
      
      // Update user's reward points
      const updatedUser = await this.userRepository.update(userId, {
        $inc: { reward_points: rewardPoints }
      });
      
      console.log('Updated user with reward points:', {
        userId,
        oldRewardPoints: user.reward_points,
        newRewardPoints: updatedUser?.reward_points,
        addedPoints: rewardPoints
      });

      if (!updatedUser) {
        throw new AppErrorClass('Failed to update reward points', 500);
      }
    } catch (error) {
      console.error('Error in addRewardPoints:', error);
      throw error;
    }
  }
} 