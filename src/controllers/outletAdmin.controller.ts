import { Request, Response } from 'express';
import { OutletAdmin } from '../models/outletAdmin.model';
import jwt from 'jsonwebtoken';

export const loginOutletAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const admin = await OutletAdmin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }
    // You may want to check isEmailVerified here if needed
    const token = jwt.sign(
      {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        type: 'outlet_admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          isActive: admin.isActive,
          isEmailVerified: admin.isEmailVerified
        },
        token
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 