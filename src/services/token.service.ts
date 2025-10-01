import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config/config";
import { TokenPayload, AuthUser } from "../interfaces/auth.interface";

export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret = config.jwtSecret;
    this.expiresIn = config.jwtExpiresIn;
  }

  generateToken(payload: AuthUser): string {
    const options: SignOptions = {
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign(payload, this.secret, options);
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  async blacklistToken(token: string | null): Promise<void> {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      throw new Error("Invalid token");
    }
  }
}
