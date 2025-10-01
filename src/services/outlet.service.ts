import { IOutlet, Outlet } from "../models/outlet.model";
// import { IOutlet } from '../interfaces/outlet.interface';
import { Types } from "mongoose";
import { IOfferService, OfferService } from "./offer.service";
import { OutletAdminRepository } from "../repositories/outletAdmin.repository";
import { inject, injectable } from "inversify";
import { OutletCreateDTO } from "src/dto";

export interface IOutletService {
  createOutlet(data: OutletCreateDTO): Promise<IOutlet>;
  getOutletsBySuperAdmin(superAdminId: Types.ObjectId): Promise<IOutlet[]>;
  getOutletById(outletId: string): Promise<IOutlet | null>;
  getOutletByIdWithAdmin(outletId: string): Promise<IOutlet | null>;
  updateOutlet(
    outletId: string,
    updateData: Partial<IOutlet>
  ): Promise<IOutlet | null>;
  deleteOutlet(outletId: string): Promise<IOutlet | null>;
  hardDeleteOutlet(outletId: string): Promise<IOutlet | null>;

  restoreOutlet(outletId: string): Promise<IOutlet | null>;
  getDeletedOutlets(superAdminId?: Types.ObjectId): Promise<IOutlet[]>;
  updateOutletStatus(
    outletId: string,
    isActive: boolean
  ): Promise<IOutlet | null>;
  assignAdmin(outletId: string, adminId: string): Promise<IOutlet | null>;
  removeAdmin(outletId: string): Promise<IOutlet | null>;
  searchOutlets(
    superAdminId: Types.ObjectId,
    searchTerm: string
  ): Promise<IOutlet[]>;
  fixExistingOutletsWithoutStatus(): Promise<number>;
  getOutletsByStatus(
    isActive: boolean,
    superAdminId: Types.ObjectId
  ): Promise<IOutlet[]>;
  assignRoleToEmployee(
    outletId: string,
    employeeId: string,
    role: "manager" | "staff"
  ): Promise<IOutlet | null>;
  // softDeleteOutlet(outletId: string): Promise<IOutlet | null>;
  fixOutletStatus(outletId: string): Promise<IOutlet | null>;
}

@injectable()
export class OutletService implements IOutletService {
  constructor(
    @inject("OfferService") private offerService: IOfferService,
    @inject("OutletAdminRepository")
    private outletAdminRepository: OutletAdminRepository
  ) {}

  assignRoleToEmployee(
    outletId: string,
    employeeId: string,
    role: "manager" | "staff"
  ): Promise<IOutlet | null> {
    const updateData: Partial<IOutlet> = {};
    if (role === "manager") {
      updateData.manager = employeeId;
    } else if (role === "staff") {
      updateData.staff = employeeId;
    } else {
      throw new Error("Invalid role. Must be 'manager' or 'staff'.");
    }
    return Outlet.findByIdAndUpdate(outletId, updateData, {
      new: true,
    }).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  fixOutletStatus(outletId: string): Promise<IOutlet | null> {
    return this.updateOutletStatus(outletId, true);
  }

  async createOutlet(data: OutletCreateDTO): Promise<IOutlet> {
    const outlet = new Outlet(data);
    return outlet.save();
  }

  async getOutletsBySuperAdmin(
    superAdminId: Types.ObjectId
  ): Promise<IOutlet[]> {
    return Outlet.find({
      createdBy: superAdminId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    }).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async getOutletById(outletId: string): Promise<IOutlet | null> {
    return Outlet.findOne({
      _id: outletId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    });
  }

  async getOutletByIdWithAdmin(outletId: string): Promise<IOutlet | null> {
    return Outlet.findOne({
      _id: outletId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    }).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async updateOutlet(
    outletId: string,
    updateData: Partial<IOutlet>
  ): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(outletId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async deleteOutlet(outletId: string): Promise<IOutlet | null> {
    // Get the outlet to find the assigned admin
    const outlet = await Outlet.findById(outletId);
    if (!outlet) {
      return null;
    }

    // Soft delete all offers for this outlet
    // const  = new OfferService();
    await this.offerService.deleteOffersByOutletId(outletId);

    // Soft delete the associated outlet admin if exists
    if (outlet.assignedAdmin) {
      await this.outletAdminRepository.softDelete(
        outlet.assignedAdmin.toString()
      );
    }

    // Now soft delete the outlet
    return Outlet.findByIdAndUpdate(
      outletId,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );
  }

  // Soft delete method (alias for deleteOutlet)
  async softDeleteOutlet(outletId: string): Promise<IOutlet | null> {
    return this.deleteOutlet(outletId);
  }

  // Hard delete method (use with caution)
  async hardDeleteOutlet(outletId: string): Promise<IOutlet | null> {
    // Get the outlet to find the assigned admin
    const outlet = await Outlet.findById(outletId);
    if (!outlet) {
      return null;
    }

    // Hard delete all offers for this outlet
    // const offerService = new OfferService();
    await this.offerService.deleteOffersByOutletId(outletId);

    // Hard delete the associated outlet admin if exists
    if (outlet.assignedAdmin) {
      await this.outletAdminRepository.hardDelete(
        outlet.assignedAdmin.toString()
      );
    }

    // Now hard delete the outlet
    return Outlet.findByIdAndDelete(outletId);
  }

  // Restore deleted outlet
  async restoreOutlet(outletId: string): Promise<IOutlet | null> {
    // Get the outlet to find the assigned admin
    const outlet = await Outlet.findById(outletId);
    if (!outlet) {
      return null;
    }

    // Restore the associated outlet admin if exists
    if (outlet.assignedAdmin) {
      await this.outletAdminRepository.restore(outlet.assignedAdmin.toString());
    }

    return Outlet.findByIdAndUpdate(
      outletId,
      {
        isDeleted: false,
        deletedAt: undefined,
      },
      { new: true }
    ).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  // Get deleted outlets (for admin purposes)
  async getDeletedOutlets(superAdminId?: Types.ObjectId): Promise<IOutlet[]> {
    const filter = superAdminId ? { createdBy: superAdminId } : {};
    return Outlet.find({
      ...filter,
      isDeleted: true,
    }).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async assignAdmin(
    outletId: string,
    adminId: string
  ): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { assignedAdmin: adminId },
      { new: true }
    ).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async removeAdmin(outletId: string): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { $unset: { assignedAdmin: 1 } },
      { new: true }
    ).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async updateOutletStatus(
    outletId: string,
    isActive: boolean
  ): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { isActive },
      { new: true }
    ).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async getOutletsByStatus(
    isActive: boolean,
    superAdminId: Types.ObjectId
  ): Promise<IOutlet[]> {
    // First, let's see all outlets for this super admin
    const allOutlets = await Outlet.find({
      createdBy: superAdminId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    });

    // Check for outlets without isActive field and fix them
    const outletsWithoutStatus = allOutlets.filter(
      (o) => o.isActive === undefined
    );
    if (outletsWithoutStatus.length > 0) {
      // Update these outlets to have isActive = true (default behavior)
      const updatePromises = outletsWithoutStatus.map((outlet) =>
        Outlet.findByIdAndUpdate(outlet._id, { isActive: true }, { new: true })
      );
      await Promise.all(updatePromises);
    }

    // Now get the filtered results
    return Outlet.find({
      createdBy: superAdminId,
      isActive,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    }).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async searchOutlets(
    superAdminId: Types.ObjectId,
    searchTerm: string
  ): Promise<IOutlet[]> {
    const regex = new RegExp(searchTerm, "i");
    return Outlet.find({
      createdBy: superAdminId,
      $and: [
        {
          $or: [
            { businessName: regex },
            { businessDescription: regex },
            { address: regex },
            { category: regex },
          ],
        },
        {
          $or: [
            { isDeleted: { $ne: true } },
            { isDeleted: { $exists: false } },
          ],
        },
      ],
    }).populate(
      "assignedAdmin",
      "name email phone role isActive isEmailVerified"
    );
  }

  async fixExistingOutletsWithoutStatus(): Promise<number> {
    // Find all outlets without isActive field
    const outletsWithoutStatus = await Outlet.find({
      isActive: { $exists: false },
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    });

    if (outletsWithoutStatus.length > 0) {
      // Update all outlets without isActive field to have isActive = true
      const result = await Outlet.updateMany(
        {
          isActive: { $exists: false },
          $or: [
            { isDeleted: { $ne: true } },
            { isDeleted: { $exists: false } },
          ],
        },
        { $set: { isActive: true } }
      );
      return result.modifiedCount;
    }

    return 0;
  }
}
