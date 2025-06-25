import { Response } from 'express';
import { BaseController } from './base.controller';
import { UserRepository } from '../repositories/user.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { AdminService } from '../services/admin.service';

export class AdminController extends BaseController {
  private userRepository: UserRepository;
  private adminRepository: AdminRepository;
  private adminService: AdminService;

  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.adminRepository = new AdminRepository();
    this.adminService = new AdminService();
  }

  getUsers = async (_req: any, res: Response) => {
    try {
      const users = await this.userRepository.find({});
      return this.sendSuccess(res, users);
    } catch (error) {
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

  login = async (req: any, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return this.sendError(res, 'Email and password are required', 400);
      }
      const result = await this.adminService.login(email, password);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error as Error);
    }
  };
} 


