import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private static instance: EmailService;

  private constructor() {
    try {
      // Try primary SMTP configuration first
      this.transporter = this.createTransporter();
      
      logger.info('Email transporter initialized successfully');
      
      // Verify transporter configuration
      // this.verifyTransporter().catch(error => {
      //   logger.error('Email transporter verification failed during initialization:', error);
      // });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      throw new Error('Email service initialization failed');
    }
  }

  private createTransporter(): nodemailer.Transporter {
    // Primary configuration
    const primaryConfig = {
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      // Reduced timeout configurations for Railway
      connectionTimeout: 15000, // 15 seconds
      greetingTimeout: 15000,   // 15 seconds
      socketTimeout: 20000,     // 20 seconds
      // Simplified pool configuration for Railway
      pool: false, // Disable pooling for Railway
      // Add additional connection options
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      // Add debug for troubleshooting
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    };

    // Fallback configuration for Gmail
    const fallbackConfig = {
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      pool: false, // Disable pooling for Railway
      tls: {
        rejectUnauthorized: false
      },
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    };

    try {
      // Try primary configuration first
      return nodemailer.createTransport(primaryConfig);
    } catch (error) {
      logger.warn('Primary SMTP configuration failed, trying fallback:', error.message);
      try {
        return nodemailer.createTransport(fallbackConfig);
      } catch (fallbackError) {
        logger.error('Both primary and fallback SMTP configurations failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Singleton pattern - get instance
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async verifyTransporter(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email transporter verified successfully');
    } catch (error) {
      logger.error('Email transporter verification failed:', error);
      throw new Error('Email configuration is invalid');
    }
  }

  async sendVerificationEmail(email: string, token: string, role: 'user' | 'admin' | 'super_admin' | 'employee' | 'outlet_admin' | 'event_organizer' | 'event_manager' | 'event_staff'): Promise<void> {
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!email || !token || !role) {
          logger.error('Missing required parameters for verification email:', { email, token: token ? 'present' : 'missing', role });
          throw new Error('Missing required parameters for verification email');
        }
        
        const baseUrl = config.frontendUrls[role] || config.frontendUrl;
        const verificationUrl = `${baseUrl}/verify-email?token=${token}&role=${role}`;
        
        const subject = 'Verify your email address';
        const html = `
          <h1>Welcome to CityFeed!</h1>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#2d7ff9;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;margin:16px 0;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
        `;

        logger.info(`Attempting to send verification email to ${email} (attempt ${attempt}/${maxRetries})`);

        const result = await this.transporter.sendMail({
          from: config.email.from,
          to: email,
          subject,
          html
        });

        logger.info(`Verification email sent successfully to ${email}`, { messageId: result.messageId, attempt });
        return; // Success, exit the retry loop
      } catch (error) {
        lastError = error;
        logger.error(`Failed to send verification email to ${email} (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000; // 2s, 4s
          logger.info(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All attempts failed
    logger.error(`All ${maxRetries} attempts to send verification email to ${email} failed. Last error:`, lastError);
    logger.warn(`Email sending failed for ${email}, but registration will continue`);
  }

  async sendPasswordResetEmail(email: string, token: string, role: string): Promise<void> {
    try {
      if (!email || !token || !role) {
        logger.error('Missing required parameters for password reset email:', { email, token: token ? 'present' : 'missing', role });
        throw new Error('Missing required parameters for password reset email');
      }

      const baseUrl = config.frontendUrls[role] || config.frontendUrl;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      const subject = 'Reset your password';
      const html = `
        <h1>Password Reset Request</h1>
        <p>Please click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2d7ff9;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;margin:16px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `;

      const result = await this.transporter.sendMail({
        from: config.email.from,
        to: email,
        subject,
        html
      });

      logger.info(`Password reset email sent successfully to ${email}`, { messageId: result.messageId });
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      // Don't throw error to prevent blocking the process
      logger.warn(`Password reset email sending failed for ${email}, but process will continue`);
    }
  }

  async sendMail(options: import('nodemailer').SendMailOptions): Promise<void> {
    try {
      if (!options || !options.to || !options.subject) {
        logger.error('Invalid email options provided:', { hasOptions: !!options, hasTo: !!options?.to, hasSubject: !!options?.subject });
        throw new Error('Invalid email options provided');
      }

      await this.transporter.sendMail(options);
      logger.info(`Generic email sent successfully to ${options.to}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      // Don't throw error to prevent blocking the process
      logger.warn('Email sending failed, but process will continue');
    }
  }

  async sendSuperAdminVerifiedAdminNotification(superAdmin: { name: string; email: string; phone: string }): Promise<void> {
    try {
      if (!superAdmin || !superAdmin.name || !superAdmin.email || !superAdmin.phone) {
        logger.error('Invalid super admin data for notification:', { hasSuperAdmin: !!superAdmin, hasName: !!superAdmin?.name, hasEmail: !!superAdmin?.email, hasPhone: !!superAdmin?.phone });
        throw new Error('Invalid super admin data for notification');
      }

      const adminEmail = process.env.CITYFEED_ADMIN_EMAIL;
      if (!adminEmail) {
        logger.error('[EmailService] CITYFEED_ADMIN_EMAIL is not set in environment variables');
        throw new Error('CITYFEED_ADMIN_EMAIL is not set in environment variables');
      }

      const subject = 'Super Admin Registration Verified - Approval Needed';
      const html = `
        <h1>Super Admin Registration Verified</h1>
        <p>A new super admin has registered and is awaiting approval:</p>
        <ul>
          <li><strong>Name:</strong> ${superAdmin.name}</li>
          <li><strong>Email:</strong> ${superAdmin.email}</li>
          <li><strong>Phone:</strong> ${superAdmin.phone}</li>
        </ul>
        <p>Please review and approve the super admin in the admin dashboard.</p>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: adminEmail,
        subject,
        html
      });

      logger.info(`Super admin notification email sent successfully to ${adminEmail}`);
    } catch (error) {
      logger.error('[EmailService] Error sending admin notification email:', error);
      // Don't throw error to prevent blocking the process
      logger.warn('[EmailService] Admin notification email sending failed, but process will continue');
    }
  }

  async sendTicketEmail({ to, event, tickets, userName, startTime, endTime }: { to: string, event: { name: string, date: string, venue: string }, tickets: { qrCodeUrl: string, ticketTierName: string, quantity: number }[], userName: string, startTime?: string, endTime?: string }) {
    try {
      if (!to || !event || !tickets || !userName) {
        logger.error('Missing required parameters for ticket email:', { hasTo: !!to, hasEvent: !!event, hasTickets: !!tickets, hasUserName: !!userName });
        throw new Error('Missing required parameters for ticket email');
      }

      if (!Array.isArray(tickets) || tickets.length === 0) {
        logger.error('Invalid tickets array for ticket email:', { ticketsLength: tickets?.length });
        throw new Error('Invalid tickets array for ticket email');
      }

      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px;">
          <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
            <h2 style="color: #2d7ff9; margin-bottom: 0.5em;">Your Ticket(s) for ${event.name}</h2>
            <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Name:</b> ${userName}</p>
            <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Event:</b> ${event.name}</p>
            <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Date:</b> ${event.date}</p>
            <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Venue:</b> ${event.venue}</p>
            <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Start Time:</b> ${startTime || '-'}</p>
            <p style="font-size: 1.1em; margin-bottom: 1.5em;"><b>End Time:</b> ${endTime || '-'}</p>
            <hr style="margin: 2em 0;"/>
            ${tickets.map((t, i) => `
              <div style="margin-bottom: 2em; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; background: #f6faff;">
                <h4 style="margin: 0 0 0.5em 0; color: #2d7ff9;">Ticket #${i + 1} (${t.ticketTierName})</h4>
                <p style="margin: 0 0 0.5em 0;"><b>Quantity:</b> ${t.quantity}</p>
                <img src="${t.qrCodeUrl}" alt="QR Code" width="180" height="180" style="display:block; border:1px solid #ccc; margin-bottom:8px; border-radius: 4px;">
                <br>
                <a href="${t.qrCodeUrl}" target="_blank" style="color: #2d7ff9; text-decoration: underline;">View QR Code in browser</a>
              </div>
            `).join('')}
            <p style="font-size: 1.1em; color: #333;">Show this email at the event for entry.<br>Enjoy the event!</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject: `Your Ticket(s) for ${event.name}`,
        html
      });

      logger.info(`Ticket email sent successfully to ${to}`);
    } catch (error) {
      logger.error(`Failed to send ticket email to ${to}:`, error);
      // Don't throw error to prevent blocking the process
      logger.warn(`Ticket email sending failed for ${to}, but process will continue`);
    }
  }

  async sendDineInSummaryEmail({
    to,
    userName,
    billAmount,
    coinsUsed,
    cashAmount,
    nonCoinPaymentMethod,
    rewardEarned,
    outletName,
    outletAddress,
    reviewLink,
    pdfBuffer
  }: {
    to: string,
    userName: string,
    billAmount: number,
    coinsUsed: number,
    cashAmount: number,
    nonCoinPaymentMethod: 'upi' | 'cash' | 'card' | null,
    rewardEarned: number,
    outletName: string,
    outletAddress?: string,
    reviewLink: string,
    pdfBuffer?: Buffer
  }) {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!to || !userName || !outletName || !reviewLink) {
          logger.error('Missing required parameters for dine-in summary email:', { hasTo: !!to, hasUserName: !!userName, hasOutletName: !!outletName, hasReviewLink: !!reviewLink });
          throw new Error('Missing required parameters for dine-in summary email');
        }

        if (typeof billAmount !== 'number' || typeof coinsUsed !== 'number' || typeof cashAmount !== 'number' || typeof rewardEarned !== 'number') {
          logger.error('Invalid numeric parameters for dine-in summary email:', { billAmount, coinsUsed, cashAmount, rewardEarned });
          throw new Error('Invalid numeric parameters for dine-in summary email');
        }

        const html = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
              <h2 style="color: #2d7ff9; margin-bottom: 0.5em;">Thank you for dining with CityFeed!</h2>
              <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Name:</b> ${userName}</p>
              <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Outlet:</b> ${outletName}${outletAddress ? `, ${outletAddress}` : ''}</p>
              <hr style="margin: 2em 0;"/>
              <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Bill Amount:</b> ₹${billAmount.toFixed(2)}</p>
              <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Coins Used:</b> ${coinsUsed}</p>
              <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Other Payment Amount:</b> ₹${cashAmount.toFixed(2)}</p>
              <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Other Payment Method:</b> ${nonCoinPaymentMethod ? nonCoinPaymentMethod.toUpperCase() : '-'}</p>
              <p style="font-size: 1.1em; margin-bottom: 0.5em;"><b>Reward Earned:</b> ${rewardEarned} coins</p>
              <hr style="margin: 2em 0;"/>
              <a href="${reviewLink}" style="display:inline-block;padding:12px 24px;background:#2d7ff9;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;margin:16px 0;">Submit Your Review</a>
              <p style="font-size: 1em; color: #888; margin-top: 2em;">We hope you enjoyed your experience. Your feedback helps us improve!</p>
            </div>
          </div>
        `;

        const mailOptions: any = {
          from: config.email.from,
          to,
          subject: `Your CityFeed Dine-In Summary`,
          html
        };

        if (pdfBuffer) {
          mailOptions.attachments = [
            {
              filename: 'DineInSummary.pdf',
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ];
        }

        await this.transporter.sendMail(mailOptions);
        logger.info(`Dine-in summary email sent successfully to ${to} (attempt ${attempt})`);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        logger.error(`Failed to send dine-in summary email to ${to} (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    logger.error(`Failed to send dine-in summary email to ${to} after ${maxRetries} attempts:`, lastError);
    // Don't throw error to prevent blocking the process
    logger.warn(`Dine-in summary email sending failed for ${to}, but process will continue`);
  }

  async sendEventCancellationNotification({ 
    to, 
    userName, 
    eventName, 
    eventDate, 
    cancellationReason, 
    cancellationInstructions 
  }: { 
    to: string, 
    userName: string, 
    eventName: string, 
    eventDate: string, 
    cancellationReason?: string, 
    cancellationInstructions?: string 
  }): Promise<void> {
    try {
      const subject = `Event Cancelled - ${eventName}`;
      
      const reasonText = cancellationReason ? 
        `<p><strong>Reason for Cancellation:</strong> ${cancellationReason}</p>` : '';
      
      const instructionsText = cancellationInstructions ? 
        `<p><strong>Important Information:</strong> ${cancellationInstructions}</p>` : '';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0;">⚠️ Event Cancelled</h2>
          </div>
          
          <p>Dear ${userName},</p>
          
          <p>We regret to inform you that the following event has been cancelled:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Event Details</h3>
            <p><strong>Event Name:</strong> ${eventName}</p>
            <p><strong>Event Date:</strong> ${eventDate}</p>
          </div>
          
          ${reasonText}
          ${instructionsText}
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #155724;">🔄 Refund Information</h4>
            <p style="margin-bottom: 0; color: #155724;"><strong>Your refund has been initiated and will be processed shortly.</strong></p>
            <p style="margin-bottom: 0; color: #155724;">Please allow 5-7 business days for the refund to appear in your account.</p>
          </div>
          
          <p>We apologize for any inconvenience this may cause. If you have any questions about your refund, please don't hesitate to contact our support team.</p>
          
          <p>Thank you for your understanding.</p>
          
          <p>Best regards,<br>CityFeed Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.sendMail({
        to,
        subject,
        html
      });

      logger.info(`Event cancellation notification email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send event cancellation notification email:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance(); 