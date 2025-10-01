import cron from 'node-cron';
import { CronJobService } from '../services/cronJob.service';
import { logger } from './logger.util';

export class CronScheduler {
  private cronJobService: CronJobService;

  constructor() {
    this.cronJobService = new CronJobService();
  }

  /**
   * Initialize all cron jobs
   */
  initializeCronJobs(): void {
    this.scheduleSoftDeleteCleanup();
    logger.info('Cron jobs initialized successfully');
  }

  /**
   * Schedule soft delete cleanup to run monthly on the 10th day at 2:00 AM
   * Cron format: '0 2 10 * *' = At 02:00 on day-of-month 10
   */
  private scheduleSoftDeleteCleanup(): void {
    cron.schedule('0 2 10 * *', async () => {
      try {
        logger.info('Executing scheduled soft delete cleanup job...');
        await this.cronJobService.cleanupOldSoftDeletedRecords();
        logger.info('Scheduled soft delete cleanup job completed successfully');
      } catch (error) {
        logger.error('Error in scheduled soft delete cleanup job:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Soft delete cleanup job scheduled for monthly execution on 10th day at 2:00 AM UTC');
  }

  /**
   * Get statistics about soft-deleted records
   * Can be called manually for monitoring purposes
   */
  async getSoftDeleteStats(): Promise<any> {
    try {
      return await this.cronJobService.getSoftDeleteStatistics();
    } catch (error) {
      logger.error('Error getting soft delete statistics:', error);
      throw error;
    }
  }

  /**
   * Manually trigger the cleanup job
   * Useful for testing or immediate cleanup
   */
  async triggerManualCleanup(): Promise<void> {
    try {
      logger.info('Manual cleanup triggered...');
      await this.cronJobService.cleanupOldSoftDeletedRecords();
      logger.info('Manual cleanup completed successfully');
    } catch (error) {
      logger.error('Error in manual cleanup:', error);
      throw error;
    }
  }
} 