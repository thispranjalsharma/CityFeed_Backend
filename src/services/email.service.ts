import nodemailer from 'nodemailer';
import { config } from '../config/config';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationEmail(email: string, token: string, role: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}&role=${role}`;
    const subject = 'Verify your email address';
    const html = `
      <h1>Welcome to CityFeed!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html
    });
  }

  async sendPasswordResetEmail(email: string, token: string, role: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    const subject = 'Reset your password';
    const html = `
      <h1>Password Reset Request</h1>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html
    });
  }

  async sendMail(options: import('nodemailer').SendMailOptions): Promise<void> {
    await this.transporter.sendMail(options);
  }

  async sendMerchantVerifiedAdminNotification(merchant: import('../interfaces/merchant.interface').IMerchantDocument): Promise<void> {
    const adminEmail = process.env.CITYFEED_ADMIN_EMAIL;
    if (!adminEmail) {
      console.error('[EmailService] CITYFEED_ADMIN_EMAIL is not set in environment variables');
      throw new Error('CITYFEED_ADMIN_EMAIL is not set in environment variables');
    }
    const subject = 'Merchant Email Verified - Approval Needed';
    const html = `
      <h1>Merchant Registration Verified</h1>
      <p>A new merchant has verified their email and is awaiting approval:</p>
      <ul>
        <li><strong>Name:</strong> ${merchant.name}</li>
        <li><strong>Email:</strong> ${merchant.email}</li>
        <li><strong>Business Name:</strong> ${merchant.businessName}</li>
        <li><strong>Business Type:</strong> ${merchant.businessType}</li>
        <li><strong>Phone:</strong> ${merchant.phone}</li>
        <li><strong>Address:</strong> ${merchant.address}</li>
      </ul>
      <p>Please review and approve the merchant in the admin dashboard.</p>
    `;
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: adminEmail,
        subject,
        html
      });
    } catch (error) {
      console.error('[EmailService] Error sending admin notification email:', error);
      throw error;
    }
  }
} 