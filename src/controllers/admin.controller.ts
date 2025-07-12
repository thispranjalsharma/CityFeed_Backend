import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { UserRepository } from '../repositories/user.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { AdminService } from '../services/admin.service';
import { CronScheduler } from '../utils/cronScheduler.util';
import { AuthRequest, TokenPayload } from '../interfaces/auth.interface';

export class AdminController extends BaseController {
  private userRepository: UserRepository;
  private adminRepository: AdminRepository;
  private adminService: AdminService;
  private cronScheduler: CronScheduler;

  constructor() {
    super();
    this.userRepository = new UserRepository();
    this.adminRepository = new AdminRepository();
    this.adminService = new AdminService();
    this.cronScheduler = new CronScheduler();
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

  /**
   * @swagger
   * /api/admin/cleanup/trigger:
   *   post:
   *     summary: Manually trigger soft delete cleanup
   *     description: |
   *       Manually triggers the cleanup job to permanently delete soft-deleted records
   *       that are older than 13 months. This is useful for immediate cleanup or testing.
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cleanup job triggered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Cleanup job triggered successfully"
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Not authorized - Only super admins can trigger cleanup
   *       500:
   *         description: Server error during cleanup
   */
  triggerCleanup = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;
      
      // Only super admins can trigger cleanup
      if (currentUser.role !== 'super_admin') {
        return this.sendError(res, 'Only super admins can trigger cleanup jobs', 403);
      }

      await this.cronScheduler.triggerManualCleanup();
      this.sendSuccess(res, null, 'Cleanup job triggered successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };

  /**
   * @swagger
   * /api/admin/cleanup/stats:
   *   get:
   *     summary: Get soft delete statistics
   *     description: |
   *       Returns statistics about soft-deleted records in the system,
   *       including counts of records older than 13 months that would be
   *       cleaned up by the scheduled job.
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Soft delete statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     offers:
   *                       type: object
   *                       properties:
   *                         totalSoftDeleted:
   *                           type: number
   *                           example: 150
   *                         olderThan13Months:
   *                           type: number
   *                           example: 25
   *                     outlets:
   *                       type: object
   *                       properties:
   *                         totalSoftDeleted:
   *                           type: number
   *                           example: 30
   *                         olderThan13Months:
   *                           type: number
   *                           example: 5
   *                     employees:
   *                       type: object
   *                       properties:
   *                         totalRecords:
   *                           type: number
   *                           example: 500
   *                         olderThan13Months:
   *                           type: number
   *                           example: 50
   *                     users:
   *                       type: object
   *                       properties:
   *                         totalSoftDeleted:
   *                           type: number
   *                           example: 200
   *                         olderThan13Months:
   *                           type: number
   *                           example: 40
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Not authorized - Only super admins can view statistics
   *       500:
   *         description: Server error retrieving statistics
   */
  getCleanupStats = async (req: AuthRequest, res: Response) => {
    try {
      const currentUser = req.user as TokenPayload;
      
      // Only super admins can view cleanup statistics
      if (currentUser.role !== 'super_admin') {
        return this.sendError(res, 'Only super admins can view cleanup statistics', 403);
      }

      const stats = await this.cronScheduler.getSoftDeleteStats();
      this.sendSuccess(res, stats, 'Soft delete statistics retrieved successfully');
    } catch (error) {
      this.handleError(res, error as Error);
    }
  };
} 


