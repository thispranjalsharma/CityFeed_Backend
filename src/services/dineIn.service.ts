import { UserRepository } from '../repositories/user.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { OfferRepository } from '../repositories/offer.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { AppErrorClass } from '../middleware/error.middleware';
import { PaymentService } from './payment.service';

export class DineInService {
  private userRepository: UserRepository;
  private merchantRepository: MerchantRepository;
  private offerRepository: OfferRepository;
  private dineInSessionRepository: DineInSessionRepository;
  private paymentService: PaymentService;

  constructor() {
    this.userRepository = new UserRepository();
    this.merchantRepository = new MerchantRepository();
    this.offerRepository = new OfferRepository();
    this.dineInSessionRepository = new DineInSessionRepository();
    this.paymentService = new PaymentService();
  }

  async processDineIn(data: {
    userId: string;
    merchantId: string;
    offerId: string;
    totalBill: number;
  }) {
    const { userId, merchantId, offerId, totalBill } = data;

    // Verify user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    if (!user.isActive) {
      throw new AppErrorClass('User account is not active', 403);
    }

    // Verify merchant
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new AppErrorClass('Merchant not found', 404);
    }
    if (!merchant.isActive) {
      throw new AppErrorClass('Merchant account is not active', 403);
    }

    // Verify offer
    const offer = await this.offerRepository.findById(offerId);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }
    if (!offer.isActive) {
      throw new AppErrorClass('Offer is not active', 403);
    }

    // Calculate discount
    const { discountAmount, finalAmount } = await this.paymentService.calculateDiscount(userId, totalBill);

    // Check if user has enough coins
    if ((user as any).coins === undefined) {
      throw new AppErrorClass('User wallet not found', 400);
    }
    if ((user as any).coins < finalAmount) {
      return {
        status: 'insufficient_coins',
        message: 'Insufficient coins. Please recharge your wallet.',
        requiredCoins: finalAmount,
        currentCoins: (user as any).coins,
        finalAmount
      };
    }

    // Create dine-in session
    const session = await this.dineInSessionRepository.create({
      userId,
      merchantId,
      offerId
    });

    // Deduct coins from user
    await this.userRepository.update(userId, { $inc: { coins: -finalAmount } });

    return {
      status: 'success',
      session
    };
  }

  async getUserDineInHistory(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    return this.dineInSessionRepository.findByUserId(userId);
  }

  async getMerchantDineInHistory(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new AppErrorClass('Merchant not found', 404);
    }
    return this.dineInSessionRepository.findByMerchantId(merchantId);
  }
} 