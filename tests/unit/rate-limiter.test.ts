/**
 * Unit tests for Rate Limiter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  clearRateLimits,
  getRateLimitInfo,
  DEFAULT_RATE_LIMIT,
} from '@/lib/rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearRateLimits();
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit('test-key');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(DEFAULT_RATE_LIMIT.limit);
      expect(result.remaining).toBe(DEFAULT_RATE_LIMIT.limit - 1);
    });

    it('should decrement remaining count on each request', () => {
      const key = 'test-key';

      const result1 = checkRateLimit(key);
      expect(result1.remaining).toBe(DEFAULT_RATE_LIMIT.limit - 1);

      const result2 = checkRateLimit(key);
      expect(result2.remaining).toBe(DEFAULT_RATE_LIMIT.limit - 2);

      const result3 = checkRateLimit(key);
      expect(result3.remaining).toBe(DEFAULT_RATE_LIMIT.limit - 3);
    });

    it('should block requests after limit exceeded', () => {
      const key = 'test-key';
      const config = { limit: 3, windowMs: 60000 };

      // Make 3 requests (up to limit)
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      const result3 = checkRateLimit(key, config);

      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);

      // 4th request should be blocked
      const result4 = checkRateLimit(key, config);
      expect(result4.allowed).toBe(false);
      expect(result4.remaining).toBe(0);
    });

    it('should reset after time window expires', () => {
      const key = 'test-key';
      const config = { limit: 3, windowMs: 60000 }; // 1 minute

      // Use up all requests
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      checkRateLimit(key, config);

      // Verify limit reached
      const blocked = checkRateLimit(key, config);
      expect(blocked.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(config.limit - 1);
    });

    it('should handle different keys independently', () => {
      const key1 = 'site-123';
      const key2 = 'site-456';
      const config = { limit: 2, windowMs: 60000 };

      // Use up key1
      checkRateLimit(key1, config);
      checkRateLimit(key1, config);
      const blocked1 = checkRateLimit(key1, config);

      expect(blocked1.allowed).toBe(false);

      // key2 should still be allowed
      const result2 = checkRateLimit(key2, config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(config.limit - 1);
    });

    it('should use default config when not provided', () => {
      const result = checkRateLimit('test-key');

      expect(result.limit).toBe(DEFAULT_RATE_LIMIT.limit);
      expect(result.allowed).toBe(true);
    });

    it('should return correct reset timestamp', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const key = 'test-key';
      const config = { limit: 10, windowMs: 60000 };

      const result = checkRateLimit(key, config);

      expect(result.reset).toBeGreaterThan(now);
      expect(result.reset).toBeLessThanOrEqual(now + config.windowMs);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return info without incrementing counter', () => {
      const key = 'test-key';

      const info1 = getRateLimitInfo(key);
      expect(info1.remaining).toBe(DEFAULT_RATE_LIMIT.limit);

      const info2 = getRateLimitInfo(key);
      expect(info2.remaining).toBe(DEFAULT_RATE_LIMIT.limit);

      // Counter should not have changed
      expect(info1.remaining).toBe(info2.remaining);
    });

    it('should show updated info after checkRateLimit', () => {
      const key = 'test-key';
      const config = { limit: 5, windowMs: 60000 };

      // Check initial info
      const info1 = getRateLimitInfo(key, config);
      expect(info1.remaining).toBe(5);

      // Make a request
      checkRateLimit(key, config);

      // Info should show updated remaining
      const info2 = getRateLimitInfo(key, config);
      expect(info2.remaining).toBe(4);
    });

    it('should show blocked status when limit exceeded', () => {
      const key = 'test-key';
      const config = { limit: 2, windowMs: 60000 };

      // Use up limit
      checkRateLimit(key, config);
      checkRateLimit(key, config);

      const info = getRateLimitInfo(key, config);
      expect(info.allowed).toBe(false);
      expect(info.remaining).toBe(0);
    });
  });

  describe('clearRateLimits', () => {
    it('should clear all rate limit entries', () => {
      const config = { limit: 2, windowMs: 60000 };

      // Create multiple entries
      checkRateLimit('key1', config);
      checkRateLimit('key2', config);
      checkRateLimit('key3', config);

      // Clear all
      clearRateLimits();

      // All keys should be reset
      const result1 = getRateLimitInfo('key1', config);
      const result2 = getRateLimitInfo('key2', config);
      const result3 = getRateLimitInfo('key3', config);

      expect(result1.remaining).toBe(config.limit);
      expect(result2.remaining).toBe(config.limit);
      expect(result3.remaining).toBe(config.limit);
    });
  });

  describe('Rate limit scenarios', () => {
    it('should handle burst traffic correctly', () => {
      const key = 'burst-test';
      const config = { limit: 1000, windowMs: 60000 };

      // Simulate 1000 rapid requests
      let allowed = 0;
      let blocked = 0;

      for (let i = 0; i < 1100; i++) {
        const result = checkRateLimit(key, config);
        if (result.allowed) {
          allowed++;
        } else {
          blocked++;
        }
      }

      expect(allowed).toBe(1000);
      expect(blocked).toBe(100);
    });

    it('should handle sliding window correctly', () => {
      const key = 'sliding-window-test';
      const config = { limit: 3, windowMs: 60000 };

      // Make 3 requests
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      checkRateLimit(key, config);

      // Should be blocked
      let result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);

      // Advance time by half window
      vi.advanceTimersByTime(30000);

      // Still blocked (window hasn't expired)
      result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(30001);

      // Should be allowed again
      result = checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
    });
  });
});
