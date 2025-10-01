import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IOutletAdminService } from "../services/outletAdmin.service";
import { OutletAdmin } from "../models/outletAdmin.model";
import { Outlet } from "../models/outlet.model";
import { Payment } from "../models/payment.model";
import { Offer } from "../models/offer.model";
import { Staff } from "../models/staff.model";
import { DineInSession } from "../models/dineInSession.model";

@injectable()
export class OutletAdminController {
  constructor(
    @inject("OutletAdminService")
    private outletAdminService: IOutletAdminService
  ) {}

  loginOutletAdmin = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const result = await this.outletAdminService.login(email, password);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          outletAdmin: {
            _id: result.outletAdmin._id,
            name: result.outletAdmin.name,
            email: result.outletAdmin.email,
            phone: result.outletAdmin.phone,
            role: result.outletAdmin.role,
            isActive: result.outletAdmin.isActive,
            isEmailVerified: result.outletAdmin.isEmailVerified,
          },
          token: result.token,
          outletId: result.outletId,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  registerOutletAdmin = async (req: Request, res: Response) => {
    try {
      const { name, email, password, phone } = req.body;
      const superAdminId = (req as any).user?._id;

      if (!name || !email || !password || !phone) {
        return res.status(400).json({
          success: false,
          message: "Name, email, password, and phone are required",
        });
      }

      const outletAdmin = await this.outletAdminService.createOutletAdmin({
        name,
        email,
        password,
        phone,
      });

      return res.status(201).json({
        success: true,
        message:
          "Outlet admin registered successfully. Please check your email for verification.",
        data: {
          outletAdmin: {
            _id: outletAdmin._id,
            name: outletAdmin.name,
            email: outletAdmin.email,
            phone: outletAdmin.phone,
            isEmailVerified: outletAdmin.isEmailVerified,
            isActive: outletAdmin.isActive,
          },
          createdBy: superAdminId,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  getMyProfile = async (req, res) => {
    try {
      const outletAdmin = await OutletAdmin.findOne({
        _id: req.user._id,
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      });
      if (!outletAdmin)
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      res.status(200).json({ success: true, data: outletAdmin });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  updateMyProfile = async (req, res) => {
    try {
      const { name, phone } = req.body;

      // Only allow updating name and phone
      const updates: Partial<typeof OutletAdmin.prototype> = {};
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;

      // If email is provided, return an error
      if (req.body.email !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "Email cannot be updated. Only name and phone can be modified.",
        });
      }

      const outletAdmin = await OutletAdmin.findOneAndUpdate(
        {
          _id: req.user._id,
          $or: [
            { isDeleted: { $ne: true } },
            { isDeleted: { $exists: false } },
          ],
        },
        updates,
        { new: true }
      );
      if (!outletAdmin)
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      res.status(200).json({ success: true, data: outletAdmin });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  deleteMyProfile = async (req, res) => {
    try {
      const outletAdmin = await this.outletAdminService.softDeleteOutletAdmin(
        req.user._id
      );
      if (!outletAdmin)
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      res
        .status(200)
        .json({ success: true, message: "Profile soft deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  // Super admin only
  getDeletedOutletAdmins = async (_req: Request, res: Response) => {
    try {
      const deletedOutletAdmins =
        await this.outletAdminService.getDeletedOutletAdmins();
      res.status(200).json({
        success: true,
        data: deletedOutletAdmins,
        message: `Retrieved ${deletedOutletAdmins.length} deleted outlet admins`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  restoreOutletAdmin = async (req: Request, res: Response) => {
    try {
      const { adminId } = req.params;
      const restoredAdmin = await this.outletAdminService.restoreOutletAdmin(
        adminId
      );
      if (!restoredAdmin) {
        return res
          .status(404)
          .json({ success: false, message: "Outlet admin not found" });
      }
      res.status(200).json({
        success: true,
        message: "Outlet admin restored successfully",
        data: { outletAdmin: restoredAdmin },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  softDeleteOutletAdmin = async (req: Request, res: Response) => {
    try {
      const { adminId } = req.params;
      const deletedAdmin = await this.outletAdminService.softDeleteOutletAdmin(
        adminId
      );
      if (!deletedAdmin) {
        return res
          .status(404)
          .json({ success: false, message: "Outlet admin not found" });
      }
      res.status(200).json({
        success: true,
        message: "Outlet admin soft deleted successfully",
        data: { outletAdmin: deletedAdmin },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getAllOutletAdmins = async (req: Request, res: Response) => {
    try {
      const superAdminId = req.query.superAdminId;
      let outletAdmins;
      if (superAdminId) {
        const outlets = await Outlet.find({
          createdBy: superAdminId,
          $or: [
            { isDeleted: { $ne: true } },
            { isDeleted: { $exists: false } },
          ],
        });
        const adminIds = outlets.map((o) => o.assignedAdmin).filter(Boolean);
        outletAdmins = await OutletAdmin.find({
          _id: { $in: adminIds },
          $or: [
            { isDeleted: { $ne: true } },
            { isDeleted: { $exists: false } },
          ],
        });
      } else {
        outletAdmins = await OutletAdmin.find({
          $or: [
            { isDeleted: { $ne: true } },
            { isDeleted: { $exists: false } },
          ],
        });
      }
      res.status(200).json({ success: true, data: outletAdmins });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getMyOutletAdmins = async (req, res) => {
    try {
      const superAdminId = req.user._id;
      const outlets = await Outlet.find({
        createdBy: superAdminId,
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      });
      const adminIds = outlets.map((o) => o.assignedAdmin).filter(Boolean);

      const outletAdmins = await OutletAdmin.find({
        _id: { $in: adminIds },
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      });

      // For each admin, find the outlets assigned to them (created by this super admin)
      const adminsWithOutlets = await Promise.all(
        outletAdmins.map(async (admin) => {
          const assignedOutlets = outlets.filter(
            (o) =>
              o.assignedAdmin &&
              o.assignedAdmin.toString() === admin._id.toString()
          );
          return {
            admin: {
              _id: admin._id,
              name: admin.name,
              email: admin.email,
              phone: admin.phone,
              role: admin.role,
              isActive: admin.isActive,
              isEmailVerified: admin.isEmailVerified,
            },
            outlets: assignedOutlets.map((o) => ({
              _id: o._id,
              businessName: o.businessName,
              address: o.address,
            })),
          };
        })
      );
      res.status(200).json({ success: true, data: adminsWithOutlets });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getDashboardData = async (req, res) => {
    try {
      const outletAdminId = req.user._id;
      const outlet = await Outlet.findOne({ assignedAdmin: outletAdminId });
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "No outlet found for this outlet admin",
        });
      }
      const outletId = outlet._id;
      const now = new Date();
      const year =
        now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(year, 3, 1);

      const totalTxnAgg = await Payment.aggregate([
        {
          $match: {
            outletId: outletId.toString(),
            type: "dine-in",
            status: "completed",
            createdAt: { $gte: fyStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const totalTransactionAmount = totalTxnAgg[0]?.total || 0;

      const activeOfferCount = await Offer.countDocuments({
        outletId: outletId,
        isActive: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
      });

      const totalEmployeesCount = await Staff.countDocuments({
        outlet: outletId,
      });
      const totalDineInSessionCount = await DineInSession.countDocuments({
        outletId: outletId.toString(),
      });

      const monthlyRevenueAgg = await Payment.aggregate([
        {
          $match: {
            outletId: outletId.toString(),
            type: "dine-in",
            status: "completed",
            createdAt: { $gte: fyStart },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: "$createdAt" },
              year: { $year: "$createdAt" },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);
      const monthlyRevenue = monthlyRevenueAgg.map((item) => ({
        month: item._id.month,
        year: item._id.year,
        total: item.total,
      }));

      const recentTransactions = await Payment.find({
        outletId: outletId.toString(),
        type: "dine-in",
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("userId", "name phone")
        .select("amount createdAt userId");

      const outletDetails = {
        _id: outlet._id,
        businessName: outlet.businessName,
        businessType: outlet.businessType,
        address: outlet.address,
        isActive: outlet.isActive,
        createdAt: outlet.createdAt,
      };
      res.json({
        success: true,
        data: {
          totalTransactionAmount,
          activeOfferCount,
          totalEmployeesCount,
          totalDineInSessionCount,
          monthlyRevenue,
          recentTransactions,
          outletDetails,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
