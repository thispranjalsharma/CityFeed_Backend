import { injectable, inject } from "inversify";
import { Request, Response } from "express";
import { TYPES } from "../types/types";
// import { IStaffService } from "../interfaces/services/staff.service.interface";
import { AuthRequest } from "../interfaces/auth.interface";
import { Staff } from "../models/staff.model";
import { IStaffService } from "../services/staff.service";
import { Types } from "mongoose";

@injectable()
export class StaffController {
  constructor(@inject("StaffService") private staffService: IStaffService) {}

  getAllEmployees = async (req, res) => {
    try {
      const employees = await Staff.find({ isDeleted: { $ne: true } });
      res.status(200).json({ success: true, data: employees });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Failed to get employees" });
    }
  };

  getMyEmployeesForSuperAdmin = async (req, res) => {
    try {
      const superAdminId = req.user._id;

      // First, get all outlets created by this super admin
      const { Outlet } = await import("../models/outlet.model");
      const outlets = await Outlet.find({
        createdBy: superAdminId,
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      }).select("_id businessName address");

      if (!outlets || outlets.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            outlets: [],
            employees: [],
            totalEmployees: 0,
            message: "No outlets found for this super admin",
          },
        });
      }

      const outletIds = outlets.map((outlet) => outlet._id);

      // Get all employees for these outlets
      const employees = await Staff.find({
        outlet: { $in: outletIds },
        isDeleted: { $ne: true },
      }).populate("outlet", "name address");

      // Group employees by outlet
      const employeesByOutlet = {};
      outlets.forEach((outlet) => {
        employeesByOutlet[outlet._id.toString()] = {
          outlet: {
            _id: outlet._id,
            name: outlet.businessName,
            address: outlet.address,
          },
          employees: [],
        };
      });

      employees.forEach((employee) => {
        const outletId = employee.outlet._id.toString();
        if (employeesByOutlet[outletId]) {
          employeesByOutlet[outletId].employees.push({
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            role: employee.role,
            responsibilities: employee.responsibilities,
            isEmailVerified: employee.isEmailVerified,
            isFirstLogin: employee.isFirstLogin,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt,
          });
        }
      });

      const totalEmployees = employees.length;

      res.status(200).json({
        success: true,
        data: {
          outlets: Object.values(employeesByOutlet),
          totalEmployees,
          message: `Retrieved ${totalEmployees} employees from ${outlets.length} outlets`,
        },
      });
    } catch (error) {
      console.error("Error in getMyEmployeesForSuperAdmin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get employees for super admin outlets",
      });
    }
  };

  getMyEmployees = async (
    req: AuthRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const staff = await this.staffService.getMyEmployees(req.user._id);
      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
  getMyProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const staff = await this.staffService.getMyProfile(req.user._id);
      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  updateMyProfile = async (
    req: AuthRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const staff = await this.staffService.updateMyProfile(
        req.user._id,
        req.body
      );
      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  deleteMyProfile = async (
    req: AuthRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const staff = await this.staffService.deleteMyProfile(req.user._id);
      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  assignRoleToOutlet = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const assignment = await this.staffService.assignRoleToOutlet(req.body);

      // Generate token and send email omitted here for brevity (handle inside service)

      return res.status(201).json({
        success: true,
        data: assignment,
        message:
          "Employee assigned successfully with flexible responsibilities.",
      });
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ success: false, message: error.message });
      }
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: `Validation error: ${error.message}`,
        });
      }
      return res.status(500).json({
        success: false,
        message: `Failed to assign employee: ${error.message}`,
      });
    }
  };

  getAvailableResponsibilities = async (
    _req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const responsibilities = [
        // List responsibilities as per original code
        "create_offer",
        "update_offer",
        "delete_offer",
        "view_offer",
        "create_order",
        "update_order",
        "delete_order",
        "view_order",
        "view_feedback",
        "respond_feedback",
        "handle_complaints",
        "manage_customers",
        "initiate_payment",
        "refund_payment",
        "view_payment",
        "view_outlet",
        "update_outlet",
        "manage_employees",
        "create_dinein_session",
        "close_dinein_session",
        "view_dinein_session",
        "manage_reservations",
        "assign_roles",
        "view_dashboard",
        "view_reports",
        "generate_reports",
        "view_analytics",
        "manage_inventory",
        "manage_menu",
        "manage_suppliers",
        "manage_promotions",
        "view_financial_data",
      ];
      return res.status(200).json({ success: true, data: responsibilities });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to get responsibilities: ${error.message}`,
      });
    }
  };

  getStaffById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const staff = await this.staffService.getById(req.params.staffId);
      if (!staff)
        return res
          .status(404)
          .json({ success: false, message: "Staff member not found" });
      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to get staff member: ${error.message}`,
      });
    }
  };

  getEmployees = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const user = req.user;
      if (user?.role !== "outlet_admin") {
        return res.status(403).json({
          success: false,
          message: "Only outlet admins can view their employees",
        });
      }

      // getOutletByAdminId now returns a single outlet
      const outlet = await this.staffService.getOutletByAdminId(
        new Types.ObjectId(user._id)
      );
      if (!outlet) {
        return res
          .status(404)
          .json({ success: false, message: "No outlet found for this admin" });
      }

      const employees = await this.staffService.getEmployeesByOutletId(
        outlet._id.toString()
      );
      return res.status(200).json({
        success: true,
        data: {
          outlet: {
            _id: outlet._id,
            name: outlet.businessName,
            address: outlet.address,
          },
          employees,
          totalEmployees: employees?.length ?? 0,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to get employees: ${error.message}`,
      });
    }
  };

  getEmployeesForOutletBySuperAdmin = async (
    req: AuthRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const user = req.user;
      if (user?.role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Only super admins can access this endpoint",
        });
      }

      const outletId = req.query.outletId as string;
      if (!outletId)
        return res
          .status(400)
          .json({ success: false, message: "Outlet ID is required" });

      const isAuthorized =
        await this.staffService.validateSuperAdminOutletAccess(
          user._id,
          outletId
        );
      if (!isAuthorized)
        return res.status(403).json({
          success: false,
          message: "Unauthorized to access this outlet",
        });

      const employees = await this.staffService.getEmployeesByOutletId(
        outletId
      );
      return res.status(200).json({
        success: true,
        data: { outletId, employees, totalEmployees: employees.length },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to get employees: ${error.message}`,
      });
    }
  };

  updateStaffResponsibilities = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const { staffId } = req.params;
      const { responsibilities } = req.body;
      if (!Array.isArray(responsibilities)) {
        return res.status(400).json({
          success: false,
          message: "Responsibilities must be an array",
        });
      }
      const updatedStaff = await this.staffService.updateResponsibilities(
        staffId,
        responsibilities
      );
      if (!updatedStaff)
        return res
          .status(404)
          .json({ success: false, message: "Staff not found" });
      return res.status(200).json({ success: true, data: updatedStaff });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to update responsibilities: ${error.message}`,
      });
    }
  };

  activateStaff = async (
    req: AuthRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const user = req.user;
      const staffId = req.params.staffId;
      if (!user || !["super_admin", "outlet_admin"].includes(user.role)) {
        return res
          .status(403)
          .json({ success: false, message: "Unauthorized" });
      }

      const updatedStaff = await this.staffService.changeActivation(
        staffId,
        true,
        user.id.toString()
      );
      if (!updatedStaff)
        return res
          .status(404)
          .json({ success: false, message: "Staff not found" });

      return res.status(200).json({
        success: true,
        message: "Staff activated",
        data: updatedStaff,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to activate staff: ${error.message}`,
      });
    }
  };

  deactivateStaff = async (
    req: AuthRequest,
    res: Response
  ): Promise<Response> => {
    try {
      const user = req.user;
      const staffId = req.params.staffId;
      if (!user || !["super_admin", "outlet_admin"].includes(user.role)) {
        return res
          .status(403)
          .json({ success: false, message: "Unauthorized" });
      }

      const updatedStaff = await this.staffService.changeActivation(
        staffId,
        false,
        user.id.toString()
      );
      if (!updatedStaff)
        return res
          .status(404)
          .json({ success: false, message: "Staff not found" });

      return res.status(200).json({
        success: true,
        message: "Staff deactivated",
        data: updatedStaff,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to deactivate staff: ${error.message}`,
      });
    }
  };
}
