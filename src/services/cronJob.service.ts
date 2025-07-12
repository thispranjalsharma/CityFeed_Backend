import { Offer } from '../models/offer.model';
import { Outlet } from '../models/outlet.model';
import { OutletRoleAssignment } from '../models/outletRoleAssignment.model';
import { User } from '../models/user.model';
import { OutletAdmin } from '../models/outletAdmin.model';
import { logger } from '../utils/logger.util';

export class CronJobService {
  /**
   * Permanently delete soft-deleted records older than 13 months
   * This job runs monthly on the 10th day of each month
   */
  async cleanupOldSoftDeletedRecords(): Promise<void> {
    try {
      logger.info('Starting cleanup of old soft-deleted records...');
      
      const thirteenMonthsAgo = new Date();
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
      
      const cleanupResults = {
        offers: 0,
        outlets: 0,
        employees: 0,
        users: 0,
        outletAdmins: 0,
        total: 0
      };

      // Clean up soft-deleted offers older than 13 months
      const deletedOffers = await Offer.deleteMany({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });
      cleanupResults.offers = deletedOffers.deletedCount || 0;
      logger.info(`Cleaned up ${cleanupResults.offers} old soft-deleted offers`);

      // Clean up soft-deleted outlets older than 13 months
      const deletedOutlets = await Outlet.deleteMany({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });
      cleanupResults.outlets = deletedOutlets.deletedCount || 0;
      logger.info(`Cleaned up ${cleanupResults.outlets} old soft-deleted outlets`);

      // Clean up soft-deleted employees (OutletRoleAssignment) older than 13 months
      const deletedEmployees = await OutletRoleAssignment.deleteMany({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });
      cleanupResults.employees = deletedEmployees.deletedCount || 0;
      logger.info(`Cleaned up ${cleanupResults.employees} old soft-deleted employee assignments`);

      // Clean up soft-deleted users older than 13 months
      const deletedUsers = await User.deleteMany({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });
      cleanupResults.users = deletedUsers.deletedCount || 0;
      logger.info(`Cleaned up ${cleanupResults.users} old soft-deleted users`);

      // Clean up soft-deleted outlet admins older than 13 months
      const deletedOutletAdmins = await OutletAdmin.deleteMany({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });
      cleanupResults.outletAdmins = deletedOutletAdmins.deletedCount || 0;
      logger.info(`Cleaned up ${cleanupResults.outletAdmins} old soft-deleted outlet admins`);

      cleanupResults.total = cleanupResults.offers + cleanupResults.outlets + cleanupResults.employees + cleanupResults.users + cleanupResults.outletAdmins;
      
      logger.info('Cleanup completed successfully', {
        totalRecordsDeleted: cleanupResults.total,
        breakdown: cleanupResults,
        cutoffDate: thirteenMonthsAgo.toISOString()
      });

    } catch (error) {
      logger.error('Error during cleanup of old soft-deleted records:', error);
      throw error;
    }
  }

  /**
   * Get statistics about soft-deleted records
   * Useful for monitoring and reporting
   */
  async getSoftDeleteStatistics(): Promise<any> {
    try {
      const thirteenMonthsAgo = new Date();
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

      const stats = {
        offers: {
          totalSoftDeleted: 0,
          olderThan13Months: 0
        },
        outlets: {
          totalSoftDeleted: 0,
          olderThan13Months: 0
        },
        employees: {
          totalSoftDeleted: 0,
          olderThan13Months: 0
        },
        users: {
          totalSoftDeleted: 0,
          olderThan13Months: 0
        },
        outletAdmins: {
          totalSoftDeleted: 0,
          olderThan13Months: 0
        }
      };

      // Count soft-deleted offers
      stats.offers.totalSoftDeleted = await Offer.countDocuments({ isDeleted: true });
      stats.offers.olderThan13Months = await Offer.countDocuments({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });

      // Count soft-deleted outlets
      stats.outlets.totalSoftDeleted = await Outlet.countDocuments({ isDeleted: true });
      stats.outlets.olderThan13Months = await Outlet.countDocuments({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });

      // Count soft-deleted employees
      stats.employees.totalSoftDeleted = await OutletRoleAssignment.countDocuments({ isDeleted: true });
      stats.employees.olderThan13Months = await OutletRoleAssignment.countDocuments({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });

      // Count soft-deleted users
      stats.users.totalSoftDeleted = await User.countDocuments({ isDeleted: true });
      stats.users.olderThan13Months = await User.countDocuments({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });

      // Count soft-deleted outlet admins
      stats.outletAdmins.totalSoftDeleted = await OutletAdmin.countDocuments({ isDeleted: true });
      stats.outletAdmins.olderThan13Months = await OutletAdmin.countDocuments({
        isDeleted: true,
        updatedAt: { $lt: thirteenMonthsAgo }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting soft delete statistics:', error);
      throw error;
    }
  }
} 