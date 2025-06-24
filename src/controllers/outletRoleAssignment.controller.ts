import { Request, Response } from 'express';
import { OutletRoleAssignmentService } from '../services/outletRoleAssignment.service';
import { Types } from 'mongoose';

const outletRoleAssignmentService = new OutletRoleAssignmentService();

export const assignRoleToOutlet = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const { role, responsibilities } = req.body;
    const assignment = await outletRoleAssignmentService.assignRoleToOutlet({
      outlet: new Types.ObjectId(outletId),
      role,
      responsibilities
    });
    res.status(200).json({ success: true, message: 'Role assigned successfully', data: { assignment } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getRolesForOutlet = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const assignments = await outletRoleAssignmentService.getRolesForOutlet(new Types.ObjectId(outletId));
    res.status(200).json({ success: true, data: { assignments } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}; 