import { UserRepository } from '../repositories/user.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { OfferRepository } from '../repositories/offer.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { AppErrorClass } from '../middleware/error.middleware';
import { PaymentService } from './payment.service';
import { IDineInSession } from '../interfaces/dineInSession.interface';
import { PaymentRepository } from '../repositories/payment.repository';

export class DineInService {
  public merchantRepository: MerchantRepository;
  private userRepository: UserRepository;
  private offerRepository: OfferRepository;
  private dineInSessionRepository: DineInSessionRepository;
  private paymentService: PaymentService;

  constructor() {
    this.merchantRepository = new MerchantRepository();
    this.userRepository = new UserRepository();
    this.offerRepository = new OfferRepository();
    this.dineInSessionRepository = new DineInSessionRepository();
    this.paymentService = new PaymentService(
      new PaymentRepository(),
      this.userRepository,
      this.dineInSessionRepository
    );
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
    if (!merchant.isApproved) {
      throw new AppErrorClass('Merchant is not approved', 403);
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
    const roundedFinalAmount = Math.round(finalAmount);

    // Create dine-in session without deducting coins
    const session = await this.dineInSessionRepository.create({
      userId,
      merchantId,
      offerId
    });

    // Update session with total bill and status
    await this.dineInSessionRepository.update(session._id.toString(), {
      totalBill: roundedFinalAmount,
      status: 'pending'
    });

    return {
      status: 'success',
      session,
      finalAmount: roundedFinalAmount
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

  public async createDineInSession(data: IDineInSession): Promise<IDineInSession> {
    try {
      // Validate merchant
      const merchant = await this.merchantRepository.findById(data.merchantId);
      if (!merchant) {
        throw new AppErrorClass('Merchant not found', 404);
      }

      if (!merchant.isApproved) {
        throw new AppErrorClass('Merchant is not approved', 403);
      }

      // Validate user
      const user = await this.userRepository.findById(data.userId);
      if (!user) {
        throw new AppErrorClass('User not found', 404);
      }

      // Create dine-in session
      const dineInSession = await this.dineInSessionRepository.create(data);
      return dineInSession;
    } catch (error) {
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass('Failed to create dine-in session', 500);
    }
  }
} 