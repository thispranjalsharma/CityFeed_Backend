import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration
// transporter.verify(function (error: Error | null) {
//   if (error) {
//     console.log('SMTP Configuration Error:', error);
//   } else {
//     console.log('SMTP Server is ready to take our messages');
//   }
// });

const frontendUrls = {
  super_admin: 'https://cityfeed-admin.vercel.app',
  outlet_admin: 'https://cityfeed-admin.vercel.app',
  employee: 'https://cityfeed-admin.vercel.app',
  user: 'https://cityfeed-club.vercel.app',
};

export const sendVerificationEmail = async (email: string, token: string, role: string): Promise<void> => {
  try {
    const baseUrl = frontendUrls[role] || process.env.FRONTEND_URL;
    const verificationUrl = `${baseUrl}/verify-email?token=${token}&role=${role}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email address',
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      `,
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  try {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  await transporter.sendMail({
      from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Password Reset</h1>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `,
  });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}; 