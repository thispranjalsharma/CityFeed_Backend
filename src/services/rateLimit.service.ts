interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

class RateLimitService {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.store.delete(key);
      }
    }
  }

  private getKey(identifier: string, type: string): string {
    return `${type}:${identifier}`;
  }

  checkRateLimit(
    identifier: string,
    type: string,
    maxAttempts: number,
    windowMs: number,
    blockDurationMs?: number
  ): { allowed: boolean; remaining: number; resetTime: number; blockedUntil?: number } {
    const key = this.getKey(identifier, type);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      // First attempt
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: maxAttempts - 1, resetTime };
    }

    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: entry.resetTime,
        blockedUntil: entry.blockedUntil 
      };
    }

    // Check if window has expired
    if (entry.resetTime < now) {
      // Reset the counter
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: maxAttempts - 1, resetTime };
    }

    // Increment counter
    const newCount = entry.count + 1;
    const remaining = Math.max(0, maxAttempts - newCount);
    const allowed = newCount <= maxAttempts;

    if (allowed) {
      this.store.set(key, { count: newCount, resetTime: entry.resetTime });
    } else {
      // Block the account if max attempts exceeded
      const blockedUntil = blockDurationMs ? now + blockDurationMs : undefined;
      this.store.set(key, { 
        count: newCount, 
        resetTime: entry.resetTime,
        blockedUntil 
      });
    }

    return { 
      allowed, 
      remaining, 
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil 
    };
  }

  resetRateLimit(identifier: string, type: string): void {
    const key = this.getKey(identifier, type);
    this.store.delete(key);
  }

  getRateLimitInfo(identifier: string, type: string): RateLimitEntry | null {
    const key = this.getKey(identifier, type);
    return this.store.get(key) || null;
  }

  // Cleanup method to be called when the service is destroyed
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Rate limit configurations
export const RATE_LIMIT_CONFIG = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  },
  EMAIL_LOGIN: {
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  },
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 2 * 60 * 60 * 1000 // 2 hours
  },
  EMAIL_VERIFICATION: {
    maxAttempts: 5,
    windowMs: 30 * 60 * 1000, // 30 minutes
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  }
}; 