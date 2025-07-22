// Rate limiters are currently disabled.
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General rate limiter for all login attempts
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (was 30)
  max: 20, // 20 attempts per window per IP (was 10)
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      retryAfter: Math.ceil(15 * 60 / 60)
    });
  }
});

// Stricter rate limiter for failed login attempts
export const failedLoginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 60 * 1000, // 1 hour (was 2)
  max: 10, // 10 attempts per window per IP (was 5)
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts from this IP, please try again after 1 hour',
      retryAfter: Math.ceil(60 / 60)
    });
  },
  skip: (req: Request) => {
    return req.body.success === true;
  }
});

// Rate limiter for email-based login attempts (more strict)
export const emailLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (was 30)
  max: 10, // 10 attempts per window per email (was 5)
  keyGenerator: (req: Request) => {
    return req.body.email?.toLowerCase() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many login attempts for this email, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts for this email, please try again after 15 minutes',
      retryAfter: Math.ceil(15 / 60)
    });
  }
});

// Rate limiter for password reset attempts
export const passwordResetRateLimiter = rateLimit({
  windowMs: 1 * 60 * 60 * 1000, // 1 hour (was 2)
  max: 10, // 10 attempts per window per email (was 5)
  keyGenerator: (req: Request) => {
    return req.body.email?.toLowerCase() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many password reset attempts for this email, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts for this email, please try again after 1 hour',
      retryAfter: Math.ceil(60 / 60)
    });
  }
});

// Rate limiter for email verification attempts
export const emailVerificationRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes (was 1 hour)
  max: 10, // 10 attempts per window per email (was 5)
  keyGenerator: (req: Request) => {
    return req.body.email?.toLowerCase() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many email verification attempts for this email, please try again after 30 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many email verification attempts for this email, please try again after 30 minutes',
      retryAfter: Math.ceil(30 / 60)
    });
  }
});

// General API rate limiter for all endpoints
export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (was 30)
  max: 400, // 400 requests per window per IP (was 200)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
      retryAfter: Math.ceil(15 * 60 / 60)
    });
  }
}); 