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
          from: options.from || config.email.from || 'noreply@cityfeed.com',
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
}
