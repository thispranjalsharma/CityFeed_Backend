import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General rate limiter for all login attempts
export const loginRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 10, // 10 attempts per window per IP
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 30 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP, please try again after 30 minutes',
      retryAfter: Math.ceil(30 * 60 / 60)
    });
  }
});

// Stricter rate limiter for failed login attempts
export const failedLoginRateLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000, // 2 hours
  max: 5, // 5 attempts per window per IP
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP, please try again after 2 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts from this IP, please try again after 2 hours',
      retryAfter: Math.ceil(2 * 60 / 60)
    });
  },
  skip: (req: Request) => {
    return req.body.success === true;
  }
});

// Rate limiter for email-based login attempts (more strict)
export const emailLoginRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 attempts per window per email
  keyGenerator: (req: Request) => {
    return req.body.email?.toLowerCase() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many login attempts for this email, please try again after 30 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts for this email, please try again after 30 minutes',
      retryAfter: Math.ceil(30 / 60)
    });
  }
});

// Rate limiter for password reset attempts
export const passwordResetRateLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000, // 2 hours
  max: 5, // 5 attempts per window per email
  keyGenerator: (req: Request) => {
    return req.body.email?.toLowerCase() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many password reset attempts for this email, please try again after 2 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts for this email, please try again after 2 hours',
      retryAfter: Math.ceil(2 * 60 / 60)
    });
  }
});

// Rate limiter for email verification attempts
export const emailVerificationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per window per email
  keyGenerator: (req: Request) => {
    return req.body.email?.toLowerCase() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many email verification attempts for this email, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many email verification attempts for this email, please try again after 1 hour',
      retryAfter: Math.ceil(60 / 60)
    });
  }
});

// General API rate limiter for all endpoints
export const generalApiRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 200, // 200 requests per window per IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 30 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 30 minutes',
      retryAfter: Math.ceil(30 * 60 / 60)
    });
  }
}); 