import {
  IUserRepository,
  UserRepository,
} from "../repositories/user.repository";
import {
  IOfferRepository,
  OfferRepository,
} from "../repositories/offer.repository";
import {
  DineInSessionRepository,
  IDineInSessionRepository,
} from "../repositories/dineInSession.repository";
import { AppErrorClass } from "../utils/appError";
import { PaymentService } from "./payment.service";
// import { IDineInSession } from '../interfaces/dineInSession.interface';
import {
  IPaymentRepository,
  PaymentRepository,
} from "../repositories/payment.repository";
import {
  IOutletRepository,
  OutletRepository,
} from "../repositories/outlet.repository";
import { EventRepository } from "../repositories/event.repository";
import { IDineInSession } from "../models/dineInSession.model";
import { inject } from "inversify";

export interface IDineInService {
  processDineIn(data: {
    userId: string;
    outletId: string;
    offerId: string;
    totalBill: number;
  }): Promise<void | {
    status: string;
    session: IDineInSession;
    finalAmount: number;
  }>;

  getUserDineInHistory(userId: string): Promise<IDineInSession[]>;
  getOutletDineInHistory(outletId: string): Promise<IDineInSession[]>;
  // getDineInSessionById(sessionId: string): Promise<IDineInSession | null>;
  getOutletDineInHistoryPaginated(
    outletId: string,
    page?: number,
    limit?: number
  ): Promise<{
    sessions: (IDineInSession & { offerDetail?: any })[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>;

  getMonthlyDineInStats(
    outletIds: string | string[],
    year?: number
  ): Promise<
    {
      month: number;
      year: number;
      totalSessions: number;
      totalRevenue: number;
      averageBill: number;
    }[]
  >;
}

export class DineInService implements IDineInService {
  constructor(
    @inject("UserRepository") private userRepository: IUserRepository,
    @inject("OfferRepository") private offerRepository: IOfferRepository,
    @inject("DineInSessionRepository")
    private dineInSessionRepository: IDineInSessionRepository,
    @inject("OutletRepository") private outletRepository: IOutletRepository,
    @inject("PaymentRepository") private paymentRepository: IPaymentRepository
  ) {}

  async processDineIn(data: {
    userId: string;
    outletId: string;
    offerId: string;
    totalBill: number;
  }): Promise<void | {
    status: string;
    session: IDineInSession;
    finalAmount: number;
  }> {
    const { userId, outletId, offerId, totalBill } = data;

    // Verify user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }
    if (!user.isActive) {
      throw new AppErrorClass("User account is not active", 403);
    }

    // Verify outlet
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass("Outlet not found", 404);
    }

    // Verify offer
    const offer = await this.offerRepository.findById(offerId);
    if (!offer) {
      throw new AppErrorClass("Offer not found", 404);
    }
    if (!offer.isActive) {
      throw new AppErrorClass("Offer is not active", 403);
    }

    // Create dine-in session with original total bill
    const session = await this.dineInSessionRepository.create({
      userId,
      outletId,
      offerId,
      totalBill,
      status: "pending",
    });

    return {
      status: "success",
      session,
      finalAmount: totalBill, // Return original amount, discount will be calculated during payment
    };
  }

  async getUserDineInHistory(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppErrorClass("User not found", 404);
    }
    return this.dineInSessionRepository.findByUserId(userId);
  }

  async getOutletDineInHistory(outletId: string) {
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass("Outlet not found", 404);
    }
    const sessions = await this.dineInSessionRepository.findByOutletId(
      outletId
    );
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

  async getOutletDineInHistoryPaginated(
    outletId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const outlet = await this.outletRepository.findById(outletId);
    if (!outlet) {
      throw new AppErrorClass("Outlet not found", 404);
    }

    const result = await this.dineInSessionRepository.findByOutletIdPaginated(
      outletId,
      page,
      limit
    );

    // Fetch offer details for each session
    const sessionsWithOfferDetail = await Promise.all(
      result.sessions.map(async (session) => {
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

    return {
      sessions: sessionsWithOfferDetail,
      pagination: result.pagination,
    };
  }

  /**
   * Get month-wise dine-in statistics for an outlet or array of outlets.
   * @param outletIds string or string[]
   * @param year Optional year to filter
   */
  async getMonthlyDineInStats(outletIds: string | string[], year?: number) {
    // Only allow if the user is authorized (handled in controller)
    // const paymentRepo = new PaymentRepository();

    return this.paymentRepository.getMonthlyDineInStats(outletIds, year);
  }

  public async createDineInSession(
    data: IDineInSession
  ): Promise<IDineInSession> {
    try {
      // Validate outlet
      const outlet = await this.outletRepository.findById(data.outletId);
      if (!outlet) {
        throw new AppErrorClass("Outlet not found", 404);
      }

      // Validate user
      const user = await this.userRepository.findById(data.userId);
      if (!user) {
        throw new AppErrorClass("User not found", 404);
      }

      // Create dine-in session
      const dineInSession = await this.dineInSessionRepository.create(data);
      return dineInSession;
    } catch (error) {
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass("Failed to create dine-in session", 500);
    }
  }
}
