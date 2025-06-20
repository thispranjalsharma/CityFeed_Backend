import { Request, Response } from 'express';
import { SuperAdminService } from '../services/superAdmin.service';

const superAdminService = new SuperAdminService();

export const registerSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    const superAdmin = await superAdminService.createSuperAdmin({ name, email, password, phone });
    res.status(201).json({ success: true, message: 'Super admin registered successfully', data: { superAdmin } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const loginSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    if (role !== 'super_admin') {
      return res.status(400).json({ success: false, message: 'Invalid role for this endpoint' });
    }
    const { superAdmin, token } = await superAdminService.login(email, password);
    res.status(200).json({
      success: true,
      message: 'Super admin logged in successfully',
      data: { superAdmin, token }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifySuperAdminEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    const superAdmin = await superAdminService.verifyEmail(token as string);
    res.status(200).json({ success: true, message: 'Email verified successfully', data: { superAdmin } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const approveSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdmin = await superAdminService.approveSuperAdmin(id);
    res.status(200).json({ success: true, message: 'Super admin approved', data: { superAdmin } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}; 