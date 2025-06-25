import { BaseRepository } from './base.repository';
import { Outlet, IOutletDocument } from '../models/outlet.model';

export class OutletRepository extends BaseRepository<IOutletDocument> {
  constructor() {
    super(Outlet);
  }

  async findById(id: string): Promise<IOutletDocument | null> {
    return this.model.findById(id);
  }

  async findByBusinessName(businessName: string): Promise<IOutletDocument | null> {
    return this.findOne({ businessName });
  }

  async findByCategory(category: string): Promise<IOutletDocument[]> {
    return this.find({ category });
  }

  async findActiveOutlets(): Promise<IOutletDocument[]> {
    return this.find({});
  }

  async findByAssignedAdmin(adminId: string): Promise<IOutletDocument[]> {
    return this.find({ assignedAdmin: adminId });
  }
} 