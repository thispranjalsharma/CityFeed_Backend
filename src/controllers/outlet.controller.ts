import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { Outlet } from "../models/outlet.model";
import { OutletAdmin } from "../models/outletAdmin.model";
import { Review } from "../models/review.model";
import { TYPES } from "../types/types";
import { IOutletService } from "../services/outlet.service";
import { IStaffService } from "../services/staff.service";
import { IOfferService } from "../services/offer.service";
import { IOutletAdminService } from "../services/outletAdmin.service";
import cloudinary from "../config/cloudinary";
import { logger } from "../utils/logger.util";
import { Types } from "mongoose";
import { OutletCreateDTO } from "src/dto";

@injectable()
export class OutletController {
  constructor(
    @inject("OutletService") private outletService: IOutletService,
    @inject("StaffService") private staffService: IStaffService,
    @inject("OfferService") private offerService: IOfferService,
    @inject("OutletAdminService")
    private outletAdminService: IOutletAdminService
  ) {}

  getAllOutlets = async (req, res) => {
    try {
      // Check for superAdminId in query or from req.user
      const superAdminId = req.query.superAdminId || req.user?._id;
      let outlets;
      if (superAdminId) {
        outlets = await Outlet.find({ createdBy: superAdminId }).populate(
          "assignedAdmin",
          "name email phone role isActive isEmailVerified"
        );
      } else {
        outlets = await Outlet.find().populate(
          "assignedAdmin",
          "name email phone role isActive isEmailVerified"
        );
      }
      res.status(200).json({ success: true, data: { outlets } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getMyOutlets = async (req: Request, res: Response) => {
    try {
      const outletAdminId = (req as any).user?._id || (req as any).userId;
      const outlet = await Outlet.findOne({
        assignedAdmin: outletAdminId,
      }).populate(
        "assignedAdmin",
        "name email phone role isActive isEmailVerified"
      );
      res.status(200).json({ success: true, data: { outlet } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getPublicOutlets = async (_req: Request, res: Response) => {
    try {
      const outlets = await Outlet.find({
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
      });
      const outletIds = outlets.map((outlet) => outlet._id);
      const ratings = await Review.aggregate([
        { $match: { outletId: { $in: outletIds } } },
        {
          $group: {
            _id: "$outletId",
            avgRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]);
      const ratingMap: Record<
        string,
        { avgRating: number; reviewCount: number }
      > = {};
      ratings.forEach((r) => {
        ratingMap[r._id.toString()] = {
          avgRating: r.avgRating,
          reviewCount: r.reviewCount,
        };
      });
      const outletsWithRating = outlets.map((outlet) => {
        const ratingInfo = ratingMap[outlet._id.toString()] || {
          avgRating: null,
          reviewCount: 0,
        };
        return {
          ...outlet.toObject(),
          avgRating: ratingInfo.avgRating,
          reviewCount: ratingInfo.reviewCount,
        };
      });
      res.status(200).json({ success: true, data: outletsWithRating });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  createOutlet = async (req: Request, res: Response) => {
    try {
      const superAdminId = (req as any).user?._id || (req as any).userId;
      let imageUrls: string[] = [];
      const files = (req as any).files;
      if (files && Array.isArray(files)) {
        const uploadPromises = files.map(async (file: any) => {
          const b64 = Buffer.from(file.buffer).toString("base64");
          const dataURI = `data:${file.mimetype};base64,${b64}`;
          const result = await cloudinary.uploader.upload(dataURI, {
            folder: "outlets",
            resource_type: "auto",
          });
          return result.secure_url;
        });
        imageUrls = await Promise.all(uploadPromises);
      }
      // Admin creation/assignment logic
      const { adminPassword, adminName } = req.body;
      let { adminEmail, adminPhone } = req.body;
      if (adminEmail) adminEmail = adminEmail.toLowerCase();
      if (adminPhone) adminPhone = adminPhone.toLowerCase();

      let assignedAdminId;
      if (adminEmail && adminPassword) {
        let outletAdmin = await OutletAdmin.findOne({ email: adminEmail });
        if (!outletAdmin) {
          const adminDisplayName = adminName || adminEmail.split("@")[0];
          outletAdmin = new OutletAdmin({
            name: adminDisplayName,
            email: adminEmail,
            password: adminPassword,
            isActive: true,
            isEmailVerified: false,
            role: "outlet_admin",
            phone: adminPhone,
          });
          await outletAdmin.save();
          await this.outletAdminService.sendVerificationEmail(outletAdmin);
        } else {
          outletAdmin.password = adminPassword;
          if (adminName) outletAdmin.name = adminName;
          await outletAdmin.save();
        }
        assignedAdminId = outletAdmin._id;
      }
      // Parse and normalize location
      let location = req.body.location;
      if (typeof location === "string") {
        try {
          location = JSON.parse(location);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid location format. Must be a valid GeoJSON string.",
          });
        }
      }
      if (
        location &&
        location.latitude !== undefined &&
        location.longitude !== undefined
      ) {
        location = {
          type: "Point",
          coordinates: [location.longitude, location.latitude],
        };
      } else if (location && Array.isArray(location.coordinates)) {
        if (
          Math.abs(location.coordinates[0]) <= 90 &&
          Math.abs(location.coordinates[1]) <= 180
        ) {
          location.coordinates = [
            location.coordinates[1],
            location.coordinates[0],
          ];
        }
      }
      const outletCreateDTO: OutletCreateDTO = {
        businessName: req.body.businessName,
        businessType: req.body.businessType,
        businessDescription: req.body.businessDescription,
        category: req.body.category,
        address: req.body.address,
        location, // properly normalized above, or undefined
        images: imageUrls.length > 0 ? imageUrls : undefined,
        defaultMaxDiscount: Number(req.body.defaultMaxDiscount),
        createdBy: superAdminId,
        assignedAdmin: assignedAdminId,
        isActive: true,
      };

      const outlet = await this.outletService.createOutlet(outletCreateDTO);

      // Default offer creation
      const createDefaultOffer =
        req.body.createDefaultOffer === "true" ||
        req.body.createDefaultOffer === false;
      if (createDefaultOffer) {
        try {
          const now = new Date();
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

          await this.offerService.createOffer(
            {
              title: req.body.businessName,
              description: "10% off on Dine in",
              discountPercentage: 10,
              validFrom: now,
              validTo: oneYearFromNow,
              isActive: true,
              isDefault: true,
              createdByRole: "super_admin",
              createdByUser: superAdminId,
              // outletId: REMOVE THIS PROPERTY FROM HERE
            },
            outlet._id.toString() // pass outletId here as a string separate argument
          );

          logger.info(
            `Default offer created successfully for outlet: ${outlet._id}`
          );
        } catch (offerError) {
          logger.error(
            `Failed to create default offer for outlet: ${outlet._id}, error:`,
            offerError
          );
        }
      }
      const populatedOutlet = outlet.toObject();
      if (assignedAdminId) {
        const adminDetails = await OutletAdmin.findById(assignedAdminId);
        if (adminDetails) {
          populatedOutlet.assignedAdmin = {
            _id: adminDetails._id,
            name: adminDetails.name,
            email: adminDetails.email,
            phone: adminDetails.phone,
            role: adminDetails.role,
            isActive: adminDetails.isActive,
            isEmailVerified: adminDetails.isEmailVerified,
          };
        }
      }
      if (
        populatedOutlet.location &&
        Array.isArray(populatedOutlet.location.coordinates)
      ) {
        const coords = populatedOutlet.location.coordinates;
        if (coords.length === 2) {
          populatedOutlet.location.coordinates = [coords[1], coords[0]];
        }
      }
      res.status(201).json({
        success: true,
        message: "Outlet created successfully",
        data: { outlet: populatedOutlet },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getOutletsBySuperAdmin = async (req: Request, res: Response) => {
    try {
      const superAdminId = (req as any).user?._id || (req as any).userId;
      const outlets = await this.outletService.getOutletsBySuperAdmin(
        superAdminId
      );
      res.status(200).json({ success: true, data: { outlets } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getOutletById = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const userId = (req as any).user?._id || (req as any).userId;
      const userRole = (req as any).user?.role;
      const outlet = await this.outletService.getOutletByIdWithAdmin(outletId);
      if (!outlet) {
        return res
          .status(404)
          .json({ success: false, message: "Outlet not found" });
      }
      let isAuthorized = false;
      if (userRole === "super_admin") {
        isAuthorized = outlet.createdBy.toString() === userId.toString();
      } else if (userRole === "outlet_admin") {
        let assignedAdminId;
        if (
          outlet.assignedAdmin &&
          typeof outlet.assignedAdmin === "object" &&
          "_id" in outlet.assignedAdmin
        ) {
          assignedAdminId = outlet.assignedAdmin._id.toString();
        } else {
          assignedAdminId = outlet.assignedAdmin?.toString();
        }
        isAuthorized = assignedAdminId && assignedAdminId === userId.toString();
        if (!outlet.assignedAdmin) isAuthorized = false;
      }
      if (!isAuthorized) {
        let debugAssignedAdminId;
        if (
          outlet.assignedAdmin &&
          typeof outlet.assignedAdmin === "object" &&
          "_id" in outlet.assignedAdmin
        ) {
          debugAssignedAdminId = outlet.assignedAdmin._id.toString();
        } else {
          debugAssignedAdminId = outlet.assignedAdmin?.toString();
        }
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this outlet",
          debug: {
            userRole,
            userId: userId?.toString(),
            outletAssignedAdmin: debugAssignedAdminId,
            outletCreatedBy: outlet.createdBy?.toString(),
          },
        });
      }
      res.status(200).json({ success: true, data: { outlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  updateOutlet = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const updatedOutlet = await this.outletService.updateOutlet(
        outletId,
        req.body
      );
      res.status(200).json({ success: true, data: { outlet: updatedOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  deleteOutlet = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const deletedOutlet = await this.outletService.deleteOutlet(outletId);
      res.status(200).json({ success: true, data: { outlet: deletedOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  restoreOutlet = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const restoredOutlet = await this.outletService.restoreOutlet(outletId);
      res.status(200).json({ success: true, data: { outlet: restoredOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  getDeletedOutlets = async (req: Request, res: Response) => {
    try {
      const deletedOutlets = await this.outletService.getDeletedOutlets();
      res
        .status(200)
        .json({ success: true, data: { outlets: deletedOutlets } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
  updateOutletStatus = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const statusString = req.params.status;
      const status = statusString === "true";
      const updatedOutlet = await this.outletService.updateOutletStatus(
        outletId,
        status
      );
      res.status(200).json({ success: true, data: { outlet: updatedOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getOutletsByStatus = async (req: Request, res: Response) => {
    try {
      const statusString = req.params.status;
      const userIdString = (req as any).user?._id || (req as any).userId;

      if (!userIdString) {
        return res
          .status(400)
          .json({ success: false, message: "User ID is required" });
      }

      const superAdminId = new Types.ObjectId(userIdString);

      // Convert status string to boolean
      const status = statusString === "true";

      const outlets = await this.outletService.getOutletsByStatus(
        status,
        superAdminId
      );

      res.status(200).json({ success: true, data: { outlets } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  assignAdmin = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const { adminId } = req.body;
      const assignedOutlet = await this.outletService.assignAdmin(
        outletId,
        adminId
      );
      res.status(200).json({ success: true, data: { outlet: assignedOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  removeAdmin = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const removedOutlet = await this.outletService.removeAdmin(outletId);
      res.status(200).json({ success: true, data: { outlet: removedOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  assignRoleToEmployee = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const { employeeId, role } = req.body;
      const assignedOutlet = await this.outletService.assignRoleToEmployee(
        outletId,
        employeeId,
        role
      );
      res.status(200).json({ success: true, data: { outlet: assignedOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  fixOutletStatus = async (req: Request, res: Response) => {
    try {
      const { outletId } = req.params;
      const fixedOutlet = await this.outletService.fixOutletStatus(outletId);
      res.status(200).json({ success: true, data: { outlet: fixedOutlet } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
