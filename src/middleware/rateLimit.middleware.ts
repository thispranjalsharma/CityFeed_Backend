import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General rate limiter for all login attempts
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      retryAfter: Math.ceil(15 * 60 / 60) // minutes
    });
  }
});

// Stricter rate limiter for failed login attempts
export const failedLoginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 failed attempts per hour
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
      retryAfter: Math.ceil(60 / 60) // hours
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for successful logins
    return req.body.success === true;
  }
});

// Rate limiter for email-based login attempts (more strict)
export const emailLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each email to 3 attempts per 15 minutes
  keyGenerator: (req: Request) => {
    // Use email as the key for rate limiting
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
      retryAfter: Math.ceil(15 / 60) // minutes
    });
  }
});

// Rate limiter for password reset attempts
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each email to 3 password reset attempts per hour
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
      retryAfter: Math.ceil(60 / 60) // hours
    });
  }
});

// Rate limiter for email verification attempts
export const emailVerificationRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // limit each email to 5 verification attempts per 30 minutes
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
      retryAfter: Math.ceil(30 / 60) // minutes
    });
  }
});

// General API rate limiter for all endpoints
export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
      retryAfter: Math.ceil(15 * 60 / 60) // minutes
    });
  }
}); 