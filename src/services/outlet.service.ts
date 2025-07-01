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
    return Outlet.find({ createdBy: superAdminId }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async getOutletById(outletId: string): Promise<IOutlet | null> {
    return Outlet.findById(outletId);
  }

  async getOutletByIdWithAdmin(outletId: string): Promise<IOutlet | null> {
    return Outlet.findById(outletId).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async updateOutlet(outletId: string, updateData: Partial<IOutlet>): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async deleteOutlet(outletId: string): Promise<IOutlet | null> {
    // Delete all offers for this outlet
    const offerService = new OfferService();
    await offerService.deleteOffersByOutletId(outletId);
    // Now delete the outlet
    return Outlet.findByIdAndDelete(outletId);
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
    const allOutlets = await Outlet.find({ createdBy: superAdminId });
    
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
    return Outlet.find({ createdBy: superAdminId, isActive }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async searchOutlets(superAdminId: Types.ObjectId, searchTerm: string): Promise<IOutlet[]> {
    const regex = new RegExp(searchTerm, 'i');
    return Outlet.find({
      createdBy: superAdminId,
      $or: [
        { businessName: regex },
        { businessDescription: regex },
        { address: regex },
        { category: regex }
      ]
    }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
  }

  async fixExistingOutletsWithoutStatus(): Promise<number> {
    // Find all outlets without isActive field
    const outletsWithoutStatus = await Outlet.find({ isActive: { $exists: false } });
    
    if (outletsWithoutStatus.length > 0) {
      // Update all outlets without isActive field to have isActive = true
      const result = await Outlet.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
      );
      return result.modifiedCount;
    }
    
    return 0;
  }
} 