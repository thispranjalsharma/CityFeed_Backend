import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';
import { IOutletRoleAssignment } from '../interfaces/outletRoleAssignment.interface';
import { Types } from 'mongoose';

export class OutletRoleAssignmentService {
  async assignRoleToOutlet(data: Partial<IOutletRoleAssignment>): Promise<IOutletRoleAssignment> {
    // Upsert: if role for outlet and email exists, update; else create
    const assignment = await OutletRoleAssignment.findOneAndUpdate(
      { outlet: data.outlet, role: data.role, email: data.email },
      {
        role: data.role,
        responsibilities: data.responsibilities,
        email: data.email,
        password: data.password,
        phone: data.phone,
        name: data.name,
        isFirstLogin: true
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return assignment;
  }

  async getRolesForOutlet(outletId: Types.ObjectId): Promise<IOutletRoleAssignment[]> {
    return OutletRoleAssignment.find({ outlet: outletId });
  }

  async updatePasswordAndUnsetFirstLogin(id: string, newPassword: string): Promise<IOutletRoleAssignment | null> {
    const assignment = await OutletRoleAssignment.findById(id);
    if (!assignment) return null;
    assignment.password = newPassword;
    assignment.isFirstLogin = false;
    await assignment.save();
    return assignment;
  }
} 