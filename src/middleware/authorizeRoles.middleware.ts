import { Request, Response, NextFunction } from 'express';

export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = (req as any).user?.role;
      
      if (!userRole) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized: No user role found' 
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Insufficient permissions. Only super admin, outlet admin, and employee can access this endpoint.' 
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: (error as Error).message 
      });
    }
  };
}; 