import { SendGridService } from "./sendgrid.service";
import { logger } from "../utils/logger.util";
import { inject, injectable } from "inversify";

interface EmailJob {
  id: string;
  type:
    | "verification"
    | "passwordReset"
    | "ticket"
    | "dineInSummary"
    | "adminNotification";
  data: any;
  retries: number;
  maxRetries: number;
  createdAt: Date;
}

export interface IEmailQueueService {
  addToQueue(type: EmailJob["type"], data: any): Promise<void>;
  processQueue(): Promise<void>;
  processJob(job: EmailJob): Promise<void>;
  sendVerificationEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void>;
  sendPasswordResetEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void>;
  sendTicketEmail(data: any): Promise<void>;
  sendDineInSummaryEmail(data: any): Promise<void>;
  sendAdminNotification(superAdmin: any): Promise<void>;

  getQueueStatus(): { length: number; isProcessing: boolean; oldestJob?: Date };
}

@injectable()
export class EmailQueueService implements IEmailQueueService {
  //  sendGridService: SendGridService;
  private queue: EmailJob[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor(
    @inject("SendGridService") private sendGridService: SendGridService
  ) {}

  async addToQueue(type: EmailJob["type"], data: any): Promise<void> {
    try {
      if (!type || !data) {
        logger.error("Invalid parameters for email queue:", {
          type,
          hasData: !!data,
        });
        throw new Error("Invalid parameters for email queue");
      }

      const job: EmailJob = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        retries: 0,
        maxRetries: this.maxRetries,
        createdAt: new Date(),
      };

      this.queue.push(job);
      logger.info(`Email job added to queue: ${job.id} (${type})`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue().catch((error) => {
          logger.error("Error in email queue processing:", error);
        });
      }
    } catch (error) {
      logger.error("Failed to add email job to queue:", error);
      // Don't throw error to prevent blocking the calling process
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.info(
      `Starting email queue processing. Queue length: ${this.queue.length}`
    );

    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) continue;

        try {
          await this.processJob(job);
          logger.info(`Email job completed successfully: ${job.id}`);
        } catch (error) {
          logger.error(`Email job failed: ${job.id}`, error);

          // Retry logic
          if (job.retries < job.maxRetries) {
            job.retries++;
            logger.info(
              `Retrying email job: ${job.id} (attempt ${job.retries}/${job.maxRetries})`
            );

            // Add back to queue with delay
            setTimeout(() => {
              try {
                this.queue.push(job);
                if (!this.isProcessing) {
                  this.processQueue().catch((error) => {
                    logger.error(
                      "Error in email queue processing during retry:",
                      error
                    );
                  });
                }
              } catch (error) {
                logger.error(`Failed to requeue job ${job.id}:`, error);
              }
            }, this.retryDelay * job.retries);
          } else {
            logger.error(
              `Email job failed permanently after ${job.maxRetries} retries: ${job.id}`
            );
          }
        }

        // Small delay between jobs to prevent overwhelming the email service
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.error("Error in email queue processing loop:", error);
    } finally {
      this.isProcessing = false;
      logger.info("Email queue processing completed");
    }
  }

  async processJob(job: EmailJob): Promise<void> {
    try {
      if (!job || !job.type || !job.data) {
        throw new Error(`Invalid job data: ${JSON.stringify(job)}`);
      }

      switch (job.type) {
        case "verification":
          if (!job.data.email || !job.data.token || !job.data.role) {
            throw new Error(
              `Missing required data for verification email: ${JSON.stringify(
                job.data
              )}`
            );
          }
          await this.sendGridService.sendVerificationEmail(
            job.data.email,
            job.data.token,
            job.data.role
          );
          break;

        case "passwordReset":
          if (!job.data.email || !job.data.token || !job.data.role) {
            throw new Error(
              `Missing required data for password reset email: ${JSON.stringify(
                job.data
              )}`
            );
          }
          await this.sendGridService.sendPasswordResetEmail(
            job.data.email,
            job.data.token,
            job.data.role
          );
          break;

        case "ticket":
          if (
            !job.data.to ||
            !job.data.event ||
            !job.data.tickets ||
            !job.data.userName
          ) {
            throw new Error(
              `Missing required data for ticket email: ${JSON.stringify(
                job.data
              )}`
            );
          }
          await this.sendGridService.sendTicketEmail(job.data);
          break;

        case "dineInSummary":
          if (
            !job.data.to ||
            !job.data.userName ||
            !job.data.outletName ||
            !job.data.reviewLink
          ) {
            throw new Error(
              `Missing required data for dine-in summary email: ${JSON.stringify(
                job.data
              )}`
            );
          }
          await this.sendGridService.sendDineInSummaryEmail(job.data);
          break;

        case "adminNotification":
          if (
            !job.data.superAdmin ||
            !job.data.superAdmin.name ||
            !job.data.superAdmin.email ||
            !job.data.superAdmin.phone
          ) {
            throw new Error(
              `Missing required data for admin notification: ${JSON.stringify(
                job.data
              )}`
            );
          }
          await this.sendGridService.sendSuperAdminVerifiedAdminNotification(
            job.data.superAdmin
          );
          break;

        default:
          throw new Error(`Unknown email job type: ${job.type}`);
      }
    } catch (error) {
      logger.error(`Error processing email job ${job.id}:`, error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  // Public methods for different email types
  async sendVerificationEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void> {
    try {
      if (!email || !token || !role) {
        logger.error("Missing required parameters for verification email:", {
          email,
          token: token ? "present" : "missing",
          role,
        });
        throw new Error("Missing required parameters for verification email");
      }
      await this.addToQueue("verification", { email, token, role });
    } catch (error) {
      logger.error("Failed to queue verification email:", error);
      // Don't throw error to prevent blocking the calling process
    }
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void> {
    try {
      if (!email || !token || !role) {
        logger.error("Missing required parameters for password reset email:", {
          email,
          token: token ? "present" : "missing",
          role,
        });
        throw new Error("Missing required parameters for password reset email");
      }
      await this.addToQueue("passwordReset", { email, token, role });
    } catch (error) {
      logger.error("Failed to queue password reset email:", error);
      // Don't throw error to prevent blocking the calling process
    }
  }

  async sendTicketEmail(data: any): Promise<void> {
    try {
      if (!data || !data.to || !data.event || !data.tickets || !data.userName) {
        logger.error("Missing required parameters for ticket email:", {
          hasData: !!data,
          hasTo: !!data?.to,
          hasEvent: !!data?.event,
          hasTickets: !!data?.tickets,
          hasUserName: !!data?.userName,
        });
        throw new Error("Missing required parameters for ticket email");
      }
      await this.addToQueue("ticket", data);
    } catch (error) {
      logger.error("Failed to queue ticket email:", error);
      // Don't throw error to prevent blocking the calling process
    }
  }

  async sendDineInSummaryEmail(data: any): Promise<void> {
    try {
      if (
        !data ||
        !data.to ||
        !data.userName ||
        !data.outletName ||
        !data.reviewLink
      ) {
        logger.error("Missing required parameters for dine-in summary email:", {
          hasData: !!data,
          hasTo: !!data?.to,
          hasUserName: !!data?.userName,
          hasOutletName: !!data?.outletName,
          hasReviewLink: !!data?.reviewLink,
        });
        throw new Error(
          "Missing required parameters for dine-in summary email"
        );
      }
      await this.addToQueue("dineInSummary", data);
    } catch (error) {
      logger.error("Failed to queue dine-in summary email:", error);
      // Don't throw error to prevent blocking the calling process
    }
  }

  async sendAdminNotification(superAdmin: any): Promise<void> {
    try {
      if (
        !superAdmin ||
        !superAdmin.name ||
        !superAdmin.email ||
        !superAdmin.phone
      ) {
        logger.error("Missing required parameters for admin notification:", {
          hasSuperAdmin: !!superAdmin,
          hasName: !!superAdmin?.name,
          hasEmail: !!superAdmin?.email,
          hasPhone: !!superAdmin?.phone,
        });
        throw new Error("Missing required parameters for admin notification");
      }
      await this.addToQueue("adminNotification", { superAdmin });
    } catch (error) {
      logger.error("Failed to queue admin notification:", error);
      // Don't throw error to prevent blocking the calling process
    }
  }

  // Get queue status
  getQueueStatus(): {
    length: number;
    isProcessing: boolean;
    oldestJob?: Date;
  } {
    try {
      const oldestJob =
        this.queue.length > 0 ? this.queue[0].createdAt : undefined;
      return {
        length: this.queue.length,
        isProcessing: this.isProcessing,
        oldestJob,
      };
    } catch (error) {
      logger.error("Error getting queue status:", error);
      return {
        length: 0,
        isProcessing: false,
      };
    }
  }

  // Clear queue (for emergency situations)
  clearQueue(): void {
    try {
      const queueLength = this.queue.length;
      this.queue = [];
      logger.warn(`Email queue cleared. Removed ${queueLength} jobs`);
    } catch (error) {
      logger.error("Error clearing email queue:", error);
    }
  }
}

// Export singleton instance
