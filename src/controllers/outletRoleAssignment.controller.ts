import { Request, Response } from 'express';
import { OutletRoleAssignmentService } from '../services/outletRoleAssignment.service';
import { Types } from 'mongoose';
import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';
import { Outlet } from '../models/outlet.model';

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

export const getAllEmployees = async (req, res) => {
  try {
    const employees = await OutletRoleAssignment.find({ isDeleted: { $ne: true } });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyEmployees = async (req, res) => {
  try {
    const superAdminId = req.user._id;
    // Find all outlets created by this super admin
    const outlets = await Outlet.find({ createdBy: superAdminId });
    const outletIds = outlets.map(o => o._id);
    const employees = await OutletRoleAssignment.find({ outlet: { $in: outletIds }, isDeleted: { $ne: true } });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyEmployeesForOutletAdmin = async (req, res) => {
  try {
    const outletAdminId = req.user._id;
    const outlet = await Outlet.findOne({ assignedAdmin: outletAdminId });
    if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found for this admin' });
    const employees = await OutletRoleAssignment.find({ outlet: outlet._id, isDeleted: { $ne: true } });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const employee = await OutletRoleAssignment.findById(req.user._id);
    if (!employee) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const updates = req.body;
    const employee = await OutletRoleAssignment.findByIdAndUpdate(req.user._id, updates, { new: true });
    if (!employee) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMyProfile = async (req, res) => {
  try {
    const employee = await OutletRoleAssignment.findByIdAndUpdate(
      req.user._id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!employee) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, message: 'Profile soft deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 