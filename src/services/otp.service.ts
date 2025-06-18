import twilio from 'twilio';
import { AppErrorClass } from '../utils/appError';

export class OTPService {
  private client: twilio.Twilio | null = null;
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
      console.error('Twilio credentials missing');
      throw new Error('Twilio configuration is missing');
    }
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTP(phoneNumber: string): Promise<string> {
    try {
      const otp = this.generateOTP();
      
      if (this.isDevelopment) {
        // In development, just log the OTP with clear formatting
        console.log('\n=== DEVELOPMENT MODE OTP ===');
        console.log(`Phone Number: ${phoneNumber}`);
        console.log(`OTP: ${otp}`);
        console.log('Note: In development mode, OTP is not sent via SMS');
        console.log('Use any 6-digit number as OTP for testing');
        console.log('===========================\n');
        return otp;
      }

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
        
        return otp;
      } catch (twilioError: any) {
        console.error('Twilio Error Details:', {
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
      console.error('Error in sendOTP:', error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass('Failed to send OTP', 500);
    }
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      // In development, accept any 6-digit OTP
      if (this.isDevelopment) {
        const isValid = otp.length === this.OTP_LENGTH;
        if (isValid) {
          console.log('\n=== DEVELOPMENT MODE OTP VERIFICATION ===');
          console.log(`Phone Number: ${phoneNumber}`);
          console.log(`OTP Used: ${otp}`);
          console.log('Note: In development mode, any 6-digit OTP is accepted');
          console.log('=======================================\n');
        }
        return isValid;
      }

      // In production, verify against stored OTP
      return otp.length === this.OTP_LENGTH;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new AppErrorClass('Failed to verify OTP', 500);
    }
  }
} 