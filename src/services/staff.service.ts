import { Staff } from '../models/staff.model';
import { IStaff } from '../interfaces/staff.interface';
import { Types } from 'mongoose';

export class StaffService {
  async assignRoleToOutlet(data: Partial<IStaff>): Promise<IStaff> {
    // Check if email already exists in any outlet
    const existingStaff = await Staff.findOne({ email: data.email });
    if (existingStaff) {
      throw new Error(`Employee with email ${data.email} already exists`);
    }

    // Check if the same email is already assigned to this specific outlet
    const existingAssignment = await Staff.findOne({ 
      email: data.email, 
      outlet: data.outlet 
    });
    
    if (existingAssignment) {
      throw new Error(`Employee with email ${data.email} is already assigned to this outlet`);
    }

    // Set default role as "employee" and ensure responsibilities are provided
    const staffData = {
      ...data,
      role: 'employee', // Default role for all staff members
      responsibilities: data.responsibilities || [] // Ensure responsibilities array exists
    };

    // Create new staff assignment
    const assignment = new Staff(staffData);
    return await assignment.save();
  }



  async updatePasswordAndUnsetFirstLogin(id: string, newPassword: string): Promise<IStaff | null> {
    const assignment = await Staff.findById(id);
    if (!assignment) return null;
    
    assignment.password = newPassword;
    assignment.isFirstLogin = false;
    return assignment.save();
  }

  async findByEmail(email: string): Promise<IStaff | null> {
    return Staff.findOne({ email });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const staff = await Staff.findOne({ email });
    return !!staff;
  }



  async updateStaffResponsibilities(staffId: string, responsibilities: string[]): Promise<IStaff | null> {
    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { responsibilities },
      { new: true }
    );
    return staff;
  }




} 