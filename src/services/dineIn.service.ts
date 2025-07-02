import { UserRepository } from '../repositories/user.repository';
import { OfferRepository } from '../repositories/offer.repository';
import { DineInSessionRepository } from '../repositories/dineInSession.repository';
import { AppErrorClass } from '../utils/appError';
import { PaymentService } from './payment.service';
import { IDineInSession } from '../interfaces/dineInSession.interface';
import { PaymentRepository } from '../repositories/payment.repository';
import { OutletRepository } from '../repositories/outlet.repository';

export class DineInService {
  private userRepository: UserRepository;
  private offerRepository: OfferRepository;
  private dineInSessionRepository: DineInSessionRepository;
  private outletRepository: OutletRepository;
  private paymentService: PaymentService;

  constructor() {
    this.userRepository = new UserRepository();
    this.offerRepository = new OfferRepository();
    this.dineInSessionRepository = new DineInSessionRepository();
    this.outletRepository = new OutletRepository();
    this.paymentService = new PaymentService(
      new PaymentRepository(),
      this.userRepository,
      this.dineInSessionRepository
    );
  }

  async processDineIn(data: {
    userId: string;
    outletId: string;
    offerId: string;
    totalBill: number;
  }) {
    const { userId, outletId, offerId, totalBill } = data;

    // Verify user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    if (!user.isActive) {
      throw new AppErrorClass('User account is not active', 403);
    }

    // Verify outlet
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass('Outlet not found', 404);
    }

    // Verify offer
    const offer = await this.offerRepository.findById(offerId);
    if (!offer) {
      throw new AppErrorClass('Offer not found', 404);
    }
    if (!offer.isActive) {
      throw new AppErrorClass('Offer is not active', 403);
    }

    // Create dine-in session with original total bill
    const session = await this.dineInSessionRepository.create({
      userId,
      outletId,
      offerId,
      totalBill,
      status: 'pending'
    });

    return {
      status: 'success',
      session,
      finalAmount: totalBill // Return original amount, discount will be calculated during payment
    };
  }

  async getUserDineInHistory(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass('User not found', 404);
    }
    return this.dineInSessionRepository.findByUserId(userId);
  }

  async getOutletDineInHistory(outletId: string) {
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass('Outlet not found', 404);
    }
    const sessions = await this.dineInSessionRepository.findByOutletId(outletId);
    // Fetch offer details for each session
    const sessionsWithOfferDetail = await Promise.all(
      sessions.map(async (session) => {
        let offerDetail = null;
        try {
          offerDetail = await this.offerRepository.findById(session.offerId);
        } catch (e) {
          offerDetail = null;
        }
        // Convert session to plain object if needed
        const sessionObj = session.toObject ? session.toObject() : session;
        return {
          ...sessionObj,
          offerDetail,
        };
      })
    );
    return sessionsWithOfferDetail;
  }

  public async createDineInSession(data: IDineInSession): Promise<IDineInSession> {
    try {
      // Validate outlet
      const outlet = await this.outletRepository.findById(data.outletId);
      if (!outlet) {
        throw new AppErrorClass('Outlet not found', 404);
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