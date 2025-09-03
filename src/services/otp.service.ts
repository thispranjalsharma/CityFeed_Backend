import twilio from 'twilio';
import { AppErrorClass } from '../utils/appError';
import { logger } from '../utils/logger.util';
import { EmailService } from './email.service';

// Store OTPs in memory for each phone number
const otpStore: { [phone: string]: { otp: string, expiresAt: number } } = {};

export class OTPService {
  private client: twilio.Twilio | null = null;
  private emailService: EmailService;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly OTP_LENGTH = 6;
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  constructor() {
    // Initialize Twilio client with credentials
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      logger.error('Twilio credentials missing');
      throw new Error('Twilio configuration is missing');
    }
    
    // Initialize email service
    this.emailService = EmailService.getInstance();
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTP(phoneNumber: string): Promise<string> {
    try {
      const otp = this.generateOTP();
      // Always send SMS, even in development
      if (!this.client) {
        throw new AppErrorClass('SMS service is not configured', 503);
      }
      // Format phone number to ensure it has country code
      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      try {
        await this.client.messages.create({
          body: `Your CityFeed verification code is: ${otp}. This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.`,
          to: formattedPhoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER
        });
        // Store OTP in memory with expiry using normalized phone number
        otpStore[formattedPhoneNumber] = { otp, expiresAt: Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000 };
        return otp;
      } catch (twilioError: any) {
        logger.error('Twilio Error Details:', {
          code: twilioError.code,
          message: twilioError.message,
          moreInfo: twilioError.moreInfo,
          status: twilioError.status
        });
        // Handle specific Twilio error codes
        switch (twilioError.code) {
          case 21211:
            throw new AppErrorClass('Invalid phone number format', 400);
          case 21214:
            throw new AppErrorClass('Phone number is not mobile', 400);
          case 21408:
            throw new AppErrorClass('SMS not enabled for this region. Please verify your phone number in Twilio console.', 503);
          case 21608:
            throw new AppErrorClass('Phone number unverified. Please verify your phone number in Twilio console.', 400);
          case 21614:
            throw new AppErrorClass('Phone number is not valid', 400);
          default:
            throw new AppErrorClass('Failed to send OTP. Please try again later.', 500);
        }
      }
    } catch (error) {
      logger.error('Error in sendOTP:', error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass('Failed to send OTP', 500);
    }
  }

  async sendOTPToPhoneAndEmail(phoneNumber: string, email: string): Promise<string> {
    try {
      const otp = this.generateOTP();
      
      // Format phone number to ensure it has country code
      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      let smsSuccess = false;
      let emailSuccess = false;
      let smsError: any = null;
      let emailError: any = null;

      // Try to send SMS
      if (this.client) {
        try {
          await this.client.messages.create({
            body: `Your CityFeed payment verification code is: ${otp}. This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.`,
            to: formattedPhoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
          });
          smsSuccess = true;
          logger.info(`OTP sent successfully to phone: ${formattedPhoneNumber}`);
        } catch (twilioError: any) {
          smsError = twilioError;
          logger.error('Failed to send SMS OTP:', {
            code: twilioError.code,
            message: twilioError.message,
            phone: formattedPhoneNumber
          });
        }
      } else {
        smsError = new Error('SMS service not configured');
        logger.warn('SMS service not configured, skipping SMS OTP');
      }

      // Try to send email
      try {
        const emailHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
              <h2 style="color: #2d7ff9; margin-bottom: 1em;">Payment Verification Code</h2>
              <p style="font-size: 1.1em; margin-bottom: 1em;">Your CityFeed payment verification code is:</p>
              <div style="text-align: center; margin: 2em 0;">
                <span style="display: inline-block; padding: 16px 32px; background: #f0f8ff; border: 2px solid #2d7ff9; border-radius: 8px; font-size: 32px; font-weight: bold; color: #2d7ff9; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="font-size: 1em; margin-bottom: 0.5em;">This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
              <p style="font-size: 1em; color: #888;">Please use this code to verify your dine-in payment. Do not share this code with anyone.</p>
            </div>
          </div>
        `;

        await this.emailService.sendMail({
          to: email,
          subject: 'CityFeed Payment Verification Code',
          html: emailHtml
        });
        emailSuccess = true;
        logger.info(`OTP sent successfully to email: ${email}`);
      } catch (error: any) {
        emailError = error;
        logger.error('Failed to send email OTP:', {
          error: error.message,
          email: email
        });
      }

      // Store OTP if at least one method succeeded
      if (smsSuccess || emailSuccess) {
        otpStore[formattedPhoneNumber] = { otp, expiresAt: Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000 };
        
        // Log success status
        const successMethods = [];
        if (smsSuccess) successMethods.push('SMS');
        if (emailSuccess) successMethods.push('Email');
        
        logger.info(`OTP sent successfully via: ${successMethods.join(', ')}`);
        return otp;
      } else {
        // Both methods failed
        logger.error('Failed to send OTP via both SMS and email', { smsError, emailError });
        
        // Prioritize SMS errors for user-facing messages since it's the primary method
        if (smsError && smsError.code) {
          switch (smsError.code) {
            case 21211:
              throw new AppErrorClass('Invalid phone number format', 400);
            case 21214:
              throw new AppErrorClass('Phone number is not mobile', 400);
            case 21408:
              throw new AppErrorClass('SMS not enabled for this region. Please verify your phone number in Twilio console.', 503);
            case 21608:
              throw new AppErrorClass('Phone number unverified. Please verify your phone number in Twilio console.', 400);
            case 21614:
              throw new AppErrorClass('Phone number is not valid', 400);
            default:
              throw new AppErrorClass('Failed to send verification code. Please try again later.', 500);
          }
        } else {
          throw new AppErrorClass('Failed to send verification code. Please try again later.', 500);
        }
      }
    } catch (error) {
      logger.error('Error in sendOTPToPhoneAndEmail:', error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass('Failed to send verification code', 500);
    }
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      // Normalize phone number to match storage
      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const record = otpStore[formattedPhoneNumber];
      if (!record) return false;
      if (Date.now() > record.expiresAt) {
        delete otpStore[formattedPhoneNumber];
        return false;
      }
      const isValid = otp === record.otp;
      if (isValid) delete otpStore[formattedPhoneNumber];
      return isValid;
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw new AppErrorClass('Failed to verify OTP', 500);
    }
  }

  /**
   * Send OTP to email only (for event cancellation verification)
   */
  async sendOTPToEmail(email: string, purpose: string = 'verification'): Promise<string> {
    try {
      const otp = this.generateOTP();
      
      // Create email-specific OTP storage key
      const emailKey = `email_${email}_${purpose}`;
      
      try {
        const emailHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
              <h2 style="color: #2d7ff9; margin-bottom: 1em;">Event Cancellation Verification Code</h2>
              <p style="font-size: 1.1em; margin-bottom: 1em;">Your CityFeed event cancellation verification code is:</p>
              <div style="text-align: center; margin: 2em 0;">
                <span style="display: inline-block; padding: 16px 32px; background: #f0f8ff; border: 2px solid #2d7ff9; border-radius: 8px; font-size: 32px; font-weight: bold; color: #2d7ff9; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="font-size: 1em; margin-bottom: 0.5em;">This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
              <p style="font-size: 1em; color: #888;">Please use this code to verify your event cancellation request. Do not share this code with anyone.</p>
              <div style="margin-top: 2em; padding: 16px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Security Notice:</p>
                <p style="margin: 0.5em 0 0 0; color: #856404;">This code is required to cancel your event. If you did not request this cancellation, please contact support immediately.</p>
              </div>
            </div>
          </div>
        `;

        await this.emailService.sendMail({
          to: email,
          subject: 'CityFeed Event Cancellation Verification Code',
          html: emailHtml
        });

        // Store OTP in memory with expiry using email key
        otpStore[emailKey] = { otp, expiresAt: Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000 };
        
        logger.info(`Event cancellation OTP sent successfully to email: ${email}`);
        return otp;
      } catch (error: any) {
        logger.error('Failed to send email OTP for event cancellation:', {
          error: error.message,
          email: email
        });
        throw new AppErrorClass('Failed to send verification code to email. Please try again later.', 500);
      }
    } catch (error) {
      logger.error('Error in sendOTPToEmail:', error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass('Failed to send verification code', 500);
    }
  }

  /**
   * Verify OTP sent to email (for event cancellation verification)
   */
  async verifyEmailOTP(email: string, otp: string, purpose: string = 'verification'): Promise<boolean> {
    try {
      const emailKey = `email_${email}_${purpose}`;
      const record = otpStore[emailKey];
      
      if (!record) return false;
      
      if (Date.now() > record.expiresAt) {
        delete otpStore[emailKey];
        return false;
      }
      
      const isValid = otp === record.otp;
      if (isValid) delete otpStore[emailKey];
      
      return isValid;
    } catch (error) {
      logger.error('Error verifying email OTP:', error);
      throw new AppErrorClass('Failed to verify OTP', 500);
    }
  }
} 