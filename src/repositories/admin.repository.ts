import { Admin, IAdmin, IAdminDocument } from "../models/admin.model";
// import { IAdmin, IAdminDocument } from '../interfaces/admin.interface';
import { Types } from "mongoose";
import { logger } from "../utils/logger.util";

export interface IAdminRepository {
  findByEmail(email: string): Promise<IAdminDocument | null>;
  findByPhone(phone: string): Promise<IAdminDocument | null>;
  create(data: Partial<IAdminDocument>): Promise<IAdminDocument>;
  findById(id: string): Promise<IAdminDocument | null>;
  update(id: string, data: Partial<IAdmin>): Promise<IAdminDocument | null>;
}

export class AdminRepository implements IAdminRepository {
  constructor(private model: typeof Admin) {}

  async update(
    id: string,
    data: Partial<IAdmin>
  ): Promise<IAdminDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async findById(id: string): Promise<IAdminDocument | null> {
    logger.debug("Searching for admin with ID:", id);
    const admin = await this.model.findById(id);
    logger.debug("Database query result:", admin);
    return admin;
  }
  async findByEmail(email: string): Promise<IAdminDocument | null> {
    logger.debug("Searching for admin with email:", email);
    const admin = await this.model.findOne({ email });
    logger.debug("Database query result:", admin);
    return admin;
  }

  async find(): Promise<IAdminDocument[]> {
    return this.model.find();
  }

  async findByPhone(phone: string): Promise<IAdminDocument | null> {
    logger.debug("Searching for admin with phone:", phone);
    const admin = await this.model.findOne({ phone });
    logger.debug("Database query result:", admin);
    return admin;
  }

  async create(data: Partial<IAdminDocument>): Promise<IAdminDocument> {
    const adminData = {
      ...data,
      _id: new Types.ObjectId(),
    };
    return this.model.create(adminData as Partial<IAdminDocument>);
  }
}
