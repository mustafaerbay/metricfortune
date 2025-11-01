/**
 * Rate Limiter for API endpoints
 *
 * Implements in-memory rate limiting with sliding window algorithm.
 * For production, consider using Vercel KV or Redis for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval to prevent memory leaks
let cleanupInterval: NodeJS.Timeout | null = null;

// Start periodic cleanup (runs every 5 minutes)
function startCleanupInterval(): void {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      cleanupExpiredEntries();
    }, 5 * 60 * 1000); // 5 minutes

    // Don't keep the process alive for cleanup
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }
}

// Auto-start cleanup on module load
startCleanupInterval();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number;        // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

/**
 * Default rate limit: 1000 events per minute per siteId
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 1000,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param key - Unique identifier for rate limiting (e.g., siteId)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous entry - create new one
  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }

  // Entry expired - reset counter
  if (now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }

  // Entry still valid - check limit
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Cleanup expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit info for a key (without incrementing)
 */
export function getRateLimitInfo(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      reset: now + config.windowMs,
    };
  }

  return {
    allowed: entry.count < config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - entry.count),
    reset: entry.resetAt,
  };
}
