import sgMail from "@sendgrid/mail";
import { injectable, unmanaged } from "inversify";
import { logger } from "../utils/logger.util";
import { config } from "../config/config";
import { ISuperAdmin } from "../models/superAdmin.model";

export interface ISendGridService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
  sendWelcomeEmail(to: string, name: string): Promise<void>;
  sendVerificationEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void>;
  sendOTPEmail(email: string, otp: string, purpose?: string): Promise<void>;
  sendPasswordResetEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void>;
  sendTicketEmail(data: {
    to: string;
    event: { name: string; date: string; venue: string };
    tickets: { qrCodeUrl: string; ticketTierName: string; quantity: number }[];
    userName: string;
    startTime?: string;
    endTime?: string;
  }): Promise<void>;
  sendDineInSummaryEmail(data: {
    to: string;
    userName: string;
    billAmount: number;
    coinsUsed: number;
    cashAmount: number;
    rewardEarned: number;
    outletName: string;
    outletAddress?: string;
    reviewLink: string;
    pdfBuffer?: Buffer;
  }): Promise<void>;
  sendSuperAdminVerifiedAdmin(admin: {
    name: string;
    email: string;
    phone: string;
  }): Promise<void>;
  sendEventCancellationNotification(data: {
    to: string;
    userName: string;
    eventName: string;
    eventDate: string;
    cancellationReason?: string;
    cancellationInstructions?: string;
  }): Promise<void>;

  sendSuperAdminVerifiedAdminNotification(
    superAdmin: ISuperAdmin
  ): Promise<void>;
}

@injectable()
export class SendGridService implements ISendGridService {
  private static instance: SendGridService;
  private isInitialized = false;

  constructor(@unmanaged() private fromEmail?: string) {
    this.initialize();
  }

  async sendSuperAdminVerifiedAdminNotification(superAdmin: {
    name: string;
    email: string;
    phone: string;
  }): Promise<void> {
    try {
      if (
        !superAdmin ||
        !superAdmin.name ||
        !superAdmin.email ||
        !superAdmin.phone
      ) {
        logger.error("Invalid super admin data for notification:", {
          hasSuperAdmin: !!superAdmin,
          hasName: !!superAdmin?.name,
          hasEmail: !!superAdmin?.email,
          hasPhone: !!superAdmin?.phone,
        });
        throw new Error("Invalid super admin data for notification");
      }

      const adminEmail = process.env.CITYFEED_ADMIN_EMAIL;
      if (!adminEmail) {
        logger.error(
          "[SendGridService] CITYFEED_ADMIN_EMAIL is not set in environment variables"
        );
        throw new Error(
          "CITYFEED_ADMIN_EMAIL is not set in environment variables"
        );
      }

      const subject = "Super Admin Registration Verified - Approval Needed";
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
        html,
      });

      logger.info(
        `SendGrid super admin notification email sent successfully to ${adminEmail}`
      );
    } catch (error) {
      logger.error(
        "[SendGridService] Error sending admin notification email:",
        error
      );
      throw error;
    }
  }

  private initialize(): void {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        logger.error("SendGrid API key not found in environment variables");
        throw new Error("SendGrid API key is required");
      }
      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      logger.info("SendGrid service initialized successfully");
      this.fromEmail =
        this.fromEmail ||
        process.env.SENDGRID_FROM_EMAIL ||
        config.email.from ||
        "noreply@cityfeed.com";
    } catch (error) {
      logger.error("Failed to initialize SendGrid service:", error);
      throw new Error("SendGrid service initialization failed");
    }
  }

  public static getInstance(): SendGridService {
    if (!SendGridService.instance) {
      SendGridService.instance = new SendGridService();
    }
    return SendGridService.instance;
  }

  public async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    await this.sendMail({ to, subject, html });
  }

  public async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = "Welcome to CityFeed!";
    const html = `<h1>Welcome to CityFeed, ${name}!</h1>
      <p>Thank you for joining CityFeed. We're excited to have you on board!</p>
      <p>Discover local events and more in your city!</p>`;
    await this.sendEmail(to, subject, html);
  }

  public async sendVerificationEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void> {
    try {
      const baseUrl = config.frontendUrls[role] || config.frontendUrl;
      const verificationUrl = `${baseUrl}/verify-email?token=${token}&role=${role}`;
      const subject = "Verify your email address";
      const html = `<h1>Welcome to CityFeed!</h1>
        <p>Verify your email by clicking below:</p>
        <a href="${verificationUrl}" style="padding:12px 24px;background:#2d7ff9;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
        <p>This link expires in 24 hours.</p>`;
      await this.sendMail({ to: email, subject, html });
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  public async sendOTPEmail(
    email: string,
    otp: string,
    purpose = "verification"
  ): Promise<void> {
    try {
      let subject = "CityFeed Verification Code";
      let html: string;

      if (purpose === "event_cancellation") {
        subject = "Event Cancellation Verification Code";
        html = `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#f39c12;">Your verification code:</h2>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</p>
          <p>This code expires in 5 minutes.</p>
          <p>Do not share this code with anyone.</p>
        </div>`;
      } else {
        html = `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>
        <p>Do not share this code with anyone.</p>`;
      }

      await this.sendMail({ to: email, subject, html });
      logger.info(`OTP email sent to ${email} for purpose ${purpose}`);
    } catch (error) {
      logger.error(`Failed to send OTP email to ${email}`, error);
      throw error;
    }
  }

  public async sendPasswordResetEmail(
    email: string,
    token: string,
    role: string
  ): Promise<void> {
    try {
      const baseUrl = config.frontendUrls[role] || config.frontendUrl;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      const subject = "Reset your password";
      const html = `<h1>Password Reset Request</h1>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="padding:12px 24px;background:#2d7ff9;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
        <p>This link expires in 1 hour.</p>`;
      await this.sendMail({ to: email, subject, html });
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }

  public async sendTicketEmail(data: {
    to: string;
    event: { name: string; date: string; venue: string };
    tickets: { qrCodeUrl: string; ticketTierName: string; quantity: number }[];
    userName: string;
    startTime?: string;
    endTime?: string;
  }): Promise<void> {
    try {
      const { to, event, tickets, userName, startTime, endTime } = data;
      const ticketsHtml = tickets
        .map(
          (ticket, idx) => `
          <div style="padding:10px; border:1px solid #ccc; border-radius:8px; margin-bottom:16px;">
            <h4>Ticket #${idx + 1} - ${ticket.ticketTierName}</h4>
            <p>Quantity: ${ticket.quantity}</p>
            <img src="${
              ticket.qrCodeUrl
            }" alt="QR code" width="180" height="180" style="display:block;margin-bottom:8px;" />
            <a href="${ticket.qrCodeUrl}">View QR code</a>
          </div>`
        )
        .join("");

      const html = `<div style="font-family:sans-serif; max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px;">
        <h2>Your Tickets for ${event.name}</h2>
        <p>Name: ${userName}</p>
        <p>Date: ${event.date}</p>
        <p>Venue: ${event.venue}</p>
        <p>Start Time: ${startTime || "-"}</p>
        <p>End Time: ${endTime || "-"}</p>
        <hr />
        ${ticketsHtml}
        <p>Please show this email at the event entrance.</p>
        <p>Enjoy your event!</p>
      </div>`;

      await this.sendMail({
        to,
        subject: `Your Tickets for ${event.name}`,
        html,
      });
      logger.info(`Ticket email sent to ${to}`);
    } catch (error) {
      logger.error("Failed to send ticket email", error);
      throw error;
    }
  }

  public async sendDineInSummaryEmail(data: {
    to: string;
    userName: string;
    billAmount: number;
    coinsUsed: number;
    cashAmount: number;
    nonCoinPaymentMethod?: string;
    rewardEarned: number;
    outletName: string;
    outletAddress?: string;
    reviewLink: string;
    pdfBuffer?: Buffer;
  }): Promise<void> {
    try {
      const {
        to,
        userName,
        billAmount,
        coinsUsed,
        cashAmount,
        rewardEarned,
        outletName,
        outletAddress,
        reviewLink,
        pdfBuffer,
      } = data;

      const html = `<div style="font-family:sans-serif; max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px;">
        <h2>Thank You for Dining at ${outletName}</h2>
        <p>Hi ${userName},</p>
        <p>Your bill amount was ₹${billAmount.toFixed(2)}.</p>
        <p>Coins Used: ${coinsUsed}</p>
        <p>Cash/Card/UPI Paid: ₹${cashAmount.toFixed(2)}</p>
        <p>Reward Coins Earned: ${rewardEarned}</p>
        ${outletAddress ? `<p>Address: ${outletAddress}</p>` : ""}
        <p><a href="${reviewLink}" style="padding:12px 24px; background:#2d7ff9; color:#fff; text-decoration:none; border-radius:6px;">Leave a Review</a></p>
      </div>`;

      const attachments = pdfBuffer
        ? [
            {
              content: pdfBuffer.toString("base64"),
              filename: `dine_in_summary_${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`,
              type: "application/pdf",
              disposition: "attachment",
            },
          ]
        : undefined;

      await this.sendMail({
        to,
        subject: `Your Dine-In Summary from ${outletName}`,
        html,
        attachments,
      });

      logger.info(`Dine-in summary email sent to ${to}`);
    } catch (error) {
      logger.error("Failed to send dine-in summary email", error);
      throw error;
    }
  }

  public async sendSuperAdminVerifiedAdmin(admin: {
    name: string;
    email: string;
    phone: string;
  }): Promise<void> {
    try {
      if (!admin.name || !admin.email || !admin.phone) {
        throw new Error("Incomplete admin data for notification");
      }

      const adminEmail = process.env.CITYFEED_ADMIN_EMAIL;
      if (!adminEmail) {
        throw new Error("CITYFEED_ADMIN_EMAIL not configured");
      }

      const subject = "New Super Admin Registration - Approval Needed";
      const html = `<h1>New Super Admin Registration</h1>
        <p>Please review the following super admin registration requiring approval:</p>
        <ul>
          <li>Name: ${admin.name}</li>
          <li>Email: ${admin.email}</li>
          <li>Phone: ${admin.phone}</li>
        </ul>
        <p>Log in to the admin dashboard to approve or reject.</p>`;

      await this.sendMail({ to: adminEmail, subject, html });
      logger.info(`Super admin notification sent to ${adminEmail}`);
    } catch (error) {
      logger.error("Failed to send super admin notification email", error);
      throw error;
    }
  }

  public async sendEventCancellationNotification(data: {
    to: string;
    userName: string;
    eventName: string;
    eventDate: string;
    cancellationReason?: string;
    cancellationInstructions?: string;
  }): Promise<void> {
    try {
      const {
        to,
        userName,
        eventName,
        eventDate,
        cancellationReason,
        cancellationInstructions,
      } = data;

      const subject = `Event Cancelled: ${eventName}`;

      const html = `<div style="font-family:sans-serif; max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px;">
        <h2>Event Cancellation Notice</h2>
        <p>Dear ${userName},</p>
        <p>We regret to inform you that the event <strong>${eventName}</strong> scheduled for <strong>${eventDate}</strong> has been cancelled.</p>
        ${
          cancellationReason
            ? `<p><strong>Reason:</strong> ${cancellationReason}</p>`
            : ""
        }
        ${
          cancellationInstructions
            ? `<p><strong>Instructions:</strong> ${cancellationInstructions}</p>`
            : ""
        }
        <p>Refunds, if applicable, are being processed. Contact support if you have questions.</p>
        <p>Thank you for your understanding.</p>
      </div>`;

      await this.sendMail({ to, subject, html });
      logger.info(`Event cancellation notification sent to ${to}`);
    } catch (error) {
      logger.error("Failed to send event cancellation notification", error);
      throw error;
    }
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    text?: string;
    attachments?: Array<{
      content: string;
      filename: string;
      type: string;
      disposition: string;
    }>;
  }): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SendGrid API key missing");
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg: any = {
      to: options.to,
      from:
        options.from ||
        process.env.SENDGRID_FROM_EMAIL ||
        config.email.from ||
        "noreply@cityfeed.com",
      subject: options.subject,
      html: options.html,
    };

    if (options.attachments) {
      msg.attachments = options.attachments;
    }

    try {
      await sgMail.send(msg);
    } catch (error) {
      logger.error("SendGrid send error", error);
      throw error;
    }
  }
}
