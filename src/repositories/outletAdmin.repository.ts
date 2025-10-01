// import { BaseRepository } from "./base.repository";
import { OutletAdmin, IOutletAdminDocument } from "../models/outletAdmin.model";
import { inject, injectable } from "inversify";

export interface IOutletAdminRepository {
  findById(id: string): Promise<IOutletAdminDocument | null>;
  findByEmail(email: string): Promise<IOutletAdminDocument | null>;
  findByPhone(phone: string): Promise<IOutletAdminDocument | null>;
  findActiveOutletAdmins(): Promise<IOutletAdminDocument[]>;
  findIncludingDeleted(filter: any): Promise<IOutletAdminDocument[]>;
  findDeleted(filter: any): Promise<IOutletAdminDocument[]>;
  softDelete(id: string): Promise<IOutletAdminDocument | null>;
  hardDelete(id: string): Promise<IOutletAdminDocument | null>;
}
@injectable()
export class OutletAdminRepository {
  constructor(@inject("OutletAdmin") private model: typeof OutletAdmin) {}

  async findById(id: string): Promise<IOutletAdminDocument | null> {
    return this.model.findById(id);
  }

  async findByEmail(email: string): Promise<IOutletAdminDocument | null> {
    return this.model.findOne({ email });
  }

  async findByPhone(phone: string): Promise<IOutletAdminDocument | null> {
    return this.model.findOne({ phone });
  }

  async findActiveOutletAdmins(): Promise<IOutletAdminDocument[]> {
    return this.model.find({});
  }

  async findIncludingDeleted(
    filter: any = {}
  ): Promise<IOutletAdminDocument[]> {
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
        deletedAt: new Date(),
      },
      { new: true }
    );
  }

  async restore(id: string): Promise<IOutletAdminDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: undefined,
      },
      { new: true }
    );
  }

  async hardDelete(id: string): Promise<IOutletAdminDocument | null> {
    return this.model.findByIdAndDelete(id);
  }
}
