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
      await emailService.sendVerificationEmail(assignment.email, verificationToken, 'employee');
    } catch (emailError) {
      // Log email error but don't fail the request
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
      message: 'Employee assigned successfully with flexible responsibilities. Verification email has been sent.'
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
      message: 'Failed to assign employee: ' + error.message 
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

export const getMyEmployeesForSuperAdmin = async (req, res) => {
  try {
    const superAdminId = req.user._id;
    
    // First, get all outlets created by this super admin
    const { Outlet } = await import('../models/outlet.model');
    const outlets = await Outlet.find({ 
      createdBy: superAdminId, 
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }] 
    }).select('_id businessName address');
    
    if (!outlets || outlets.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: { 
          outlets: [],
          employees: [],
          totalEmployees: 0,
          message: 'No outlets found for this super admin'
        } 
      });
    }
    
    const outletIds = outlets.map(outlet => outlet._id);
    
    // Get all employees for these outlets
    const employees = await Staff.find({ 
      outlet: { $in: outletIds }, 
      isDeleted: { $ne: true } 
    }).populate('outlet', 'name address');
    
    // Group employees by outlet
    const employeesByOutlet = {};
    outlets.forEach(outlet => {
      employeesByOutlet[outlet._id.toString()] = {
        outlet: {
          _id: outlet._id,
          name: outlet.businessName,
          address: outlet.address
        },
        employees: []
      };
    });
    
    employees.forEach(employee => {
      const outletId = employee.outlet._id.toString();
      if (employeesByOutlet[outletId]) {
        employeesByOutlet[outletId].employees.push({
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          responsibilities: employee.responsibilities,
          isEmailVerified: employee.isEmailVerified,
          isFirstLogin: employee.isFirstLogin,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt
        });
      }
    });
    
    const totalEmployees = employees.length;
    
    res.status(200).json({ 
      success: true, 
      data: { 
        outlets: Object.values(employeesByOutlet),
        totalEmployees,
        message: `Retrieved ${totalEmployees} employees from ${outlets.length} outlets`
      } 
    });
  } catch (error) {
    console.error('Error in getMyEmployeesForSuperAdmin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get employees for super admin outlets' 
    });
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
      // Offer Management
      'create_offer',
      'update_offer', 
      'delete_offer',
      'view_offer',
      
      // Order Management
      'create_order',
      'update_order',
      'delete_order',
      'view_order',
      
      // Customer Service
      'view_feedback',
      'respond_feedback',
      'handle_complaints',
      'manage_customers',
      
      // Payment Management
      'initiate_payment',
      'refund_payment',
      'view_payment',
      
      // Outlet Management
      'view_outlet',
      'update_outlet',
      'manage_employees',
      
      // Dine-in Management
      'create_dinein_session',
      'close_dinein_session',
      'view_dinein_session',
      'manage_reservations',
      
      // Administrative
      'assign_roles',
      'view_dashboard',
      'view_reports',
      'generate_reports',
      'view_analytics',
      
      // Inventory & Menu
      'manage_inventory',
      'manage_menu',
      'manage_suppliers',
      
      // Promotions & Marketing
      'manage_promotions',
      'view_financial_data'
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

export const getMyEmployees = async (req, res) => {
  try {
    const outletAdminId = req.user._id;
    const userRole = req.user.role;

    // Check if user is outlet admin
    if (userRole !== 'outlet_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only outlet admins can view their employees' 
      });
    }

    // Find the outlet where this admin is assigned
    const { Outlet } = await import('../models/outlet.model');
    const outlet = await Outlet.findOne({ 
      assignedAdmin: outletAdminId,
      isDeleted: { $ne: true }
    });

    if (!outlet) {
      return res.status(404).json({ 
        success: false, 
        message: 'No outlet found for this admin' 
      });
    }

    // Get all employees assigned to this outlet
    const employees = await Staff.find({ 
      outlet: outlet._id,
      isDeleted: { $ne: true }
    }).select('-password'); // Exclude password from response

    res.status(200).json({ 
      success: true, 
      data: {
        outlet: {
          _id: outlet._id,
          name: outlet.businessName,
          address: outlet.address
        },
        employees: employees,
        totalEmployees: employees.length
      }
    });
  } catch (error) {
    console.error('Error in getMyEmployees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get employees: ' + error.message 
    });
  }
};

export const getEmployeesForOutletBySuperAdmin = async (req, res) => {
  try {
    const superAdminId = req.user._id;
    const userRole = req.user.role;

    // Check if user is super admin
    if (userRole !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super admins can access this endpoint' 
      });
    }

    const outletId = req.query.outletId;
    
    if (!outletId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Outlet ID is required' 
      });
    }

    // Verify that the outlet was created by this super admin
    const { Outlet } = await import('../models/outlet.model');
    const outlet = await Outlet.findOne({ 
      _id: outletId,
      createdBy: superAdminId,
      isDeleted: { $ne: true }
    });

    if (!outlet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Outlet not found or you do not have permission to access it' 
      });
    }

    // Get all employees assigned to this outlet
    const employees = await Staff.find({ 
      outlet: outlet._id,
      isDeleted: { $ne: true }
    }).select('-password'); // Exclude password from response

    res.status(200).json({ 
      success: true, 
      data: {
        outlet: {
          _id: outlet._id,
          name: outlet.businessName,
          address: outlet.address
        },
        employees: employees,
        totalEmployees: employees.length
      }
    });
  } catch (error) {
    console.error('Error in getEmployeesForOutletBySuperAdmin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get employees: ' + error.message 
    });
  }
};

export const activateStaff = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const staffId = req.params.staffId;

    // Check if user is outlet admin or super admin
    if (userRole !== 'outlet_admin' && userRole !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only outlet admins and super admins can activate staff' 
      });
    }

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found' 
      });
    }

    // Check permissions based on role
    if (userRole === 'outlet_admin') {
      // For outlet admin: check if staff belongs to their assigned outlet
      const { Outlet } = await import('../models/outlet.model');
      const outlet = await Outlet.findOne({ 
        assignedAdmin: userId,
        isDeleted: { $ne: true }
      });

      if (!outlet || staff.outlet.toString() !== outlet._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only activate staff from your assigned outlet' 
        });
      }
    } else if (userRole === 'super_admin') {
      // For super admin: check if staff belongs to an outlet they created
      const { Outlet } = await import('../models/outlet.model');
      const outlet = await Outlet.findOne({ 
        _id: staff.outlet,
        createdBy: userId,
        isDeleted: { $ne: true }
      });

      if (!outlet) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only activate staff from outlets you created' 
        });
      }
    }

    // Activate the staff member
    staff.isActive = true;
    await staff.save();

    res.status(200).json({ 
      success: true, 
      message: 'Staff member activated successfully',
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          isActive: staff.isActive
        }
      }
    });
  } catch (error) {
    console.error('Error in activateStaff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to activate staff: ' + error.message 
    });
  }
};

export const deactivateStaff = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const staffId = req.params.staffId;

    // Check if user is outlet admin or super admin
    if (userRole !== 'outlet_admin' && userRole !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only outlet admins and super admins can deactivate staff' 
      });
    }

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found' 
      });
    }

    // Check permissions based on role
    if (userRole === 'outlet_admin') {
      // For outlet admin: check if staff belongs to their assigned outlet
      const { Outlet } = await import('../models/outlet.model');
      const outlet = await Outlet.findOne({ 
        assignedAdmin: userId,
        isDeleted: { $ne: true }
      });

      if (!outlet || staff.outlet.toString() !== outlet._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only deactivate staff from your assigned outlet' 
        });
      }
    } else if (userRole === 'super_admin') {
      // For super admin: check if staff belongs to an outlet they created
      const { Outlet } = await import('../models/outlet.model');
      const outlet = await Outlet.findOne({ 
        _id: staff.outlet,
        createdBy: userId,
        isDeleted: { $ne: true }
      });

      if (!outlet) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only deactivate staff from outlets you created' 
        });
      }
    }

    // Deactivate the staff member
    staff.isActive = false;
    await staff.save();

    res.status(200).json({ 
      success: true, 
      message: 'Staff member deactivated successfully',
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          isActive: staff.isActive
        }
      }
    });
  } catch (error) {
    console.error('Error in deactivateStaff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to deactivate staff: ' + error.message 
    });
  }
};

 