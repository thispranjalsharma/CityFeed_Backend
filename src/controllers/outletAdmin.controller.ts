import { Request, Response } from 'express';
import { OutletAdminService } from '../services/outletAdmin.service';
import { OutletAdmin } from '../models/outletAdmin.model';
import { Outlet } from '../models/outlet.model';

const outletAdminService = new OutletAdminService();

export const registerOutletAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    
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
    const outletAdmins = await OutletAdmin.find();
    res.status(200).json({ success: true, data: outletAdmins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOutletAdmins = async (req, res) => {
  try {
    const superAdminId = req.user._id;
    // Find all outlets created by this super admin
    const outlets = await Outlet.find({ createdBy: superAdminId });
    const adminIds = outlets.map(o => o.assignedAdmin).filter(Boolean);
    const outletAdmins = await OutletAdmin.find({ _id: { $in: adminIds } });
    res.status(200).json({ success: true, data: outletAdmins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const outletAdmin = await OutletAdmin.findById(req.user._id);
    if (!outletAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: outletAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const updates = req.body;
    const outletAdmin = await OutletAdmin.findByIdAndUpdate(req.user._id, updates, { new: true });
    if (!outletAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, data: outletAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMyProfile = async (req, res) => {
  try {
    const outletAdmin = await OutletAdmin.findByIdAndDelete(req.user._id);
    if (!outletAdmin) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.status(200).json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 