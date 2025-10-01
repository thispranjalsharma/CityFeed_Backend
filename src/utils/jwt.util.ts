import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthUser } from '../interfaces/auth.interface';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
const EMAIL_VERIFICATION_EXPIRES_IN = (process.env.EMAIL_VERIFICATION_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];

interface TokenPayload extends AuthUser {}

export const generateToken = (payload: TokenPayload, expiresIn: SignOptions['expiresIn'] = '7d'): string => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, config.jwtSecret, options);
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const generateEmailVerificationToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '7d' as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtSecret, options);
};

export const generatePasswordResetToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '1h' as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtSecret, options);
}; 