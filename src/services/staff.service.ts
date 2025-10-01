import { injectable, inject } from "inversify";
import { Types } from "mongoose";
import { IStaff, Staff } from "../models/staff.model";
// import { IStaff } from "../interfaces/staff.interface";
import { TYPES } from "../types/types"; // Your DI tokens for repositories/services etc.
import { IOutletDocument, Outlet } from "../models/outlet.model";

export interface IStaffService {
  assignRoleToOutlet(data: Partial<IStaff>): Promise<IStaff>;
  updatePasswordAndUnsetFirstLogin(
    id: string,
    newPassword: string
  ): Promise<IStaff | null>;
  findByEmail(email: string): Promise<IStaff | null>;
  existsByEmail(email: string): Promise<boolean>;
  updateStaffResponsibilities(
    staffId: string,
    responsibilities: string[]
  ): Promise<IStaff | null>;
  getMyEmployees(userId: string): Promise<IStaff[]>;
  getMyProfile(id: string): Promise<IStaff | null>;
  updateMyProfile(id: string, data: Partial<IStaff>): Promise<IStaff | null>;
  deleteMyProfile(id: string): Promise<IStaff | null>;
  getById(id: string): Promise<IStaff | null>;
  // getOutletByAdminId(adminId: string): Promise<IStaff[]>;
   getOutletByAdminId(adminId: Types.ObjectId): Promise<IOutletDocument | null>
  getEmployeesByOutletId(outletId: string): Promise<IStaff[]>;
  validateSuperAdminOutletAccess(
    userId: string,
    outletId: string
  ): Promise<boolean>;
  updateResponsibilities(
    staffId: string,
    responsibilities: string[]
  ): Promise<IStaff | null>;

  changeActivation(
    id: string,
    isActive: boolean,
    user?: string
  ): Promise<IStaff | null>;
}

@injectable()
export class StaffService implements IStaffService {
  changeActivation(id: string, isActive: boolean): Promise<IStaff | null> {
    return Staff.findByIdAndUpdate(id, { isActive }, { new: true });
  }

  updateResponsibilities(
    staffId: string,
    responsibilities: string[]
  ): Promise<IStaff | null> {
    return this.updateStaffResponsibilities(staffId, responsibilities);
  }

  validateSuperAdminOutletAccess(
    userId: string,
    outletId: string
  ): Promise<boolean> {
    return Staff.findOne({ createdBy: userId, outlet: outletId });
  }
  getEmployeesByOutletId(outletId: string): Promise<IStaff[]> {
    return Staff.find({ outlet: outletId });
  }

async getOutletByAdminId(adminId: Types.ObjectId): Promise<IOutletDocument | null> {
    return Outlet.findOne({ assignedAdmin: adminId, isDeleted: false });
  }

  getById(id: string): Promise<IStaff | null> {
    return Staff.findById(id);
  }

  deleteMyProfile(id: string): Promise<IStaff | null> {
    return Staff.findByIdAndDelete(id);
  }

  updateMyProfile(id: string, data: Partial<IStaff>): Promise<IStaff | null> {
    return Staff.findByIdAndUpdate(id, data, { new: true });
  }

  getMyProfile(id: string): Promise<IStaff | null> {
    return Staff.findById(id);
  }

  getMyEmployees(userId: string): Promise<IStaff[]> {
    return Staff.find({ createdBy: userId });
  }

  async assignRoleToOutlet(data: Partial<IStaff>): Promise<IStaff> {
    if (!data.email) throw new Error("Email is required");
    if (!data.outlet) throw new Error("Outlet is required");

    const existingUser = await Staff.findOne({ email: data.email });
    if (existingUser) {
      throw new Error(`Employee with email ${data.email} already exists`);
    }

    const existingAssignment = await Staff.findOne({
      email: data.email,
      outlet: data.outlet,
    });
    if (existingAssignment) {
      throw new Error(
        `Employee with email ${data.email} is already assigned to this outlet`
      );
    }

    const staffData: Partial<IStaff> = {
      ...data,
      role: "employee",
      responsibilities: data.responsibilities ?? [],
    };

    const newStaff = new Staff(staffData);
    return await newStaff.save();
  }

  /**
   * Update staff password and mark first login as false
   * @param id Staff document id
   * @param newPassword New password string (hashed externally or raw if hashing is middleware)
   * @returns Updated IStaff or null if not found
   */
  async updatePasswordAndUnsetFirstLogin(
    id: string,
    newPassword: string
  ): Promise<IStaff | null> {
    const staff = await Staff.findById(id);
    if (!staff) return null;

    staff.password = newPassword;
    staff.isFirstLogin = false;
    return await staff.save();
  }

  /**
   * Find a staff by email
   * @param email Staff email string
   * @returns IStaff or null if not found
   */
  async findByEmail(email: string): Promise<IStaff | null> {
    return await Staff.findOne({ email });
  }

  /**
   * Check if a staff with email exists
   * @param email Email string
   * @returns boolean true if exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    const staff = await Staff.findOne({ email });
    return !!staff;
  }

  /**
   * Update responsibilities of a staff member
   * @param staffId Staff's document _id as string
   * @param responsibilities Array of responsibility strings
   * @returns Updated IStaff document or null if not found
   */
  async updateStaffResponsibilities(
    staffId: string,
    responsibilities: string[]
  ): Promise<IStaff | null> {
    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      { responsibilities },
      { new: true }
    );
    return updatedStaff;
  }
}
