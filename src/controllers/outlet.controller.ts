import { Request, Response } from 'express';
import { OutletService } from '../services/outlet.service';
import cloudinary from '../config/cloudinary';
import { OutletAdmin } from '../models/outletAdmin.model';
import bcryptjs from 'bcryptjs';
import { OutletRoleAssignmentService } from '../services/outletRoleAssignment.service';
import { Types } from 'mongoose';
import { OutletAdminService } from '../services/outletAdmin.service';
import { EmailService } from '../services/email.service';
import { generateToken } from '../utils/jwt.util';

const outletService = new OutletService();
const outletRoleAssignmentService = new OutletRoleAssignmentService();

export const createOutlet = async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).user?._id || (req as any).userId;
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
      assignedAdmin: assignedAdminId,
      isActive: true
    });

    // Populate assignedAdmin details (including role) in the response
    const populatedOutlet = outlet.toObject();
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
    const outlets = await outletService.getOutletsBySuperAdmin(superAdminId);
    res.status(200).json({ success: true, data: { outlets } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getOutletById = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    const outlet = await outletService.getOutletByIdWithAdmin(outletId);
    
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    // Check if the outlet belongs to the super admin
    if (outlet.createdBy.toString() !== superAdminId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this outlet' });
    }

    res.status(200).json({ success: true, data: { outlet } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateOutlet = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    // Check if outlet exists and belongs to super admin
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    if (existingOutlet.createdBy.toString() !== superAdminId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this outlet' });
    }

    let imageUrls: string[] = [];
    const files = (req as any).files;
    
    // Handle image uploads if provided
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

    // Prepare update data - only include fields that are actually provided
    const updateData: any = {};
    
    // Only add fields that are provided and not empty strings
    if (req.body.businessName !== undefined && req.body.businessName !== '') {
      updateData.businessName = req.body.businessName;
    }
    if (req.body.businessType !== undefined && req.body.businessType !== '') {
      updateData.businessType = req.body.businessType;
    }
    if (req.body.businessDescription !== undefined && req.body.businessDescription !== '') {
      updateData.businessDescription = req.body.businessDescription;
    }
    if (req.body.category !== undefined && req.body.category !== '') {
      updateData.category = req.body.category;
    }
    if (req.body.address !== undefined && req.body.address !== '') {
      updateData.address = req.body.address;
    }
    if (req.body.location !== undefined && req.body.location !== '') {
      updateData.location = req.body.location;
    }
    if (req.body.defaultMaxDiscount !== undefined && req.body.defaultMaxDiscount !== '') {
      const num = Number(req.body.defaultMaxDiscount);
      if (isNaN(num) || num < 0 || num > 100) {
        return res.status(400).json({ 
          success: false, 
          message: 'defaultMaxDiscount must be a number between 0 and 100' 
        });
      }
      updateData.defaultMaxDiscount = num;
    }
    
    if (imageUrls.length > 0) {
      updateData.images = imageUrls;
    }

    // Handle admin assignment if provided
    const { adminEmail, adminPassword, adminPhone } = req.body;
    if (adminEmail && adminEmail.trim() !== '' && adminPassword) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        return res.status(400).json({ 
          success: false, 
          message: 'adminEmail must be a valid email address' 
        });
      }

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
        const outletAdminService = new OutletAdminService();
        await outletAdminService.sendVerificationEmail(outletAdmin);
      } else {
        outletAdmin.password = adminPassword;
        await outletAdmin.save();
      }
      updateData.assignedAdmin = outletAdmin._id;
    }

    const updatedOutlet = await outletService.updateOutlet(outletId, updateData);
    
    if (!updatedOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    // Populate assignedAdmin details
    const populatedOutlet = await outletService.getOutletByIdWithAdmin(outletId);

    res.status(200).json({ success: true, message: 'Outlet updated successfully', data: { outlet: populatedOutlet } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteOutlet = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    // Check if outlet exists and belongs to super admin
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    if (existingOutlet.createdBy.toString() !== superAdminId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this outlet' });
    }

    const deletedOutlet = await outletService.deleteOutlet(outletId);
    
    if (!deletedOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    res.status(200).json({ success: true, message: 'Outlet deleted successfully', data: { outlet: deletedOutlet } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateOutletStatus = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const { isActive } = req.body;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    // Check if outlet exists and belongs to super admin
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    if (existingOutlet.createdBy.toString() !== superAdminId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this outlet' });
    }

    const updatedOutlet = await outletService.updateOutletStatus(outletId, isActive);
    
    if (!updatedOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Outlet ${isActive ? 'activated' : 'deactivated'} successfully`, 
      data: { outlet: updatedOutlet } 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getOutletsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    const isActive = status === 'active';
    const outlets = await outletService.getOutletsByStatus(superAdminId, isActive);
    
    res.status(200).json({ 
      success: true, 
      data: { outlets },
      message: `Retrieved ${outlets.length} ${status} outlets`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const searchOutlets = async (req: Request, res: Response) => {
  try {
    const { searchTerm } = req.query;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ success: false, message: 'Search term is required' });
    }

    const outlets = await outletService.searchOutlets(superAdminId, searchTerm);
    
    res.status(200).json({ 
      success: true, 
      data: { outlets },
      message: `Found ${outlets.length} outlets matching "${searchTerm}"`
    });
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

export const removeAdmin = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    // Check if outlet exists and belongs to super admin
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    if (existingOutlet.createdBy.toString() !== superAdminId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this outlet' });
    }

    const updatedOutlet = await outletService.removeAdmin(outletId);
    
    if (!updatedOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    res.status(200).json({ success: true, message: 'Admin removed successfully', data: { outlet: updatedOutlet } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const assignRoleToEmployee = async (req: Request, res: Response) => {
  try {
    const outletId = req.params.outletId;
    const { email, password, phone, role, responsibilities, name } = req.body;
    if (!outletId || !email || !password || !phone || !role || !responsibilities) {
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
    const emailService = new EmailService();
    const token = generateToken({
      _id: assignment._id.toString(),
      email: assignment.email,
      role: assignment.role,
      type: 'employee'
    });
    await emailService.sendVerificationEmail(assignment.email, token, 'employee');
    return res.status(201).json({
      success: true,
      message: 'Role assigned successfully. Verification email sent to employee.',
      data: {
        assignment: {
          ...assignment.toObject(),
          isEmailVerified: assignment.isEmailVerified || false
        },
        token
      }
    });
  } catch (error) {
    console.error('[DEBUG] assignRoleToEmployee error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: (error as Error).message });
  }
};

export const fixOutletStatus = async (req: Request, res: Response) => {
  try {
    const fixedCount = await outletService.fixExistingOutletsWithoutStatus();
    
    res.status(200).json({ 
      success: true, 
      message: `Fixed ${fixedCount} outlets that were missing isActive field`,
      data: { fixedCount }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}; 