import { Request, Response, NextFunction } from 'express';
import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';
import { Types } from 'mongoose';

export const requireResponsibility = (responsibility: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get email from JWT payload (req.user) or request body
      const email = (req as any).user?.email || req.body.email;
      const outletId = req.params.outletId || req.body.outletId;
      if (!email || !outletId) {
        console.log('[DEBUG] Missing email or outletId', { email, outletId });
        return res.status(400).json({ message: 'User email or outlet not specified' });
      }
      // Ensure outletId is ObjectId
      const outletObjectId = Types.ObjectId.isValid(outletId) ? new Types.ObjectId(outletId) : outletId;
      const query = { email, outlet: outletObjectId, responsibilities: responsibility };
      console.log('[DEBUG] requireResponsibility query:', query);
      // Find assignment by email, outlet, and required responsibility
      const assignment = await OutletRoleAssignment.findOne(query);
      console.log('[DEBUG] Found assignment:', assignment);
      if (!assignment) {
        // Try to find assignment without responsibility for more info
        const assignmentNoResp = await OutletRoleAssignment.findOne({ email, outlet: outletObjectId });
        if (assignmentNoResp) {
          console.log('[DEBUG] Assignment found but missing responsibility. Responsibilities:', assignmentNoResp.responsibilities);
        } else {
          console.log('[DEBUG] No assignment found for email and outlet.');
        }
        return res.status(403).json({ message: 'Permission denied: missing responsibility' });
      }
      (req as any).roleAssignment = assignment;
      next();
    } catch (error) {
      console.error('[DEBUG] requireResponsibility error:', error);
      return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
  };
}; 