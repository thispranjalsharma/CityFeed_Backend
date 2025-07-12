import { BaseRepository } from './base.repository';
import { OutletAdmin, IOutletAdminDocument } from '../models/outletAdmin.model';

export class OutletAdminRepository extends BaseRepository<IOutletAdminDocument> {
  constructor() {
    super(OutletAdmin);
  }

  async findById(id: string): Promise<IOutletAdminDocument | null> {
    return this.model.findById(id);
  }

  async findByEmail(email: string): Promise<IOutletAdminDocument | null> {
    return this.findOne({ email });
  }

  async findActiveOutletAdmins(): Promise<IOutletAdminDocument[]> {
    return this.find({});
  }

  async findIncludingDeleted(filter: any = {}): Promise<IOutletAdminDocument[]> {
    return this.model.find(filter);
  }

  async findDeleted(filter: any = {}): Promise<IOutletAdminDocument[]> {
    return this.model.find({ ...filter, isDeleted: true });
  }

  async softDelete(id: string): Promise<IOutletAdminDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
      { new: true }
    );
  }

  async restore(id: string): Promise<IOutletAdminDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      { 
        isDeleted: false, 
        deletedAt: undefined 
      },
      { new: true }
    );
  }

  async hardDelete(id: string): Promise<IOutletAdminDocument | null> {
    return this.model.findByIdAndDelete(id);
  }
} 