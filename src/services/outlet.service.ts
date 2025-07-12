import { Outlet } from '../models/outlet.model';
import { IOutlet } from '../interfaces/outlet.interface';
import { Types } from 'mongoose';
import { OfferService } from './offer.service';

export class OutletService {
  async createOutlet(data: Partial<IOutlet>): Promise<IOutlet> {
    const outlet = new Outlet(data);
    return outlet.save();
  }

  async getOutletsBySuperAdmin(superAdminId: Types.ObjectId): Promise<IOutlet[]> {
    return Outlet.find({ 
      createdBy: superAdminId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async getOutletById(outletId: string): Promise<IOutlet | null> {
    return Outlet.findOne({ 
      _id: outletId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
  }

  async getOutletByIdWithAdmin(outletId: string): Promise<IOutlet | null> {
    return Outlet.findOne({ 
      _id: outletId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async updateOutlet(outletId: string, updateData: Partial<IOutlet>): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async deleteOutlet(outletId: string): Promise<IOutlet | null> {
    // Soft delete all offers for this outlet
    const offerService = new OfferService();
    await offerService.deleteOffersByOutletId(outletId);
    // Now soft delete the outlet
    return Outlet.findByIdAndUpdate(
      outletId,
      { 
        isDeleted: true, 
        deletedAt: new Date() 
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
    // Hard delete all offers for this outlet
    const offerService = new OfferService();
    await offerService.deleteOffersByOutletId(outletId);
    // Now hard delete the outlet
    return Outlet.findByIdAndDelete(outletId);
  }

  // Restore deleted outlet
  async restoreOutlet(outletId: string): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { 
        isDeleted: false, 
        deletedAt: undefined 
      },
      { new: true }
    ).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  // Get deleted outlets (for admin purposes)
  async getDeletedOutlets(superAdminId?: Types.ObjectId): Promise<IOutlet[]> {
    const filter = superAdminId ? { createdBy: superAdminId } : {};
    return Outlet.find({
      ...filter,
      isDeleted: true
    }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async assignAdmin(outletId: string, adminId: string): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { assignedAdmin: adminId },
      { new: true }
    ).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async removeAdmin(outletId: string): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { $unset: { assignedAdmin: 1 } },
      { new: true }
    ).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async updateOutletStatus(outletId: string, isActive: boolean): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { isActive },
      { new: true }
    ).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async getOutletsByStatus(superAdminId: Types.ObjectId, isActive: boolean): Promise<IOutlet[]> {
    // First, let's see all outlets for this super admin
    const allOutlets = await Outlet.find({ 
      createdBy: superAdminId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    
    // Check for outlets without isActive field and fix them
    const outletsWithoutStatus = allOutlets.filter(o => o.isActive === undefined);
    if (outletsWithoutStatus.length > 0) {
      // Update these outlets to have isActive = true (default behavior)
      const updatePromises = outletsWithoutStatus.map(outlet => 
        Outlet.findByIdAndUpdate(outlet._id, { isActive: true }, { new: true })
      );
      await Promise.all(updatePromises);
    }
    
    // Now get the filtered results
    return Outlet.find({ 
      createdBy: superAdminId, 
      isActive,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async searchOutlets(superAdminId: Types.ObjectId, searchTerm: string): Promise<IOutlet[]> {
    const regex = new RegExp(searchTerm, 'i');
    return Outlet.find({
      createdBy: superAdminId,
      $and: [
        {
          $or: [
            { businessName: regex },
            { businessDescription: regex },
            { address: regex },
            { category: regex }
          ]
        },
        {
          $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
        }
      ]
    }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async fixExistingOutletsWithoutStatus(): Promise<number> {
    // Find all outlets without isActive field
    const outletsWithoutStatus = await Outlet.find({ 
      isActive: { $exists: false },
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    
    if (outletsWithoutStatus.length > 0) {
      // Update all outlets without isActive field to have isActive = true
      const result = await Outlet.updateMany(
        { 
          isActive: { $exists: false },
          $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
        },
        { $set: { isActive: true } }
      );
      return result.modifiedCount;
    }
    
    return 0;
  }
} 