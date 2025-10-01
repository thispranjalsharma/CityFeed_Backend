import { Request, Response, NextFunction } from 'express';
import { rateLimitService, RATE_LIMIT_CONFIG } from '../services/rateLimit.service';

export const enhancedLoginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || (req as any).connection?.remoteAddress || 'unknown';
  const email = req.body.email?.toLowerCase() || 'unknown';
  
  // Check IP-based rate limit
  const ipLimit = rateLimitService.checkRateLimit(
    ip,
    'login_ip',
    RATE_LIMIT_CONFIG.LOGIN.maxAttempts,
    RATE_LIMIT_CONFIG.LOGIN.windowMs,
    RATE_LIMIT_CONFIG.LOGIN.blockDurationMs
  );

  // Check email-based rate limit
  const emailLimit = rateLimitService.checkRateLimit(
    email,
    'login_email',
    RATE_LIMIT_CONFIG.EMAIL_LOGIN.maxAttempts,
    RATE_LIMIT_CONFIG.EMAIL_LOGIN.windowMs,
    RATE_LIMIT_CONFIG.EMAIL_LOGIN.blockDurationMs
  );

  // If either limit is exceeded, block the request
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const blockedUntil = ipLimit.blockedUntil || emailLimit.blockedUntil;
    const resetTime = Math.max(ipLimit.resetTime, emailLimit.resetTime);
    
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
      retryAfter: blockedUntil ? Math.ceil((blockedUntil - Date.now()) / 1000) : Math.ceil((resetTime - Date.now()) / 1000),
      blockedUntil: blockedUntil ? new Date(blockedUntil).toISOString() : undefined
    });
  }

  // Add rate limit info to response headers
  res.setHeader('X-RateLimit-IP-Remaining', ipLimit.remaining.toString());
  res.setHeader('X-RateLimit-IP-Reset', new Date(ipLimit.resetTime).toISOString());
  res.setHeader('X-RateLimit-Email-Remaining', emailLimit.remaining.toString());
  res.setHeader('X-RateLimit-Email-Reset', new Date(emailLimit.resetTime).toISOString());

  next();
};

export const enhancedPasswordResetRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body.email?.toLowerCase() || 'unknown';
  
  const limit = rateLimitService.checkRateLimit(
    email,
    'password_reset',
    RATE_LIMIT_CONFIG.PASSWORD_RESET.maxAttempts,
    RATE_LIMIT_CONFIG.PASSWORD_RESET.windowMs,
    RATE_LIMIT_CONFIG.PASSWORD_RESET.blockDurationMs
  );

  if (!limit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again later.',
      retryAfter: limit.blockedUntil ? Math.ceil((limit.blockedUntil - Date.now()) / 1000) : Math.ceil((limit.resetTime - Date.now()) / 1000),
      blockedUntil: limit.blockedUntil ? new Date(limit.blockedUntil).toISOString() : undefined
    });
  }

  res.setHeader('X-RateLimit-Remaining', limit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(limit.resetTime).toISOString());

  next();
};

export const enhancedEmailVerificationRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body.email?.toLowerCase() || 'unknown';
  
  const limit = rateLimitService.checkRateLimit(
    email,
    'email_verification',
    RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.maxAttempts,
    RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.windowMs,
    RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.blockDurationMs
  );

  if (!limit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Too many email verification attempts. Please try again later.',
      retryAfter: limit.blockedUntil ? Math.ceil((limit.blockedUntil - Date.now()) / 1000) : Math.ceil((limit.resetTime - Date.now()) / 1000),
      blockedUntil: limit.blockedUntil ? new Date(limit.blockedUntil).toISOString() : undefined
    });
  }

  res.setHeader('X-RateLimit-Remaining', limit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(limit.resetTime).toISOString());

  next();
};

// Middleware to reset rate limits on successful login
export const resetLoginRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body.email?.toLowerCase();
  if (email) {
    rateLimitService.resetRateLimit(email, 'login_email');
  }
  next();
};

// Middleware to reset rate limits on successful password reset
export const resetPasswordResetRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body.email?.toLowerCase();
  if (email) {
    rateLimitService.resetRateLimit(email, 'password_reset');
  }
  next();
}; 