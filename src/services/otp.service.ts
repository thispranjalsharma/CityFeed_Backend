import twilio from 'twilio';
import { AppErrorClass } from '../utils/appError';

export class OTPService {
  private client: twilio.Twilio | null = null;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly OTP_LENGTH = 6;
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  constructor() {
    // Only initialize Twilio client if credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else if (!this.isDevelopment) {
      // In production, throw error if Twilio is not configured
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
        // In development, just log the OTP
        console.log(`[Development] OTP for ${phoneNumber}: ${otp}`);
        return otp;
      }

      if (!this.client) {
        throw new AppErrorClass('SMS service is not configured', 503);
      }

      await this.client.messages.create({
        body: `Your CityFeed verification code is: ${otp}. This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      return otp;
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new AppErrorClass('Failed to send OTP', 500);
    }
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      if (this.isDevelopment) {
        // In development, accept any 6-digit OTP
        return otp.length === this.OTP_LENGTH;
      }

      // In production, you would verify against stored OTP
      // For now, we'll just check the length
      return otp.length === this.OTP_LENGTH;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new AppErrorClass('Failed to verify OTP', 500);
    }
  }
} 