import twilio from "twilio";
import { AppErrorClass } from "../utils/appError";
import { logger } from "../utils/logger.util";
import { SendGridService } from "./sendgrid.service";
import { inject, injectable } from "inversify";

// Store OTPs in memory for each phone number
const otpStore: { [phone: string]: { otp: string; expiresAt: number } } = {};

export interface IOtpService {
  sendOTP(phoneNumber: string): Promise<string>;
  sendOTPToEmail(email: string, purpose?: string): Promise<string>;
  sendOTPToPhoneAndEmail(phoneNumber: string, email: string): Promise<string>;
  verifyHash(otp: string, hash: string, phoneNumber: string): Promise<boolean>;
  verifyEmailOTP(
    email: string,
    otp: string,
    purpose?: string
  ): Promise<boolean>;

  verifyOTP(otp: string, phoneNumber: string): Promise<boolean>;
}

@injectable()
export class OTPService implements IOtpService {
  private client: twilio.Twilio | null = null;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly OTP_LENGTH = 6;
  private readonly isDevelopment = process.env.NODE_ENV === "development";
  private static instance: OTPService;

  constructor(
    @inject("SendGridService") private readonly sendGridService: SendGridService
  ) {
    // Initialize Twilio client with credentials
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      logger.error("Twilio credentials missing");
      throw new Error("Twilio configuration is missing");
    }
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      // Normalize phone number to match storage
      const formattedPhoneNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;
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
      logger.error("Error verifying OTP:", error);
      throw new AppErrorClass("Failed to verify OTP", 500);
    }
  }

  public static getInstance(sendGridService: SendGridService): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService(sendGridService);
    }
    return OTPService.instance;
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTP(phoneNumber: string): Promise<string> {
    try {
      const otp = this.generateOTP();
      // Always send SMS, even in development
      if (!this.client) {
        throw new AppErrorClass("SMS service is not configured", 503);
      }
      // Format phone number to ensure it has country code
      const formattedPhoneNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;
      try {
        await this.client.messages.create({
          body: `Your CityFeed verification code is: ${otp}. This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.`,
          to: formattedPhoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
        });
        // Store OTP in memory with expiry using normalized phone number
        otpStore[formattedPhoneNumber] = {
          otp,
          expiresAt: Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
        };
        return otp;
      } catch (twilioError: any) {
        logger.error("Twilio Error Details:", {
          code: twilioError.code,
          message: twilioError.message,
          moreInfo: twilioError.moreInfo,
          status: twilioError.status,
        });
        // Handle specific Twilio error codes
        switch (twilioError.code) {
          case 21211:
            throw new AppErrorClass("Invalid phone number format", 400);
          case 21214:
            throw new AppErrorClass("Phone number is not mobile", 400);
          case 21408:
            throw new AppErrorClass(
              "SMS not enabled for this region. Please verify your phone number in Twilio console.",
              503
            );
          case 21608:
            throw new AppErrorClass(
              "Phone number unverified. Please verify your phone number in Twilio console.",
              400
            );
          case 21614:
            throw new AppErrorClass("Phone number is not valid", 400);
          default:
            throw new AppErrorClass(
              "Failed to send OTP. Please try again later.",
              500
            );
        }
      }
    } catch (error) {
      logger.error("Error in sendOTP:", error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass("Failed to send OTP", 500);
    }
  }

  async sendOTPToPhoneAndEmail(
    phoneNumber: string,
    email: string
  ): Promise<string> {
    try {
      const otp = this.generateOTP();

      // Format phone number to ensure it has country code
      const formattedPhoneNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

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
            from: process.env.TWILIO_PHONE_NUMBER,
          });
          smsSuccess = true;
          logger.info(
            `OTP sent successfully to phone: ${formattedPhoneNumber}`
          );
        } catch (twilioError: any) {
          smsError = twilioError;
          logger.error("Failed to send SMS OTP:", {
            code: twilioError.code,
            message: twilioError.message,
            phone: formattedPhoneNumber,
          });
        }
      } else {
        smsError = new Error("SMS service not configured");
        logger.warn("SMS service not configured, skipping SMS OTP");
      }

      // Try to send email
      try {
        await this.sendGridService.sendOTPEmail(
          email,
          otp,
          "payment_verification"
        );
        emailSuccess = true;
        logger.info(`OTP sent successfully to email: ${email}`);
      } catch (error: any) {
        emailError = error;
        logger.error("Failed to send email OTP:", {
          error: error.message,
          email: email,
        });
      }

      // Store OTP if at least one method succeeded
      if (smsSuccess || emailSuccess) {
        otpStore[formattedPhoneNumber] = {
          otp,
          expiresAt: Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
        };

        // Log success status
        const successMethods = [];
        if (smsSuccess) successMethods.push("SMS");
        if (emailSuccess) successMethods.push("Email");

        logger.info(`OTP sent successfully via: ${successMethods.join(", ")}`);
        return otp;
      } else {
        // Both methods failed
        logger.error("Failed to send OTP via both SMS and email", {
          smsError,
          emailError,
        });

        // Prioritize SMS errors for user-facing messages since it's the primary method
        if (smsError && smsError.code) {
          switch (smsError.code) {
            case 21211:
              throw new AppErrorClass("Invalid phone number format", 400);
            case 21214:
              throw new AppErrorClass("Phone number is not mobile", 400);
            case 21408:
              throw new AppErrorClass(
                "SMS not enabled for this region. Please verify your phone number in Twilio console.",
                503
              );
            case 21608:
              throw new AppErrorClass(
                "Phone number unverified. Please verify your phone number in Twilio console.",
                400
              );
            case 21614:
              throw new AppErrorClass("Phone number is not valid", 400);
            default:
              throw new AppErrorClass(
                "Failed to send verification code. Please try again later.",
                500
              );
          }
        } else {
          throw new AppErrorClass(
            "Failed to send verification code. Please try again later.",
            500
          );
        }
      }
    } catch (error) {
      logger.error("Error in sendOTPToPhoneAndEmail:", error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass("Failed to send verification code", 500);
    }
  }

  async verifyHash(
    phoneNumber: string,
    hash: string,
    otp: string
  ): Promise<boolean> {
    try {
      // Normalize phone number to match storage
      const formattedPhoneNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;
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
      logger.error("Error verifying OTP:", error);
      throw new AppErrorClass("Failed to verify OTP", 500);
    }
  }

  /**
   * Send OTP to email only (for event cancellation verification)
   */
  async sendOTPToEmail(
    email: string,
    purpose: string = "verification"
  ): Promise<string> {
    try {
      const otp = this.generateOTP();

      // Create email-specific OTP storage key
      const emailKey = `email_${email}_${purpose}`;

      try {
        // Send via SendGrid
        await this.sendGridService.sendOTPEmail(
          email,
          otp,
          "event_cancellation"
        );
        logger.info(
          `Event cancellation OTP sent successfully via SendGrid to email: ${email}`
        );

        // Store OTP in memory with expiry using email key
        otpStore[emailKey] = {
          otp,
          expiresAt: Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
        };

        return otp;
      } catch (error: any) {
        logger.error("Failed to send email OTP for event cancellation:", {
          error: error.message,
          email: email,
        });
        throw new AppErrorClass(
          "Failed to send verification code to email. Please try again later.",
          500
        );
      }
    } catch (error) {
      logger.error("Error in sendOTPToEmail:", error);
      if (error instanceof AppErrorClass) {
        throw error;
      }
      throw new AppErrorClass("Failed to send verification code", 500);
    }
  }

  /**
   * Verify OTP sent to email (for event cancellation verification)
   */
  async verifyEmailOTP(
    email: string,
    otp: string,
    purpose: string = "verification"
  ): Promise<boolean> {
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
      logger.error("Error verifying email OTP:", error);
      throw new AppErrorClass("Failed to verify OTP", 500);
    }
  }
}
