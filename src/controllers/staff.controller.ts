import { Request, Response } from 'express';
import { StaffService } from '../services/staff.service';
import { Staff } from '../models/staff.model';
import { Types } from 'mongoose';
import { EmailService } from '../services/email.service';
import { generateToken } from '../utils/jwt.util';
import { config } from '../config/config';

const staffService = new StaffService();
const emailService = new EmailService();

export const assignRoleToOutlet = async (req, res) => {
  try {
    const assignment = await staffService.assignRoleToOutlet({
      outlet: req.body.outlet,
      role: req.body.role,
      responsibilities: req.body.responsibilities,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
      name: req.body.name
    });

    // Generate verification token
    const verificationToken = generateToken({
      _id: assignment._id.toString(),
      email: assignment.email,
      role: assignment.role as 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff' | 'guest_event',
      type: 'employee'
    }, '24h');

    // Send verification email
    try {
      console.log('=== EMAIL VERIFICATION DEBUG ===');
      console.log('Staff member created:', assignment.email);
      console.log('Verification token generated:', verificationToken.substring(0, 20) + '...');
      console.log('Attempting to send verification email...');
      
      await emailService.sendVerificationEmail(assignment.email, verificationToken, 'employee');
      
      console.log('✅ Verification email sent successfully to:', assignment.email);
      console.log('=== END EMAIL VERIFICATION DEBUG ===');
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('❌ Failed to send verification email to', assignment.email, ':', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        stack: emailError.stack,
        email: assignment.email,
        token: verificationToken.substring(0, 20) + '...'
      });
    }

    res.status(201).json({ 
      success: true, 
      data: assignment,
      verificationToken: verificationToken,
      verificationUrl: `${config.frontendUrls.employee || config.frontendUrl}/verify-email?token=${verificationToken}&role=employee`,
      message: 'Staff member assigned successfully. Verification email has been sent.'
    });
  } catch (error) {
    // Handle specific error cases
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error: ' + error.message 
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign role: ' + error.message 
    });
  }
};



export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Staff.find({ isDeleted: { $ne: true } });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get employees' });
  }
};

export const getEmployeesByOutlets = async (req, res) => {
  try {
    const { outletIds } = req.body;
    const employees = await Staff.find({ outlet: { $in: outletIds }, isDeleted: { $ne: true } });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get employees' });
  }
};

export const getEmployeesByOutlet = async (req, res) => {
  try {
    const { outlet } = req.params;
    const employees = await Staff.find({ outlet: outlet._id, isDeleted: { $ne: true } });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get employees' });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const employee = await Staff.findById(req.user._id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updates: Partial<typeof Staff.prototype> = {};
    
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    
    // Check if email is being updated and reject it
    if (req.body.email !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Email cannot be updated. Only name and phone can be modified.'
      });
    }
    
    const employee = await Staff.findByIdAndUpdate(req.user._id, updates, { new: true });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

export const deleteMyProfile = async (req, res) => {
  try {
    const employee = await Staff.findByIdAndUpdate(
      req.user._id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete profile' });
  }
};

export const updateStaffResponsibilities = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { responsibilities } = req.body;

    if (!responsibilities || !Array.isArray(responsibilities)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Responsibilities must be an array' 
      });
    }

    const staff = await staffService.updateStaffResponsibilities(staffId, responsibilities);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update staff responsibilities: ' + error.message 
    });
  }
};





export const getStaffById = async (req, res) => {
  try {
    const { staffId } = req.params;
    const staff = await Staff.findById(staffId);
    
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get staff member: ' + error.message 
    });
  }
};

export const getAvailableResponsibilities = async (req, res) => {
  try {
    const availableResponsibilities = [
      'create_offer',
      'update_offer', 
      'delete_offer',
      'view_offer',
      'create_order',
      'update_order',
      'delete_order',
      'view_order',
      'view_feedback',
      'respond_feedback',
      'initiate_payment',
      'refund_payment',
      'view_payment',
      'view_outlet',
      'update_outlet',
      'manage_employees',
      'create_dinein_session',
      'close_dinein_session',
      'view_dinein_session',
      'assign_roles',
      'view_dashboard',
      'manage_inventory',
      'manage_menu'
    ];

    res.status(200).json({ 
      success: true, 
      data: availableResponsibilities 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get available responsibilities: ' + error.message 
    });
  }
};

 