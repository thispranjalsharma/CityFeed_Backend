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
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
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
        <p>Please click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
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

  async sendTicketEmail({ to, event, tickets }: { to: string, event: { name: string, date: string, venue: string }, tickets: { qrCodeUrl: string, ticketTierName: string, quantity: number }[] }): Promise<void> {
    const html = `
      <h2>Your Ticket(s) for ${event.name}</h2>
      <p>Event: <b>${event.name}</b></p>
      <p>Date: <b>${event.date}</b></p>
      <p>Venue: <b>${event.venue}</b></p>
      <hr/>
      ${tickets.map((t, i) => `
        <div>
          <h4>Ticket #${i + 1} (${t.ticketTierName})</h4>
          <p><b>Quantity:</b> ${t.quantity}</p>
          <img src="${t.qrCodeUrl}" alt="QR Code" width="180" height="180" style="display:block; border:1px solid #ccc; margin-bottom:8px;">
          <br>
          <a href="${t.qrCodeUrl}" target="_blank">View QR Code in browser</a>
        </div>
      `).join('')}
      <p>Show this email at the event for entry.</p>
    `;
    await this.transporter.sendMail({
      from: config.email.from,
      to,
      subject: `Your Ticket(s) for ${event.name}`,
      html
    });
  }
} 