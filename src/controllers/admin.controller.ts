import { Response } from 'express';
import { BaseController } from './base.controller';
import { UserRepository } from '../repositories/user.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AdminRepository } from '../repositories/admin.repository';
import * as jwt from 'jsonwebtoken';

export class AdminController extends BaseController {
  private userRepository: UserRepository;
  private merchantRepository: MerchantRepository;
  private adminRepository: AdminRepository;

  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.merchantRepository = new MerchantRepository();
    this.adminRepository = new AdminRepository();
  }

  getUsers = async (_req: any, res: Response) => {
    try {
      const users = await this.userRepository.find({});
      return this.sendSuccess(res, users);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  getMerchants = async (_req: any, res: Response) => {
    try {
      const merchants = await this.merchantRepository.find({});
      return this.sendSuccess(res, merchants);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  approveMerchant = async (req: any, res: Response) => {
    try {
      const { merchantId } = req.params;
      console.log('Attempting to approve merchant with ID:', merchantId);
      
      const merchant = await this.merchantRepository.findById(merchantId);
      console.log('Found merchant:', merchant);
      
      if (!merchant) {
        return this.sendError(res, 'Merchant not found', 404);
      }

      const updatedMerchant = await this.merchantRepository.update(merchantId, { isApproved: true });
      console.log('Updated merchant:', updatedMerchant);
      
      return this.sendSuccess(res, {
        merchant: {
          _id: updatedMerchant?._id,
          email: updatedMerchant?.email,
          name: updatedMerchant?.name,
          businessName: updatedMerchant?.businessName,
          role: updatedMerchant?.role,
          isApproved: updatedMerchant?.isApproved
        }
      }, 'Merchant approved successfully');
    } catch (error) {
      console.error('Error approving merchant:', error);
      return this.handleError(res, error as Error);
    }
  };

  deactivateUser = async (req: any, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      const updatedUser = await this.userRepository.update(userId, { isActive: false });
      return this.sendSuccess(res, { user: updatedUser }, 'User deactivated successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  deactivateMerchant = async (req: any, res: Response) => {
    try {
      const { merchantId } = req.params;
      const merchant = await this.merchantRepository.findById(merchantId);
      
      if (!merchant) {
        return this.sendError(res, 'Merchant not found', 404);
      }

      const updatedMerchant = await this.merchantRepository.update(merchantId, { isActive: false });
      return this.sendSuccess(res, {
        merchant: {
          _id: updatedMerchant?._id,
          email: updatedMerchant?.email,
          name: updatedMerchant?.name,
          businessName: updatedMerchant?.businessName,
          role: updatedMerchant?.role,
          isActive: updatedMerchant?.isActive,
          isApproved: updatedMerchant?.isApproved
        }
      }, 'Merchant deactivated successfully');
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };

  login = async (req: any, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return this.sendError(res, 'Email and password are required', 400);
      }

      const admin = await this.adminRepository.findByEmail(email);
      console.log('Found admin:', admin);

      if (!admin) {
        return this.sendError(res, 'Invalid credentials', 401);
      }

      if (password !== admin.password) {
        console.log('Password mismatch:', { provided: password, stored: admin.password });
        return this.sendError(res, 'Invalid credentials', 401);
      }

      const token = jwt.sign(
        { 
          _id: admin._id,
          email: admin.email,
          role: admin.role,
          type: 'admin'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return this.sendSuccess(res, {
        token,
        admin: {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return this.handleError(res, error as Error);
    }
  };
} 