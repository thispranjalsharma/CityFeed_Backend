import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
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

      const result = await this.transporter.sendMail({
        from: config.email.from,
        to: email,
        subject,
        html
      });

      logger.info(`Verification email sent successfully to ${email}`, { messageId: result.messageId });
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
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

      const result = await this.transporter.sendMail({
        from: config.email.from,
        to: email,
        subject,
        html
      });

      logger.info(`Password reset email sent successfully to ${email}`, { messageId: result.messageId });
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendMail(options: import('nodemailer').SendMailOptions): Promise<void> {
    await this.transporter.sendMail(options);
  }

  async sendSuperAdminVerifiedAdminNotification(superAdmin: { name: string; email: string; phone: string }): Promise<void> {
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
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: adminEmail,
        subject,
        html
      });
    } catch (error) {
      logger.error('[EmailService] Error sending admin notification email:', error);
      throw error;
    }
  }

  async sendTicketEmail({ to, event, tickets, userName, startTime, endTime }: { to: string, event: { name: string, date: string, venue: string }, tickets: { qrCodeUrl: string, ticketTierName: string, quantity: number }[], userName: string, startTime?: string, endTime?: string }) {
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
  }
} 