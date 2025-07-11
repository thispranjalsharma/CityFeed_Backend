import { rateLimitService, RATE_LIMIT_CONFIG } from '../src/services/rateLimit.service';

describe('Rate Limiting Tests', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    rateLimitService.destroy();
  });

  describe('Rate Limit Service', () => {
    it('should allow requests within limit', () => {
      const result1 = rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests after limit exceeded', () => {
      // Make 3 requests (within limit)
      rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);

      // 4th request should be blocked
      const result = rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      // Mock time to simulate window expiration
      const originalDateNow = Date.now;
      const mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      // Make a request
      rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);

      // Advance time beyond the window
      Date.now = jest.fn(() => mockTime + 70000);

      // Should be allowed again
      const result = rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should reset rate limit for specific identifier', () => {
      // Make some requests
      rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);

      // Reset the rate limit
      rateLimitService.resetRateLimit('test@example.com', 'login_email');

      // Should be allowed again
      const result = rateLimitService.checkRateLimit('test@example.com', 'login_email', 3, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have correct login configuration', () => {
      expect(RATE_LIMIT_CONFIG.LOGIN.maxAttempts).toBe(5);
      expect(RATE_LIMIT_CONFIG.LOGIN.windowMs).toBe(15 * 60 * 1000);
      expect(RATE_LIMIT_CONFIG.LOGIN.blockDurationMs).toBe(60 * 60 * 1000);
    });

    it('should have correct email login configuration', () => {
      expect(RATE_LIMIT_CONFIG.EMAIL_LOGIN.maxAttempts).toBe(3);
      expect(RATE_LIMIT_CONFIG.EMAIL_LOGIN.windowMs).toBe(15 * 60 * 1000);
      expect(RATE_LIMIT_CONFIG.EMAIL_LOGIN.blockDurationMs).toBe(60 * 60 * 1000);
    });

    it('should have correct password reset configuration', () => {
      expect(RATE_LIMIT_CONFIG.PASSWORD_RESET.maxAttempts).toBe(3);
      expect(RATE_LIMIT_CONFIG.PASSWORD_RESET.windowMs).toBe(60 * 60 * 1000);
      expect(RATE_LIMIT_CONFIG.PASSWORD_RESET.blockDurationMs).toBe(2 * 60 * 60 * 1000);
    });

    it('should have correct email verification configuration', () => {
      expect(RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.maxAttempts).toBe(5);
      expect(RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.windowMs).toBe(30 * 60 * 1000);
      expect(RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.blockDurationMs).toBe(60 * 60 * 1000);
    });
  });
}); 