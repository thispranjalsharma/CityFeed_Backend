import { Request, Response } from 'express';
import { OutletAdminService } from '../services/outletAdmin.service';
import { OutletAdmin } from '../models/outletAdmin.model';
import { Outlet } from '../models/outlet.model';

const outletAdminService = new OutletAdminService();

export const registerOutletAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    const superAdminId = (req as any).user?._id;
    
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, password, and phone are required' 
      });
    }

    const outletAdmin = await outletAdminService.createOutletAdmin({
      name,
      email,
      password,
      phone
    });

    return res.status(201).json({
      success: true,
      message: 'Outlet admin registered successfully. Please check your email for verification.',
      data: {
        outletAdmin: {
          _id: outletAdmin._id,
          name: outletAdmin.name,
          email: outletAdmin.email,
          phone: outletAdmin.phone,
          isEmailVerified: outletAdmin.isEmailVerified,
          isActive: outletAdmin.isActive
        },
        createdBy: superAdminId
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const loginOutletAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const result = await outletAdminService.login(email, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        outletAdmin: {
          _id: result.outletAdmin._id,
          name: result.outletAdmin.name,
          email: result.outletAdmin.email,
          phone: result.outletAdmin.phone,
          role: result.outletAdmin.role,
          isActive: result.outletAdmin.isActive,
          isEmailVerified: result.outletAdmin.isEmailVerified
        },
        token: result.token,
        outletId: result.outletId
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const verifyOutletAdminEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification token is required' 
      });
    }

    const outletAdmin = await outletAdminService.verifyEmail(token);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        outletAdmin: {
          _id: outletAdmin._id,
          name: outletAdmin.name,
          email: outletAdmin.email,
          isEmailVerified: outletAdmin.isEmailVerified
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getAllOutletAdmins = async (req, res) => {
  try {
    const superAdminId = req.query.superAdminId;
    let outletAdmins;
    if (superAdminId) {
      // Find all outlets created by this super admin
      const outlets = await Outlet.find({ 
        createdBy: superAdminId,
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
      });
      const adminIds = outlets.map(o => o.assignedAdmin).filter(Boolean);
      outletAdmins = await OutletAdmin.find({ 
        _id: { $in: adminIds },
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
      });
    } else {
      outletAdmins = await OutletAdmin.find({
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
      });
    }
    res.status(200).json({ success: true, data: outletAdmins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOutletAdmins = async (req, res) => {
  try {
    const superAdminId = req.user._id;
    // Find all outlets created by this super admin
    const outlets = await Outlet.find({ 
      createdBy: superAdminId,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    const adminIds = outlets.map(o => o.assignedAdmin).filter(Boolean);
    const outletAdmins = await OutletAdmin.find({ 
      _id: { $in: adminIds },
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    // For each admin, find the outlets assigned to them (created by this super admin)
    const adminsWithOutlets = await Promise.all(outletAdmins.map(async (admin) => {
      const assignedOutlets = outlets.filter(o => o.assignedAdmin && o.assignedAdmin.toString() === admin._id.toString());
      return {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          isActive: admin.isActive,
          isEmailVerified: admin.isEmailVerified
        },
        outlets: assignedOutlets.map(o => ({
          _id: o._id,
          businessName: o.businessName,
          address: o.address
        }))
      };
    }));
    res.status(200).json({ success: true, data: adminsWithOutlets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const outletAdmin = await OutletAdmin.findOne({
      _id: req.user._id,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    });
    if (!outletAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: outletAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // Only allow updating name and phone
    const updates: Partial<typeof OutletAdmin.prototype> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    
    // If email is provided, return an error
    if (req.body.email !== undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email cannot be updated. Only name and phone can be modified.' 
      });
    }
    
    const outletAdmin = await OutletAdmin.findOneAndUpdate(
      {
        _id: req.user._id,
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
      },
      updates, 
      { new: true }
    );
    if (!outletAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: outletAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMyProfile = async (req, res) => {
  try {
    const outletAdmin = await outletAdminService.softDeleteOutletAdmin(req.user._id);
    if (!outletAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, message: 'Profile soft deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// New endpoints for managing soft-deleted outlet admins

export const getDeletedOutletAdmins = async (req, res) => {
  try {
    const deletedOutletAdmins = await outletAdminService.getDeletedOutletAdmins();
    res.status(200).json({ 
      success: true, 
      data: deletedOutletAdmins,
      message: `Retrieved ${deletedOutletAdmins.length} deleted outlet admins`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreOutletAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const restoredAdmin = await outletAdminService.restoreOutletAdmin(adminId);
    
    if (!restoredAdmin) {
      return res.status(404).json({ success: false, message: 'Outlet admin not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Outlet admin restored successfully', 
      data: { outletAdmin: restoredAdmin } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const softDeleteOutletAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const deletedAdmin = await outletAdminService.softDeleteOutletAdmin(adminId);
    
    if (!deletedAdmin) {
      return res.status(404).json({ success: false, message: 'Outlet admin not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Outlet admin soft deleted successfully', 
      data: { outletAdmin: deletedAdmin } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 