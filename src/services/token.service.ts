import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { TokenPayload, AuthUser } from '../interfaces/auth.interface';

export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret = config.jwtSecret;
    this.expiresIn = config.jwtExpiresIn;
  }

  generateToken(payload: AuthUser): string {
    const options: SignOptions = { expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'] };
    return jwt.sign(payload, this.secret, options);
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    // In a real application, you would store the blacklisted token in a database
    // For now, we'll just verify the token is valid
    const decoded = this.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid token');
    }
  }
} 