import { Outlet } from '../models/outlet.model';
import { IOutlet } from '../interfaces/outlet.interface';
import { Types } from 'mongoose';

export class OutletService {
  async createOutlet(data: Partial<IOutlet>): Promise<IOutlet> {
    const outlet = new Outlet(data);
    return outlet.save();
  }

  async getOutletsBySuperAdmin(superAdminId: Types.ObjectId): Promise<IOutlet[]> {
    return Outlet.find({ createdBy: superAdminId });
  }

  async assignAdmin(outletId: string, adminId: string): Promise<IOutlet | null> {
    return Outlet.findByIdAndUpdate(
      outletId,
      { assignedAdmin: adminId },
      { new: true }
    );
  }
} 