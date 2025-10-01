import { Request, Response, NextFunction } from 'express';
import { Staff } from '../models/staff.model';
import { Types } from 'mongoose';

export const requireResponsibility = (responsibility: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = (req as any).user?.role;
      if (userRole === 'outlet_admin' || userRole === 'super_admin') {
        // Outlet admins and super admins can do any responsibility for their outlet
        return next();
      }
      // Get email from JWT payload (req.user) or request body
      const email = (req as any).user?.email || req.body.email;
      const outletId = req.params.outletId || req.body.outletId;
      if (!email || !outletId) {
        return res.status(400).json({ message: 'User email or outlet not specified' });
      }
      // Ensure outletId is ObjectId
      const outletObjectId = Types.ObjectId.isValid(outletId) ? new Types.ObjectId(outletId) : outletId;
      const query = { email, outlet: outletObjectId, responsibilities: responsibility };
      // Find assignment by email, outlet, and required responsibility
      const assignment = await Staff.findOne(query);
      if (!assignment) {
        // Try to find assignment without responsibility for more info
        const assignmentNoResp = await Staff.findOne({ email, outlet: outletObjectId });
        if (assignmentNoResp) {
        }
      
        return res.status(403).json({ message: 'Permission denied: missing responsibility' });
      }
      (req as any).roleAssignment = assignment;
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
  };
}; 