import type { Context, Next } from 'hono';

interface RateLimitConfig {
  rps?: number; // Requests per second
  rpm?: number; // Requests per minute
  daily?: number; // Requests per day
}

interface RequestRecord {
  timestamps: number[];
}

// In-memory store for request tracking
const requestStore = new Map<string, RequestRecord>();

// Default configuration
const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  rps: 5,
  rpm: 50,
  daily: 5000,
};

/**
 * Clean up old timestamps from the store
 */
function cleanupTimestamps(timestamps: number[], now: number): number[] {
  // Keep only timestamps from the last 24 hours
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  return timestamps.filter(ts => ts > oneDayAgo);
}

/**
 * Get client identifier from request
 */
function getClientId(c: Context): string {
  // Try to get IP from various headers
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  
  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a generic identifier
  return 'unknown';
}

/**
 * Count requests within a time window
 */
function countRequestsInWindow(timestamps: number[], windowMs: number, now: number): number {
  const windowStart = now - windowMs;
  return timestamps.filter(ts => ts > windowStart).length;
}

/**
 * Calculate when the rate limit will reset
 */
function calculateResetTime(timestamps: number[], windowMs: number, now: number): number {
  const windowStart = now - windowMs;
  const oldestInWindow = timestamps.find(ts => ts > windowStart);
  if (oldestInWindow) {
    return Math.ceil((oldestInWindow + windowMs - now) / 1000); // seconds until reset
  }
  return 0;
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(config: RateLimitConfig = {}) {
  const limits = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context, next: Next) => {
    const now = Date.now();
    const clientId = getClientId(c);

    // Get or create request record for this client
    let record = requestStore.get(clientId);
    if (!record) {
      record = { timestamps: [] };
      requestStore.set(clientId, record);
    }

    // Clean up old timestamps
    record.timestamps = cleanupTimestamps(record.timestamps, now);

    // Check rate limits
    const secondCount = countRequestsInWindow(record.timestamps, 1000, now);
    const minuteCount = countRequestsInWindow(record.timestamps, 60 * 1000, now);
    const dayCount = countRequestsInWindow(record.timestamps, 24 * 60 * 60 * 1000, now);

    // Determine which limit is exceeded
    let limitExceeded = false;
    let retryAfter = 0;
    let limitType = '';
    let limit = 0;
    let remaining = 0;

    if (secondCount >= limits.rps) {
      limitExceeded = true;
      retryAfter = calculateResetTime(record.timestamps, 1000, now);
      limitType = 'per second';
      limit = limits.rps;
      remaining = 0;
    } else if (minuteCount >= limits.rpm) {
      limitExceeded = true;
      retryAfter = calculateResetTime(record.timestamps, 60 * 1000, now);
      limitType = 'per minute';
      limit = limits.rpm;
      remaining = 0;
    } else if (dayCount >= limits.daily) {
      limitExceeded = true;
      retryAfter = calculateResetTime(record.timestamps, 24 * 60 * 60 * 1000, now);
      limitType = 'per day';
      limit = limits.daily;
      remaining = 0;
    } else {
      // Calculate remaining based on the most restrictive upcoming limit
      const rpsRemaining = limits.rps - secondCount;
      const rpmRemaining = limits.rpm - minuteCount;
      const dayRemaining = limits.daily - dayCount;
      remaining = Math.min(rpsRemaining, rpmRemaining, dayRemaining);
      limit = limits.daily; // Use daily as the overall limit for headers
    }

    if (limitExceeded) {
      // Set rate limit headers
      c.header('X-RateLimit-Limit', String(limit));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil((now + retryAfter * 1000) / 1000)));
      c.header('Retry-After', String(retryAfter || 1));

      return c.json({
        ok: false,
        status: 'Too Many Requests',
        message: `Rate limit exceeded: ${limitType}`,
      }, 429);
    }

    // Record this request
    record.timestamps.push(now);

    // Set rate limit headers for successful requests
    const resetTime = Math.ceil((now + 24 * 60 * 60 * 1000) / 1000); // Next day
    c.header('X-RateLimit-Limit', String(limits.daily));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetTime));

    await next();
  };
}

/**
 * Cleanup task to remove old entries from the store
 * Should be called periodically (e.g., every hour)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  for (const [clientId, record] of requestStore.entries()) {
    record.timestamps = record.timestamps.filter(ts => ts > oneDayAgo);
    
    // Remove entries with no recent timestamps
    if (record.timestamps.length === 0) {
      requestStore.delete(clientId);
    }
  }
}
