import { Request, Response } from 'express';
import { OutletService } from '../services/outlet.service';
import cloudinary from '../config/cloudinary';
import { OutletAdmin } from '../models/outletAdmin.model';
import bcryptjs from 'bcryptjs';
import { UserService } from '../services/user.service';
import { OutletRoleAssignmentService } from '../services/outletRoleAssignment.service';
import { Types } from 'mongoose';

const outletService = new OutletService();
const userService = new UserService();
const outletRoleAssignmentService = new OutletRoleAssignmentService();

export const createOutlet = async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).user?._id || (req as any).userId;
    console.log('[DEBUG] Creating outlet with superAdminId:', superAdminId);
    let imageUrls: string[] = [];
    const files = (req as any).files;
    if (files && Array.isArray(files)) {
      const uploadPromises = files.map(async (file: any) => {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'outlets',
          resource_type: 'auto',
        });
        return result.secure_url;
      });
      imageUrls = await Promise.all(uploadPromises);
    }

    // Admin creation/assignment logic
    const { adminEmail, adminPassword, adminPhone } = req.body;
    let assignedAdminId;
    if (adminEmail && adminPassword) {
      let outletAdmin = await OutletAdmin.findOne({ email: adminEmail });
      if (!outletAdmin) {
        outletAdmin = new OutletAdmin({
          name: adminEmail.split('@')[0],
          email: adminEmail,
          password: adminPassword,
          isActive: true,
          isEmailVerified: false,
          role: 'outlet_admin',
          phone: adminPhone,
        });
        await outletAdmin.save();
        // Send verification email to the new outlet admin
        const { OutletAdminService } = require('../services/outletAdmin.service');
        const outletAdminService = new OutletAdminService();
        await outletAdminService.sendVerificationEmail(outletAdmin);
      } else {
        outletAdmin.password = adminPassword;
        await outletAdmin.save();
      }
      assignedAdminId = outletAdmin._id;
    }

    const outlet = await outletService.createOutlet({
      ...req.body,
      images: imageUrls,
      createdBy: superAdminId,
      assignedAdmin: assignedAdminId
    });

    // Populate assignedAdmin details (including role) in the response
    let populatedOutlet = outlet.toObject();
    if (assignedAdminId) {
      const adminDetails = await OutletAdmin.findById(assignedAdminId);
      if (adminDetails) {
        populatedOutlet.assignedAdmin = {
          _id: adminDetails._id,
          name: adminDetails.name,
          email: adminDetails.email,
          phone: adminDetails.phone,
          role: adminDetails.role,
          isActive: adminDetails.isActive,
          isEmailVerified: adminDetails.isEmailVerified
        };
      }
    }

    res.status(201).json({ success: true, message: 'Outlet created successfully', data: { outlet: populatedOutlet } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getOutletsBySuperAdmin = async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).user?._id || (req as any).userId;
    console.log('[DEBUG] Fetching outlets for superAdminId:', superAdminId);
    const outlets = await outletService.getOutletsBySuperAdmin(superAdminId);
    res.status(200).json({ success: true, data: { outlets } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const assignAdmin = async (req: Request, res: Response) => {
  try {
    const { outletId, adminId } = req.body;
    const outlet = await outletService.assignAdmin(outletId, adminId);
    res.status(200).json({ success: true, message: 'Admin assigned successfully', data: { outlet } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const assignRoleToEmployee = async (req: Request, res: Response) => {
  try {
    const outletId = req.params.outletId;
    const { email, password, phone, role, responsibilities, name } = req.body;
    console.log('[DEBUG] assignRoleToEmployee input:', { outletId, email, password, phone, role, responsibilities, name });
    if (!outletId || !email || !password || !phone || !role || !responsibilities) {
      console.log('[DEBUG] Missing required fields');
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Hash password before saving
    const hashedPassword = await bcryptjs.hash(password, 10);
    // Always save role as 'employee'
    const assignment = await outletRoleAssignmentService.assignRoleToOutlet({
      outlet: new Types.ObjectId(outletId),
      role: 'employee',
      responsibilities,
      email,
      password: hashedPassword,
      phone,
      name: name || email.split('@')[0]
    });
    // Send verification email to the employee
    const { EmailService } = require('../services/email.service');
    const { config } = require('../config/config');
    const emailService = new EmailService();
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ _id: assignment._id, email: assignment.email, role: assignment.role }, config.jwtSecret, { expiresIn: '1d' });
    await emailService.sendVerificationEmail(assignment.email, token, 'employee');
    console.log('[DEBUG] assignRoleToOutlet result:', assignment);
    return res.status(201).json({
      success: true,
      message: 'Role assigned successfully. Verification email sent to employee.',
      data: {
        assignment: {
          ...assignment.toObject(),
          isEmailVerified: assignment.isEmailVerified || false
        }
      }
    });
  } catch (error) {
    console.error('[DEBUG] assignRoleToEmployee error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: (error as Error).message });
  }
}; 