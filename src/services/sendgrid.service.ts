import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger.util';
import { config } from '../config/config';

export class SendGridService {
  private static instance: SendGridService;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        logger.error('SendGrid API key not found in environment variables');
        throw new Error('SendGrid API key is required');
      }

      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      logger.info('SendGrid service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SendGrid service:', error);
      throw new Error('SendGrid service initialization failed');
    }
  }

  public static getInstance(): SendGridService {
    if (!SendGridService.instance) {
      SendGridService.instance = new SendGridService();
    }
    return SendGridService.instance;
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SendGrid service not initialized');
    }

    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const msg = {
          to: options.to,
          from: options.from || process.env.SENDGRID_FROM_EMAIL || config.email.from || 'noreply@cityfeed.com',
          subject: options.subject,
          text: options.text,
          html: options.html,
        };

        logger.info(`Attempting to send email via SendGrid to ${options.to} (attempt ${attempt}/${maxRetries})`);
        
        await sgMail.send(msg);
        logger.info(`SendGrid email sent successfully to ${options.to} (attempt ${attempt})`);
        return; // Success, exit the retry loop
        
      } catch (error: any) {
        lastError = error;
        logger.error(`Failed to send SendGrid email to ${options.to} (attempt ${attempt}/${maxRetries}):`, {
          error: error.message,
          code: error.code,
          response: error.response?.body
        });
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000; // 2s, 4s
          logger.info(`Waiting ${waitTime}ms before SendGrid retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All attempts failed
    logger.error(`All ${maxRetries} attempts to send SendGrid email to ${options.to} failed. Last error:`, lastError);
    throw new Error(`SendGrid email sending failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  async sendVerificationEmail(email: string, token: string, role: string): Promise<void> {
    try {
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

      await this.sendMail({
        to: email,
        subject,
        html
      });

      logger.info(`SendGrid verification email sent successfully to ${email}`);
    } catch (error) {
      logger.error(`Failed to send SendGrid verification email to ${email}:`, error);
      throw error;
    }
  }

  async sendOTPEmail(email: string, otp: string, purpose: string = 'verification'): Promise<void> {
    try {
      let subject = 'CityFeed Verification Code';
      let html = '';

      if (purpose === 'event_cancellation') {
        subject = 'CityFeed Event Cancellation Verification Code';
        html = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
              <h2 style="color: #2d7ff9; margin-bottom: 1em;">Event Cancellation Verification Code</h2>
              <p style="font-size: 1.1em; margin-bottom: 1em;">Your CityFeed event cancellation verification code is:</p>
              <div style="text-align: center; margin: 2em 0;">
                <span style="display: inline-block; padding: 16px 32px; background: #f0f8ff; border: 2px solid #2d7ff9; border-radius: 8px; font-size: 32px; font-weight: bold; color: #2d7ff9; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="font-size: 1em; margin-bottom: 0.5em;">This code will expire in 5 minutes.</p>
              <p style="font-size: 1em; color: #888;">Please use this code to verify your event cancellation request. Do not share this code with anyone.</p>
              <div style="margin-top: 2em; padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Security Notice:</p>
                <p style="margin: 0.5em 0 0 0; color: #856404;">This code is required to cancel your event. If you did not request this cancellation, please contact support immediately.</p>
              </div>
            </div>
          </div>
        `;
      } else {
        html = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
              <h2 style="color: #2d7ff9; margin-bottom: 1em;">Verification Code</h2>
              <p style="font-size: 1.1em; margin-bottom: 1em;">Your CityFeed verification code is:</p>
              <div style="text-align: center; margin: 2em 0;">
                <span style="display: inline-block; padding: 16px 32px; background: #f0f8ff; border: 2px solid #2d7ff9; border-radius: 8px; font-size: 32px; font-weight: bold; color: #2d7ff9; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="font-size: 1em; margin-bottom: 0.5em;">This code will expire in 5 minutes.</p>
              <p style="font-size: 1em; color: #888;">Please use this code to verify your request. Do not share this code with anyone.</p>
            </div>
          </div>
        `;
      }

      await this.sendMail({
        to: email,
        subject,
        html
      });

      logger.info(`SendGrid OTP email sent successfully to ${email} for ${purpose}`);
    } catch (error) {
      logger.error(`Failed to send SendGrid OTP email to ${email}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, role: string): Promise<void> {
    try {
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

      await this.sendMail({
        to: email,
        subject,
        html
      });

      logger.info(`SendGrid password reset email sent successfully to ${email}`);
    } catch (error) {
      logger.error(`Failed to send SendGrid password reset email to ${email}:`, error);
      throw error;
    }
  }

  async sendTicketEmail({ to, event, tickets, userName, startTime, endTime }: { 
    to: string, 
    event: { name: string, date: string, venue: string }, 
    tickets: { qrCodeUrl: string, ticketTierName: string, quantity: number }[], 
    userName: string, 
    startTime?: string, 
    endTime?: string 
  }): Promise<void> {
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

      await this.sendMail({
        to,
        subject: `Your Ticket(s) for ${event.name}`,
        html
      });

      logger.info(`SendGrid ticket email sent successfully to ${to}`);
    } catch (error) {
      logger.error(`Failed to send SendGrid ticket email to ${to}:`, error);
      throw error;
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
  }): Promise<void> {
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

      await this.sendMail({
        to,
        subject: `Your CityFeed Dine-In Summary`,
        html
      });

      logger.info(`SendGrid dine-in summary email sent successfully to ${to}`);
    } catch (error) {
      logger.error(`Failed to send SendGrid dine-in summary email to ${to}:`, error);
      throw error;
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
        logger.error('[SendGridService] CITYFEED_ADMIN_EMAIL is not set in environment variables');
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

      await this.sendMail({
        to: adminEmail,
        subject,
        html
      });

      logger.info(`SendGrid super admin notification email sent successfully to ${adminEmail}`);
    } catch (error) {
      logger.error('[SendGridService] Error sending admin notification email:', error);
      throw error;
    }
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

      logger.info(`SendGrid event cancellation notification email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send SendGrid event cancellation notification email:', error);
      throw error;
    }
  }
}
