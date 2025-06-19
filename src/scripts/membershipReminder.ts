import mongoose from 'mongoose';
import cron from 'node-cron';
import { config } from '../config/config';
import { User } from '../models/user.model';
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

async function sendMembershipReminders() {
  await mongoose.connect(config.mongoUri);
  const now = new Date();

  // Helper to get date difference in days
  function daysBetween(date1: Date, date2: Date) {
    return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Find users whose membershipExpiryDate is 1 month, 10 days, or 1 day away
  const users = await User.find({
    membershipExpiryDate: {
      $gte: new Date(now.getTime()),
      $lte: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000) // up to 32 days from now
    }
  });

  for (const user of users) {
    const daysLeft = daysBetween(now, user.membershipExpiryDate);
    let subject = '';
    let message = '';
    if (daysLeft === 30) {
      subject = 'Your membership expires in 1 month!';
      message = `Dear ${user.name},<br>Your membership will expire in 1 month on ${user.membershipExpiryDate.toDateString()}. Please renew soon!`;
    } else if (daysLeft === 10) {
      subject = 'Your membership expires in 10 days!';
      message = `Dear ${user.name},<br>Your membership will expire in 10 days on ${user.membershipExpiryDate.toDateString()}. Please renew soon!`;
    } else if (daysLeft === 1) {
      subject = 'Your membership expires tomorrow!';
      message = `Dear ${user.name},<br>Your membership will expire tomorrow (${user.membershipExpiryDate.toDateString()}). Please renew to continue enjoying benefits!`;
    } else {
      continue;
    }
    try {
      await emailService.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject,
        html: `<h1>Membership Expiry Reminder</h1><p>${message}</p>`
      });
    } catch (err) {
      console.error(`Failed to send reminder to ${user.email}:`, err);
    }
  }
  await mongoose.disconnect();
}

// Schedule to run every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  sendMembershipReminders().catch(console.error);
});

// If run directly, execute once
if (require.main === module) {
  sendMembershipReminders().then(() => process.exit(0));
} 