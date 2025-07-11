# Rate Limiting Implementation

This document describes the rate limiting implementation for the CityFeed Club application, specifically focused on protecting user login endpoints from brute force attacks and abuse.

## Overview

The rate limiting system provides multiple layers of protection:

1. **IP-based rate limiting** - Prevents abuse from specific IP addresses
2. **Email-based rate limiting** - Prevents abuse targeting specific email addresses
3. **Account lockout** - Temporarily blocks accounts after too many failed attempts
4. **General API rate limiting** - Protects all API endpoints from abuse

## Implementation Details

### Rate Limiting Service (`src/services/rateLimit.service.ts`)

A custom rate limiting service that provides:

- **In-memory storage** using Map for fast access
- **Automatic cleanup** of expired entries every 5 minutes
- **Configurable limits** for different types of operations
- **Account lockout** functionality with configurable block duration

### Enhanced Rate Limiting Middleware (`src/middleware/enhancedRateLimit.middleware.ts`)

Provides sophisticated rate limiting middleware that:

- **Combines IP and email-based limits** for login attempts
- **Sets rate limit headers** in responses
- **Provides detailed error messages** with retry information
- **Resets limits** on successful operations

### Basic Rate Limiting Middleware (`src/middleware/rateLimit.middleware.ts`)

Uses the `express-rate-limit` library for:

- **Simple rate limiting** for general endpoints
- **Standard rate limit headers**
- **Configurable windows and limits**

## Rate Limit Configurations

### Login Attempts
- **IP-based**: 5 attempts per 15 minutes
- **Email-based**: 3 attempts per 15 minutes
- **Block duration**: 1 hour after exceeding limits

### Password Reset
- **Email-based**: 3 attempts per hour
- **Block duration**: 2 hours after exceeding limits

### Email Verification
- **Email-based**: 5 attempts per 30 minutes
- **Block duration**: 1 hour after exceeding limits

### General API
- **IP-based**: 100 requests per 15 minutes

## Protected Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/login/super-admin` - Super admin login
- `POST /api/auth/login-outlet-admin` - Outlet admin login
- `POST /api/auth/login-employee` - Employee login
- `POST /api/admin/login` - Admin login

### Password Management
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Email Verification
- `POST /api/auth/verify-email/:token` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email

## Response Headers

Rate limiting middleware adds the following headers to responses:

```
X-RateLimit-IP-Remaining: 4
X-RateLimit-IP-Reset: 2024-01-01T12:00:00.000Z
X-RateLimit-Email-Remaining: 2
X-RateLimit-Email-Reset: 2024-01-01T12:00:00.000Z
```

## Error Responses

When rate limits are exceeded, the API returns:

```json
{
  "success": false,
  "message": "Too many login attempts. Please try again later.",
  "retryAfter": 3600,
  "blockedUntil": "2024-01-01T13:00:00.000Z"
}
```

## Testing

Run the rate limiting tests:

```bash
npm test -- --testPathPattern=rateLimit.test.ts
```

## Configuration

Rate limits can be configured in `src/services/rateLimit.service.ts`:

```typescript
export const RATE_LIMIT_CONFIG = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  },
  // ... other configurations
};
```

## Security Features

1. **Dual-layer protection**: Both IP and email-based limits
2. **Account lockout**: Temporary blocking after limit exceeded
3. **Automatic cleanup**: Prevents memory leaks
4. **Configurable windows**: Different time windows for different operations
5. **Reset functionality**: Limits reset on successful operations

## Monitoring

The rate limiting system provides:

- **Rate limit headers** for monitoring
- **Detailed error messages** with timing information
- **Automatic cleanup** of expired entries
- **Configurable logging** (can be extended)

## Future Enhancements

Potential improvements:

1. **Redis integration** for distributed rate limiting
2. **Whitelist functionality** for trusted IPs
3. **Dynamic rate limiting** based on user behavior
4. **Rate limit analytics** and reporting
5. **Integration with security monitoring** systems 