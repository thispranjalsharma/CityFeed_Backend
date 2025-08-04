import { Request, Response } from 'express';
import { SuperAdminService } from '../services/superAdmin.service';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { Outlet } from '../models/outlet.model';
import { OutletAdmin } from '../models/outletAdmin.model';
import { Offer } from '../models/offer.model';
import { Staff } from '../models/staff.model';
import { Payment } from '../models/payment.model';
import { DineInSession } from '../models/dineInSession.model';
import { SuperAdmin } from '../models/superAdmin.model';

const superAdminService = new SuperAdminService();

export const registerSuperAdmin = async (req: Request, res: Response) => {
  try {
    let { name, email, password, phone } = req.body;
    // Normalize email and name to lowercase
    email = email?.toLowerCase();
    name = name?.toLowerCase();
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
    
    // Add type field to each super admin in the response
    const superAdminsWithType = superAdmins.map(superAdmin => ({
      ...superAdmin.toObject(),
      type: 'restaurant/cafe' // You can change this to 'cafe' or make it dynamic based on your logic
    }));
    
    res.status(200).json({ success: true, data: superAdminsWithType });
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
    const { name, phone } = req.body;
    
    // Only allow updating name and phone
    const updates: Partial<typeof SuperAdmin.prototype> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    
    // If email is provided, return an error
    if (req.body.email !== undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email cannot be updated. Only name and phone can be modified.' 
      });
    }
    
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
      await Staff.updateMany({ outlet: outlet._id }, { $set: { isActive: false, wasActiveBeforeDeactivation: true } });
    }
    res.status(200).json({ success: true, message: 'Super admin disapproved and all related entities deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const superAdminId = req.user._id;
    // 1. Get all outlet IDs for this superadmin
    const outlets = await Outlet.find({ createdBy: superAdminId }, '_id');
    const outletIds = outlets.map(o => o._id);

    // 2. Calculate financial year start (April 1st)
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(year, 3, 1);

    // 3. Total transaction amount (current FY)
    const totalTxnAgg = await Payment.aggregate([
      { $match: { outletId: { $in: outletIds.map(id => id.toString()) }, type: 'dine-in', status: 'completed', createdAt: { $gte: fyStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalTransactionAmount = totalTxnAgg[0]?.total || 0;

    // 4. Active offer count
    const activeOfferCount = await Offer.countDocuments({
      outletId: { $in: outletIds },
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    });

    // 5. Outlet count
    const totalOutletCount = outletIds.length;

    // 6. Employee count
    const totalEmployeesCount = await Staff.countDocuments({ outlet: { $in: outletIds } });

    // 7. Dine-in session count
    const totalDineInSessionCount = await DineInSession.countDocuments({ outletId: { $in: outletIds } });

    // 8. Monthly revenue (current FY)
    const monthlyRevenueAgg = await Payment.aggregate([
      { $match: { outletId: { $in: outletIds.map(id => id.toString()) }, type: 'dine-in', status: 'completed', createdAt: { $gte: fyStart } } },
      { $group: {
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        total: { $sum: '$amount' }
      } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const monthlyRevenue = monthlyRevenueAgg.map(item => ({
      month: item._id.month,
      year: item._id.year,
      total: item.total
    }));

    res.json({
      totalTransactionAmount,
      activeOfferCount,
      totalOutletCount,
      totalEmployeesCount,
      totalDineInSessionCount,
      monthlyRevenue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 