import { Request, Response } from 'express';
import { SuperAdminService } from '../services/superAdmin.service';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { Outlet } from '../models/outlet.model';
import { OutletAdmin } from '../models/outletAdmin.model';
import { Offer } from '../models/offer.model';
import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';

const superAdminService = new SuperAdminService();

export const registerSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    const superAdmin = await superAdminService.createSuperAdmin({ name, email, password, phone });
    // Generate a JWT token for the new super admin
    const token = jwt.sign(
      { _id: superAdmin._id, email: superAdmin.email, role: 'super_admin', type: 'super_admin' },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    res.status(201).json({ success: true, message: 'Super admin registered successfully', data: { superAdmin, token } });
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

export const getAllSuperAdmins = async (req: Request, res: Response) => {
  try {
    const superAdmins = await superAdminService.getAllSuperAdmins();
    res.status(200).json({ success: true, data: superAdmins });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const superAdmin = await superAdminService.findById(req.user._id);
    if (!superAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: superAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const updates = req.body;
    const superAdmin = await superAdminService.updateById(req.user._id, updates);
    if (!superAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: superAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMyProfile = async (req, res) => {
  try {
    const superAdmin = await superAdminService.deleteById(req.user._id);
    if (!superAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const disapproveSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    // Set isApproved to false for super admin
    const superAdmin = await superAdminService.updateById(id, { isApproved: false });
    if (!superAdmin) return res.status(404).json({ success: false, message: 'Super admin not found' });

    // Find all outlets created by this super admin
    const outlets = await Outlet.find({ createdBy: id });
    for (const outlet of outlets) {
      // Store previous active status
      outlet.set('wasActiveBeforeDeactivation', outlet.isActive, { strict: false });
      outlet.isActive = false;
      await outlet.save();
      // Disable assigned outlet admin
      if (outlet.assignedAdmin) {
        const outletAdmin = await OutletAdmin.findById(outlet.assignedAdmin);
        if (outletAdmin) {
          outletAdmin.set('wasActiveBeforeDeactivation', outletAdmin.isActive, { strict: false });
          outletAdmin.isActive = false;
          await outletAdmin.save();
        }
      }
      // Disable offers for this outlet
      await Offer.updateMany({ outlet: outlet._id }, { $set: { isActive: false, wasActiveBeforeDeactivation: true } });
      // Disable employees for this outlet
      await OutletRoleAssignment.updateMany({ outlet: outlet._id }, { $set: { isActive: false, wasActiveBeforeDeactivation: true } });
    }
    res.status(200).json({ success: true, message: 'Super admin disapproved and all related entities deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 