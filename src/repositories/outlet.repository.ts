import { Outlet, IOutletDocument } from "../models/outlet.model";
import { inject } from "inversify";

export interface IOutletRepository {
  findById(id: string): Promise<IOutletDocument | null>;
  findByBusinessName(businessName: string): Promise<IOutletDocument | null>;
  findByCategory(category: string): Promise<IOutletDocument[]>;
  findActiveOutlets(): Promise<IOutletDocument[]>;
  findByAssignedAdmin(adminId: string): Promise<IOutletDocument[]>;
  find(filter: object): Promise<IOutletDocument[]>;
}

export class OutletRepository implements IOutletRepository {
  constructor(@inject("OutletModel") private outletModel: typeof Outlet) {}

  async find(filter: object): Promise<IOutletDocument[]> {
    return this.outletModel.find(filter);
  }

  async findById(id: string): Promise<IOutletDocument | null> {
    return this.outletModel.findById(id);
  }

  async findByBusinessName(
    businessName: string
  ): Promise<IOutletDocument | null> {
    return this.outletModel.findOne({ businessName });
  }

  async findByCategory(category: string): Promise<IOutletDocument[]> {
    return this.outletModel.find({ category });
  }

  async findActiveOutlets(): Promise<IOutletDocument[]> {
    return this.outletModel.find({});
  }

  async findByAssignedAdmin(adminId: string): Promise<IOutletDocument[]> {
    return this.outletModel.find({ assignedAdmin: adminId });
  }
}
