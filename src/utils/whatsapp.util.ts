import twilio from 'twilio';
import { logger } from './logger.util';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER!;

const client = twilio(accountSid, authToken);

export function formatIndianPhoneNumber(phone: string): string {
  if (phone.startsWith('+')) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  return phone;
}

export async function sendWhatsAppMessage(to: string, body: string, mediaUrl?: string) {
  try {
    logger.info(`Attempting WhatsApp send: from ${whatsappFrom} to whatsapp:${to} with media ${mediaUrl}`);
    const result = await client.messages.create({
      from: whatsappFrom,
      to: 'whatsapp:' + to,
      body,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {})
    });
    logger.info(`WhatsApp message sent to ${to}: SID ${result.sid}`);
  } catch (error) {
    logger.error('Failed to send WhatsApp message:', error);
  }
} 