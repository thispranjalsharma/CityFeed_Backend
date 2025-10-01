import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { IUserRepository } from "../repositories/user.repository";
import { IAdminRepository } from "../repositories/admin.repository";
import { IAdminService } from "../services/admin.service";
import { CronScheduler } from "../utils/cronScheduler.util";
import { AuthRequest, TokenPayload } from "../interfaces/auth.interface";
import { IEventOrganizerRepository } from "../repositories/eventOrganizer.repository";
import { EventManager } from "../models/eventManager.model";
import { Event } from "../models/event.model";
import { EventOrganizer } from "../models/eventOrganizer.model";
import { EventStaff } from "../models/eventStaff.model";
import { PreRegistrationPayment } from "../models/preRegistrationPayment.model";
import { injectable, inject } from "inversify";
import { User } from "../models/user.model";
import { EmailQueueService } from "../services/emailQueue.service";

@injectable()
export class AdminController extends BaseController {
  constructor(
    @inject("UserRepository") private userRepository: IUserRepository,
    @inject("AdminRepository") private adminRepository: IAdminRepository,
    @inject("AdminService") private adminService: IAdminService,
    @inject("CronScheduler") private cronScheduler: CronScheduler,
    @inject("EventOrganizerRepository")
    private eventOrganizerRepository: IEventOrganizerRepository,
    @inject("EmailQueueService") emailQueueService: EmailQueueService // NOTE: no private/public
  ) {
    super(emailQueueService);
  }

  getUsers = async (_req: any, res: Response) => {
    try {
      const users = await this.userRepository.findAll();
      return this.sendSuccess(res, users);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  deactivateUser = async (req: any, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await this.userRepository.findById(userId);

      if (!user) {
        return this.sendError(res, "User not found", 404);
      }

      const updatedUser = await this.userRepository.update(userId, {
        isActive: false,
      });
      return this.sendSuccess(
        res,
        { user: updatedUser },
        "User deactivated successfully"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  login = async (req: any, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return this.sendError(res, "Email and password are required", 400);
      }
      const result = await this.adminService.login(email, password);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  triggerCleanup = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;

      // Only super admins can trigger cleanup
      if (currentUser.role !== "super_admin") {
        return this.sendError(
          res,
          "Only super admins can trigger cleanup jobs",
          403
        );
      }

      await this.cronScheduler.triggerManualCleanup();
      this.sendSuccess(res, null, "Cleanup job triggered successfully");
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  getCleanupStats = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;

      // Only super admins can view cleanup statistics
      if (currentUser.role !== "super_admin") {
        return this.sendError(
          res,
          "Only super admins can view cleanup statistics",
          403
        );
      }

      const stats = await this.cronScheduler.getSoftDeleteStats();
      this.sendSuccess(
        res,
        stats,
        "Soft delete statistics retrieved successfully"
      );
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  approveEventOrganizer = async (req: any, res: Response) => {
    try {
      const { organizerId } = req.params;
      const eventOrganizer = await this.eventOrganizerRepository.findById(
        organizerId
      );
      if (!eventOrganizer) {
        return this.sendError(res, "Event organizer not found", 404);
      }
      if (eventOrganizer.isApproved) {
        return this.sendError(res, "Event organizer is already approved", 400);
      }
      const approvedOrganizer =
        await this.eventOrganizerRepository.approveEventOrganizer(organizerId);
      return this.sendSuccess(
        res,
        { eventOrganizer: approvedOrganizer },
        "Event organizer approved successfully"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  disapproveEventOrganizer = async (req: any, res: Response) => {
    try {
      const { organizerId } = req.params;
      const eventOrganizer = await this.eventOrganizerRepository.findById(
        organizerId
      );
      if (!eventOrganizer) {
        return this.sendError(res, "Event organizer not found", 404);
      }
      if (!eventOrganizer.isApproved) {
        return this.sendError(
          res,
          "Event organizer is already not approved",
          400
        );
      }
      eventOrganizer.isApproved = false;
      await eventOrganizer.save();
      return this.sendSuccess(
        res,
        { eventOrganizer },
        "Event organizer disapproved successfully"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  getPendingEventOrganizers = async (_req: any, res: Response) => {
    try {
      const pendingOrganizers =
        await this.eventOrganizerRepository.findPendingApproval();
      return this.sendSuccess(res, { eventOrganizers: pendingOrganizers });
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  getAllEventManagersWithEvents = async (_req: any, res: Response) => {
    try {
      const managers = await EventManager.find();
      const events = await Event.find();
      const managersWithEvents = managers.map((manager: any) => ({
        ...manager.toObject(),
        events: events.filter(
          (event: any) =>
            event.managerId &&
            event.managerId.toString() === manager._id.toString()
        ),
      }));
      return this.sendSuccess(
        res,
        managersWithEvents,
        "Event managers with assigned events"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  getAllEventOrganizers = async (_req: any, res: Response) => {
    try {
      const organizers = await EventOrganizer.find();

      // Add type field to each event organizer in the response
      const organizersWithType = organizers.map((organizer) => ({
        ...organizer.toObject(),
        type: "event",
      }));

      return this.sendSuccess(res, organizersWithType, "All event organizers");
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  getAllEventStaffWithEvents = async (_req: any, res: Response) => {
    try {
      const staff = await EventStaff.find();
      const events = await Event.find();
      const staffWithEvents = staff.map((s: any) => ({
        ...s.toObject(),
        events: events.filter(
          (event: any) => event._id.toString() === s.event.toString()
        ),
      }));
      return this.sendSuccess(
        res,
        staffWithEvents,
        "Event staff with assigned events"
      );
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  getPreRegistrationPayments = async (req: Request, res: Response) => {
    try {
      const { status, email } = req.query;

      const filter: any = {};
      if (status) filter.status = status;
      if (email) filter.email = email;

      const payments = await PreRegistrationPayment.find(filter)
        .sort({ createdAt: -1 })
        .populate("userId", "name email phone")
        .populate("paymentId", "amount type status");

      return this.sendSuccess(res, payments);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };
}

export const activateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "User activated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
