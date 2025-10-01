import { Request, Response } from "express";
import { EventManager } from "../models/eventManager.model";
import { IEventAuthService } from "../services/eventAuth.service";
import { EventController } from "./event.controller";
import { Event } from "../models/event.model";
import { EventStaff } from "../models/eventStaff.model";
import mongoose from "mongoose";
import { injectable, inject } from "inversify";

@injectable()
export class EventManagerController {
  constructor(
    @inject("EventAuthService") private eventAuthService: IEventAuthService
  ) {}

  async createEventManager(req: Request, res: Response) {
    try {
      const { name, email, password, phone } = req.body;
      if (!name || !email || !password || !phone) {
        return res
          .status(400)
          .json({ success: false, message: "All fields are required" });
      }

      // Check for existing event manager with same email
      const existingEmail = await EventManager.findOne({ email });
      if (existingEmail) {
        return res
          .status(409)
          .json({ success: false, message: "Email already exists" });
      }

      // Check for existing event manager with same phone number
      const existingPhone = await EventManager.findOne({ phone });
      if (existingPhone) {
        return res
          .status(409)
          .json({ success: false, message: "Phone number already exists" });
      }

      const organizerId = (req as any).user?._id;
      if (!organizerId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const manager = new EventManager({
        name,
        email,
        password,
        phone,
        createdBy: organizerId,
      });
      await manager.save();
      // Generate verification token and send email
      const token =
        await this.eventAuthService.generateAndSendManagerVerification(manager);
      return res.status(201).json({
        success: true,
        data: {
          _id: manager._id,
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
          role: manager.role,
          verificationToken: token, // For testing in Swagger
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async createEventStaff(req: any, res: any) {
    // No implementation for createEventStaffOnly in EventController. Throw error for now.
    return res.status(501).json({
      success: false,
      message:
        "Not implemented: createEventStaffOnly is missing. Please implement event staff creation logic.",
    });
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const manager = await EventManager.findById(user._id);
      if (!manager)
        return res
          .status(404)
          .json({ success: false, message: "Manager not found" });
      if (manager.isDeleted) {
        return res
          .status(410)
          .json({ success: false, message: "This account has been deleted." });
      }
      return res.status(200).json({ success: true, data: manager });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const updates = req.body;
      delete updates.email;
      delete updates.password;
      const manager = await EventManager.findByIdAndUpdate(user._id, updates, {
        new: true,
      });
      if (!manager)
        return res
          .status(404)
          .json({ success: false, message: "Manager not found" });
      return res.status(200).json({ success: true, data: manager });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const manager = await EventManager.findById(user._id);
      if (!manager)
        return res
          .status(404)
          .json({ success: false, message: "Manager not found" });
      manager.isDeleted = true;
      await manager.save();
      return res
        .status(200)
        .json({ success: true, message: "Profile deleted" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async activateEventManager(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      const { managerId } = req.params;
      if (!user || user.role !== "event_organizer") {
        return res.status(403).json({
          success: false,
          message: "Only event organizers can activate event managers.",
        });
      }
      const manager = await EventManager.findById(managerId);
      if (!manager) {
        return res
          .status(404)
          .json({ success: false, message: "Event manager not found." });
      }
      manager.isActive = true;
      await manager.save();
      return res.status(200).json({
        success: true,
        message: "Event manager activated.",
        data: manager,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async deactivateEventManager(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const user = req.user;
      const { managerId } = req.params;
      if (!user || user.role !== "event_organizer") {
        return res.status(403).json({
          success: false,
          message: "Only event organizers can deactivate event managers.",
        });
      }
      const manager = await EventManager.findById(managerId);
      if (!manager) {
        return res
          .status(404)
          .json({ success: false, message: "Event manager not found." });
      }
      manager.isActive = false;
      await manager.save();
      return res.status(200).json({
        success: true,
        message: "Event manager deactivated.",
        data: manager,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getDashboardData(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const managerId = req.user?._id;
      if (!managerId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      // Load manager to resolve organizerId for staff counting (to match my-event-staff endpoint behavior)
      const managerDoc = await EventManager.findById(managerId);
      if (!managerDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Event manager not found" });
      }
      const organizerIdForManager = managerDoc.createdBy;
      // 1. Get all events managed by this manager
      const events = await Event.find({ managerId: managerId });
      const eventIds = events.map((e) => e._id);
      const now = new Date();
      // Additions for dashboard metrics
      const totalEvents = await Event.countDocuments({ managerId: managerId });
      const upcomingEventsCount = await Event.countDocuments({
        managerId: managerId,
        status: "published",
        date: { $gte: now },
      });
      const completedEventsCount = await Event.countDocuments({
        managerId: managerId,
        status: "published",
        date: { $lt: now },
      });
      // 2. Active event count (published, saleEnd in future)
      const activeEventCount = await Event.countDocuments({
        managerId: managerId,
        status: "published",
        saleEnd: { $gte: now },
      });
      // 3. Event staff count (aligned with /api/events/my-event-staff which filters by organizerId)
      const eventStaffCount = await EventStaff.countDocuments({
        organizerId: organizerIdForManager,
        isDeleted: false,
      });
      // 4. Total tickets sold (all managed events)
      const totalTicketsSold = await Event.aggregate([
        { $match: { managerId: managerId } },
        { $group: { _id: null, total: { $sum: "$totalSoldCount" } } },
      ]);
      // 5. Monthly ticket sales revenue (current FY)
      const year =
        now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(year, 3, 1);
      const monthlySales = await Event.aggregate([
        {
          $match: {
            managerId: managerId,
            status: "published",
            date: { $gte: fyStart },
          },
        },
        { $unwind: "$ticketTiers" },
        {
          $group: {
            _id: { month: { $month: "$date" }, year: { $year: "$date" } },
            total: {
              $sum: {
                $multiply: ["$ticketTiers.soldCount", "$ticketTiers.price"],
              },
            },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);
      // 6. Recent ticket sales (last 10, by event date)
      const recentTicketSales = await Event.find({
        managerId: managerId,
        status: "published",
      })
        .sort({ date: -1 })
        .limit(10)
        .select("name date totalSoldCount ticketTiers");
      // 7. Upcoming managed events
      const upcomingEvents = await Event.find({
        managerId: managerId,
        status: "published",
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(5)
        .select("name date venue");
      res.json({
        success: true,
        data: {
          activeEventCount,
          eventStaffCount,
          totalTicketsSold: totalTicketsSold[0]?.total || 0,
          monthlySales,
          recentTicketSales,
          upcomingEvents,
          totalEvents,
          upcomingEventsCount,
          completedEventsCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getManagedEventTicketBookings(
    req: Request & { user?: { _id: string; role: string } },
    res: Response
  ) {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 10, status, search } = req.query;
      const managerId = req.user?._id;

      if (!managerId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Check if event exists and is managed by this manager
      const event = await Event.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      if (
        !event.managerId ||
        event.managerId.toString() !== managerId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Forbidden: You can only access ticket bookings for events you manage",
        });
      }

      // Import Ticket model
      const { Ticket } = await import("../models/ticket.model");

      // Build query
      const query: any = { eventId };

      if (status) {
        query.status = status;
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Get tickets with user details
      let ticketsQuery = Ticket.find(query)
        .populate({
          path: "userId",
          select:
            "name email phone membershipType membershipExpiryDate profilePicture address",
        })
        .populate({
          path: "ticketTierId",
          select: "name price description",
        })
        .populate({
          path: "scannedBy",
          select: "name email",
        })
        .sort({ issuedAt: -1 });

      // Add search functionality
      if (search) {
        ticketsQuery = ticketsQuery.populate({
          path: "userId",
          match: {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i" } },
            ],
          },
          select:
            "name email phone membershipType membershipExpiryDate profilePicture address",
        });
      }

      const tickets = await ticketsQuery.skip(skip).limit(Number(limit)).lean();
      const totalTickets = await Ticket.countDocuments(query);

      // Filter out tickets where user doesn't match search (if search is applied)
      const filteredTickets = search
        ? tickets.filter((ticket) => ticket.userId)
        : tickets;

      // Format response
      const formattedTickets = filteredTickets.map((ticket) => ({
        ticketId: ticket._id,
        orderId: ticket.orderId,
        status: ticket.status,
        quantity: ticket.quantity,
        issuedAt: ticket.issuedAt,
        scannedAt: ticket.scannedAt,
        qrCodeUrl: ticket.qrCodeUrl,
        user:
          ticket.userId &&
          typeof ticket.userId === "object" &&
          "_id" in ticket.userId
            ? {
                id: (ticket.userId as any)._id,
                name: (ticket.userId as any).name,
                email: (ticket.userId as any).email,
                phone: (ticket.userId as any).phone,
                membershipType: (ticket.userId as any).membershipType,
                membershipExpiryDate: (ticket.userId as any)
                  .membershipExpiryDate,
                profilePicture: (ticket.userId as any).profilePicture,
                address: (ticket.userId as any).address,
              }
            : null,
        ticketTier:
          ticket.ticketTierId &&
          typeof ticket.ticketTierId === "object" &&
          "_id" in ticket.ticketTierId
            ? {
                id: (ticket.ticketTierId as any)._id,
                name: (ticket.ticketTierId as any).name,
                price: (ticket.ticketTierId as any).price,
                description: (ticket.ticketTierId as any).description,
              }
            : null,
        scannedBy:
          ticket.scannedBy &&
          typeof ticket.scannedBy === "object" &&
          "_id" in ticket.scannedBy
            ? {
                id: (ticket.scannedBy as any)._id,
                name: (ticket.scannedBy as any).name,
                email: (ticket.scannedBy as any).email,
              }
            : null,
      }));

      // Calculate statistics
      const stats = await Ticket.aggregate([
        { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
          },
        },
      ]);

      const statistics = {
        total: 0,
        active: 0,
        used: 0,
        invalidated: 0,
        totalQuantity: 0,
      };

      stats.forEach((stat) => {
        statistics[stat._id as keyof typeof statistics] = stat.count;
        statistics.totalQuantity += stat.totalQuantity;
      });

      res.json({
        success: true,
        data: {
          event: {
            id: event._id,
            name: event.name,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            venue: event.venue,
          },
          tickets: formattedTickets,
          statistics,
          pagination: {
            total: totalTickets,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalTickets / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
