import { Response } from 'express';
import { BaseController } from './base.controller';
import { UserRepository } from '../repositories/user.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { MerchantService } from '../services/merchant.service';
import * as jwt from 'jsonwebtoken';

export class AdminController extends BaseController {
  private userRepository: UserRepository;
  private merchantRepository: MerchantRepository;
  private adminRepository: AdminRepository;
  private merchantService: MerchantService;

  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.merchantRepository = new MerchantRepository();
    this.adminRepository = new AdminRepository();
    this.merchantService = new MerchantService();
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
      
      const updatedMerchant = await this.merchantService.approveMerchant(merchantId);
      console.log('Updated merchant:', updatedMerchant);
      
      return this.sendSuccess(res, {
        merchant: {
          _id: updatedMerchant._id,
          email: updatedMerchant.email,
          name: updatedMerchant.name,
          businessName: updatedMerchant.businessName,
          role: updatedMerchant.role,
          isApproved: updatedMerchant.isApproved
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

      const updatedMerchant = await this.merchantRepository.update(merchantId, { isApproved: false });
      return this.sendSuccess(res, {
        merchant: {
          _id: updatedMerchant?._id,
          email: updatedMerchant?.email,
          name: updatedMerchant?.name,
          businessName: updatedMerchant?.businessName,
          role: updatedMerchant?.role,
          isApproved: updatedMerchant?.isApproved,
          isEmailVerified: updatedMerchant?.isEmailVerified
        }
      }, 'Merchant disapproved successfully');
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

  public updateMerchant = async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedMerchant = await this.merchantRepository.update(id, updateData);
      if (!updatedMerchant) {
        this.sendError(res, 'Merchant not found', 404);
        return;
      }

      this.sendSuccess(res, {
        _id: updatedMerchant._id,
        email: updatedMerchant.email,
        name: updatedMerchant.name,
        phone: updatedMerchant.phone,
        businessName: updatedMerchant.businessName,
        businessType: updatedMerchant.businessType,
        address: updatedMerchant.address,
        location: updatedMerchant.location,
        images: updatedMerchant.images,
        role: updatedMerchant.role,
        isApproved: updatedMerchant.isApproved,
        isEmailVerified: updatedMerchant.isEmailVerified
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  public getMerchantById = async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const merchant = await this.merchantRepository.findById(id);
      if (!merchant) {
        this.sendError(res, 'Merchant not found', 404);
        return;
      }

      this.sendSuccess(res, {
        _id: merchant._id,
        email: merchant.email,
        name: merchant.name,
        phone: merchant.phone,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        address: merchant.address,
        location: merchant.location,
        images: merchant.images,
        role: merchant.role,
        isApproved: merchant.isApproved,
        isEmailVerified: merchant.isEmailVerified
      });
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
} 


