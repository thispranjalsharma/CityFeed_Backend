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
import { Outlet } from '../models/outlet.model';
import { OfferService } from '../services/offer.service';
import { logger } from '../utils/logger.util';

const outletService = new OutletService();
const outletRoleAssignmentService = new OutletRoleAssignmentService();
const offerService = new OfferService();

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
    const {adminPassword,adminName} = req.body;
    let { adminEmail, adminPhone } = req.body;
    if (adminEmail) adminEmail = adminEmail.toLowerCase();
    if (adminPhone) adminPhone = adminPhone.toLowerCase();
    
    // Keep original case for business name and admin name
    // Only normalize email and phone to lowercase for consistency
    
    let assignedAdminId;
    if (adminEmail && adminPassword) {
      let outletAdmin = await OutletAdmin.findOne({ email: adminEmail });
      if (!outletAdmin) {
        // Use provided admin name or fallback to email prefix
        const adminDisplayName = adminName || adminEmail.split('@')[0];
        
        outletAdmin = new OutletAdmin({
          name: adminDisplayName,
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
        // Update name if provided
        if (adminName) {
          outletAdmin.name = adminName;
        }
        await outletAdmin.save();
      }
      assignedAdminId = outletAdmin._id;
    }

    // Parse location if it's a string
    let location = req.body.location;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid location format. Must be a valid GeoJSON string.' });
      }
    }
    // --- Ensure coordinates are [longitude, latitude] ---
    if (location) {
      // If input is { latitude, longitude }
      if (location.latitude !== undefined && location.longitude !== undefined) {
        location = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        };
      } else if (Array.isArray(location.coordinates)) {
        // If input is [latitude, longitude], swap to [longitude, latitude]
        if (
          typeof location.coordinates[0] === 'number' &&
          typeof location.coordinates[1] === 'number'
        ) {
          // If coordinates are [lat, lng], swap
          if (
            Math.abs(location.coordinates[0]) <= 90 &&
            Math.abs(location.coordinates[1]) <= 180
          ) {
            // Looks like [lat, lng], swap to [lng, lat]
            location.coordinates = [location.coordinates[1], location.coordinates[0]];
          }
        }
      }
    }

    const outlet = await outletService.createOutlet({
      ...req.body,
      location,
      images: imageUrls,
      createdBy: superAdminId,
      assignedAdmin: assignedAdminId,
      isActive: true
    });

    // Check if superadmin wants to create a default offer (default: false)
    const createDefaultOffer = req.body.createDefaultOffer === 'true' || req.body.createDefaultOffer === false;
    if (createDefaultOffer) {
      try {
        const now = new Date();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        const defaultOffer = await offerService.createOffer({
          title: req.body.businessName, // Use outlet's business name as offer title
          description: '10% off on Dine in',
          discountPercentage: 10,
          validFrom: now,
          validTo: oneYearFromNow,
          isActive: true,
          isDefault: true,
          createdByRole: 'super_admin',
          createdByUser: superAdminId
        }, outlet._id.toString());

        logger.info(`Default offer created successfully for outlet: ${outlet._id}`);
      } catch (offerError) {
        logger.error(`Failed to create default offer for outlet: ${outlet._id}, error:`, offerError);
        // Don't fail the outlet creation if offer creation fails
      }
    }

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
    // --- Convert location coordinates to [latitude, longitude] for response ---
    if (populatedOutlet.location && Array.isArray(populatedOutlet.location.coordinates)) {
      const coords = populatedOutlet.location.coordinates;
      if (coords.length === 2) {
        populatedOutlet.location.coordinates = [coords[1], coords[0]];
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
    const userId = (req as any).user?._id || (req as any).userId;
    const userRole = (req as any).user?.role;
    
    const outlet = await outletService.getOutletByIdWithAdmin(outletId);
    
    if (!outlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    // Check authorization based on user role
    let isAuthorized = false;
    
    if (userRole === 'super_admin') {
      // Super admin can access outlets they created
      isAuthorized = outlet.createdBy.toString() === userId.toString();
    } else if (userRole === 'outlet_admin') {
      // Outlet admin can access outlets they are assigned to
      isAuthorized = outlet.assignedAdmin && outlet.assignedAdmin.toString() === userId.toString();
    }

    if (!isAuthorized) {
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
    const userId = (req as any).user?._id || (req as any).userId;
    const userRole = (req as any).user?.role;
    
    // Check if outlet exists
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    // Check authorization based on user role
    let isAuthorized = false;
    
    if (userRole === 'super_admin') {
      // Super admin can update outlets they created
      isAuthorized = existingOutlet.createdBy.toString() === userId.toString();
    } else if (userRole === 'outlet_admin') {
      // Outlet admin can update outlets they are assigned to
      isAuthorized = existingOutlet.assignedAdmin && existingOutlet.assignedAdmin.toString() === userId.toString();
    }

    if (!isAuthorized) {
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
    
    // Only normalize email and phone to lowercase for consistency
    // Keep original case for business name and other fields
    if (req.body.adminEmail) req.body.adminEmail = req.body.adminEmail.toLowerCase();
    if (req.body.adminPhone) req.body.adminPhone = req.body.adminPhone.toLowerCase();
    
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
      let location = req.body.location;
      if (typeof location === 'string') {
        try {
          location = JSON.parse(location);
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid location format. Must be a valid GeoJSON string.' });
        }
      }
      // --- Ensure coordinates are [longitude, latitude] ---
      if (location) {
        if (location.latitude !== undefined && location.longitude !== undefined) {
          location = {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          };
        } else if (Array.isArray(location.coordinates)) {
          if (
            typeof location.coordinates[0] === 'number' &&
            typeof location.coordinates[1] === 'number'
          ) {
            if (
              Math.abs(location.coordinates[0]) <= 90 &&
              Math.abs(location.coordinates[1]) <= 180
            ) {
              location.coordinates = [location.coordinates[1], location.coordinates[0]];
            }
          }
        }
      }
      updateData.location = location;
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

    // Handle admin assignment - only super admins can assign new admins
    const { adminEmail, adminPassword, adminPhone } = req.body;
    if (adminEmail && adminEmail.trim() !== '' && adminPassword) {
      if (userRole !== 'super_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Only super admins can assign new outlet admins' 
        });
      }

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
    // --- Convert location coordinates to [latitude, longitude] for response ---
    if (populatedOutlet && populatedOutlet.location && Array.isArray(populatedOutlet.location.coordinates)) {
      const coords = populatedOutlet.location.coordinates;
      if (coords.length === 2) {
        populatedOutlet.location.coordinates = [coords[1], coords[0]];
      }
    }

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

// New endpoint to restore deleted outlet
export const restoreOutlet = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const superAdminId = (req as any).user?._id || (req as any).userId;
    
    // Check if outlet exists and belongs to super admin
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      // Check if it's in deleted state
      const deletedOutlets = await outletService.getDeletedOutlets(superAdminId);
      const deletedOutlet = deletedOutlets.find(o => o._id.toString() === outletId);
      
      if (!deletedOutlet) {
        return res.status(404).json({ success: false, message: 'Outlet not found' });
      }

      if (deletedOutlet.createdBy.toString() !== superAdminId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to restore this outlet' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Outlet is not deleted' });
    }

    const restoredOutlet = await outletService.restoreOutlet(outletId);
    
    if (!restoredOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    res.status(200).json({ success: true, message: 'Outlet restored successfully', data: { outlet: restoredOutlet } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// New endpoint to get deleted outlets
export const getDeletedOutlets = async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).user?._id || (req as any).userId;
    const deletedOutlets = await outletService.getDeletedOutlets(superAdminId);
    
    res.status(200).json({ 
      success: true, 
      data: { outlets: deletedOutlets },
      message: `Retrieved ${deletedOutlets.length} deleted outlets`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateOutletStatus = async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const { isActive } = req.body;
    const userId = (req as any).user?._id || (req as any).userId;
    const userRole = (req as any).user?.role;
    
    // Check if outlet exists
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    // Check authorization based on user role
    let isAuthorized = false;
    
    if (userRole === 'super_admin') {
      // Super admin can update status of outlets they created
      isAuthorized = existingOutlet.createdBy.toString() === userId.toString();
    } else if (userRole === 'outlet_admin') {
      // Outlet admin can update status of outlets they are assigned to
      isAuthorized = existingOutlet.assignedAdmin && existingOutlet.assignedAdmin.toString() === userId.toString();
    }

    if (!isAuthorized) {
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
    const userId = (req as any).user?._id || (req as any).userId;
    const userRole = (req as any).user?.role;
    
    // Check if outlet exists
    const existingOutlet = await outletService.getOutletById(outletId);
    if (!existingOutlet) {
      return res.status(404).json({ success: false, message: 'Outlet not found' });
    }

    // Check authorization based on user role
    let isAuthorized = false;
    
    if (userRole === 'super_admin') {
      // Super admin can remove admins from outlets they created
      isAuthorized = existingOutlet.createdBy.toString() === userId.toString();
    } else if (userRole === 'outlet_admin') {
      // Outlet admin can remove themselves from their assigned outlet
      isAuthorized = existingOutlet.assignedAdmin && existingOutlet.assignedAdmin.toString() === userId.toString();
    }

    if (!isAuthorized) {
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
    const {password, phone, role, responsibilities,name} = req.body
    let { email  } = req.body;
    if (!outletId || !email || !password || !phone || !role || !responsibilities) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Normalize email only, keep name in original case
    email = email.toLowerCase();
    
    // Use provided name or fallback to email prefix
    const employeeDisplayName = name || email.split('@')[0];
    
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
      name: employeeDisplayName
    });
    // Send verification email to the employee
    const emailService = new EmailService();
    const token = generateToken({
      _id: assignment._id.toString(),
      email: assignment.email,
      role: assignment.role as 'super_admin' | 'employee' | 'outlet_admin',
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

export const getAllOutlets = async (req, res) => {
  try {
    // Check for superAdminId in query or from req.user
    const superAdminId = req.query.superAdminId || req.user?._id;
    let outlets;
    if (superAdminId) {
      outlets = await Outlet.find({ createdBy: superAdminId }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
    } else {
      outlets = await Outlet.find().populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
    }
    res.status(200).json({ success: true, data: { outlets } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOutlets = async (req, res) => {
  try {
    const superAdminId = req.user._id;
    // Populate assignedAdmin for each outlet
    const outlets = await Outlet.find({ createdBy: superAdminId, $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }] })
      .populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
    res.status(200).json({ success: true, data: { outlets } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOutlet = async (req, res) => {
  try {
    const outletAdminId = req.user._id;
    const outlet = await Outlet.findOne({ assignedAdmin: outletAdminId }).populate('assignedAdmin', 'name email phone role isActive isEmailVerified');
    res.status(200).json({ success: true, data: { outlet } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 