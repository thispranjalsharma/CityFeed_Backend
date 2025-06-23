import { Request, Response } from 'express';
import { OutletAdminService } from '../services/outletAdmin.service';

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
        token: result.token
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

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const outletAdmin = await outletAdminService.findByEmail(email);
    if (!outletAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Outlet admin not found' 
      });
    }

    if (outletAdmin.isEmailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already verified' 
      });
    }

    await outletAdminService.sendVerificationEmail(outletAdmin);

    return res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}; 