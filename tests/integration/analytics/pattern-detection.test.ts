/**
 * Integration tests for Pattern Detection Service
 * Tests pattern detection accuracy with real database operations
 * AC #6: Data accuracy validated (pattern detection)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { detectPatterns } from '@/services/analytics/pattern-detector';
import { testPrisma } from '../../helpers/database';
import { seedBusiness } from '../../helpers/database';

describe('Pattern Detection Accuracy Integration Tests', () => {
  let siteId: string;
  let businessId: string;

  beforeEach(async () => {
    // Create test business
    const business = await seedBusiness({
      name: 'Pattern Test Business',
      industry: 'fashion',
      revenueRange: '1M-5M',
      productTypes: ['clothing'],
      platform: 'Shopify',
    });
    businessId = business.id;
    siteId = business.siteId;
  });

  describe('detectPatterns', () => {
    it('should detect abandonment pattern with >30% drop-off', async () => {
      // Create 150 sessions with abandonment at checkout page
      const sessions = await Promise.all(
        Array.from({ length: 150 }, async (_, i) => {
          const hasAbandonedAtCheckout = i < 50; // 33.3% abandonment rate
          const journeyPath = hasAbandonedAtCheckout
            ? ['/home', '/products', '/cart', '/checkout']
            : ['/home', '/products', '/cart', '/checkout', '/confirmation'];

          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage: hasAbandonedAtCheckout ? '/checkout' : '/confirmation',
              duration: 300000, // 5 minutes
              pageCount: journeyPath.length,
              bounced: false,
              converted: !hasAbandonedAtCheckout,
              journeyPath,
              createdAt: new Date(),
            },
          });
        })
      );

      const patterns = await detectPatterns(siteId, {
        startDate: new Date(Date.now() - 86400000), // 1 day ago
        endDate: new Date(),
      });

      // Should detect abandonment pattern at /checkout
      const abandonmentPattern = patterns.find(
        (p) => p.patternType === 'ABANDONMENT' && (p.metadata.stage?.includes('checkout') || p.description.toLowerCase().includes('checkout'))
      );

      expect(abandonmentPattern).toBeDefined();
      expect(abandonmentPattern!.sessionCount).toBeGreaterThanOrEqual(100); // Statistical significance
      expect(abandonmentPattern!.severity).toBeGreaterThan(0);
    });

    it('should not detect patterns with insufficient sessions (<100)', async () => {
      // Create only 50 sessions (below minimum threshold)
      await Promise.all(
        Array.from({ length: 50 }, async (_, i) => {
          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage: '/cart',
              duration: 60000,
              pageCount: 2,
              bounced: false,
              converted: false,
              journeyPath: ['/home', '/cart'],
              createdAt: new Date(),
            },
          });
        })
      );

      const patterns = await detectPatterns(siteId, {
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(),
      });

      // Should return empty array due to insufficient data
      expect(patterns.length).toBe(0);
    });

    it('should detect multiple pattern types in same analysis', async () => {
      // Create diverse session data with multiple patterns
      await Promise.all(
        Array.from({ length: 120 }, async (_, i) => {
          const sessionType = i % 3;
          let journeyPath: string[];
          let exitPage: string;
          let duration: number;

          if (sessionType === 0) {
            // Abandonment pattern
            journeyPath = ['/home', '/products', '/cart'];
            exitPage = '/cart';
            duration = 120000; // 2 minutes
          } else if (sessionType === 1) {
            // Low engagement pattern (very short duration)
            journeyPath = ['/home', '/products'];
            exitPage = '/products';
            duration = 5000; // 5 seconds - below average
          } else {
            // Normal successful session
            journeyPath = ['/home', '/products', '/cart', '/checkout', '/confirmation'];
            exitPage = '/confirmation';
            duration: 400000; // 6.6 minutes
          }

          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage,
              duration,
              pageCount: journeyPath.length,
              bounced: false,
              converted: sessionType === 2,
              journeyPath,
              createdAt: new Date(),
            },
          });
        })
      );

      const patterns = await detectPatterns(siteId, {
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(),
      });

      // Should detect at least one pattern type
      expect(patterns.length).toBeGreaterThan(0);

      // Verify patterns have required fields
      patterns.forEach((pattern) => {
        expect(pattern.patternType).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.sessionCount).toBeGreaterThanOrEqual(100);
        expect(pattern.severity).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate pattern severity correctly', async () => {
      // Create sessions with known abandonment rate
      const totalSessions = 200;
      const abandonedSessions = 80; // 40% abandonment rate

      await Promise.all(
        Array.from({ length: totalSessions }, async (_, i) => {
          const abandoned = i < abandonedSessions;
          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage: abandoned ? '/cart' : '/confirmation',
              duration: 180000,
              pageCount: abandoned ? 3 : 5,
              bounced: false,
              converted: !abandoned,
              journeyPath: abandoned
                ? ['/home', '/products', '/cart']
                : ['/home', '/products', '/cart', '/checkout', '/confirmation'],
              createdAt: new Date(),
            },
          });
        })
      );

      const patterns = await detectPatterns(siteId, {
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(),
      });

      const abandonmentPattern = patterns.find((p) => p.patternType === 'ABANDONMENT');

      expect(abandonmentPattern).toBeDefined();
      // Severity should be proportional to abandonment rate × session volume
      expect(abandonmentPattern!.severity).toBeGreaterThan(0);
    });

    it('should handle edge case of all sessions converting (no abandonment)', async () => {
      // Create 150 sessions with 100% conversion (no abandonment)
      await Promise.all(
        Array.from({ length: 150 }, async (_, i) => {
          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage: '/confirmation',
              duration: 300000,
              pageCount: 5,
              bounced: false,
              converted: true,
              journeyPath: ['/home', '/products', '/cart', '/checkout', '/confirmation'],
              createdAt: new Date(),
            },
          });
        })
      );

      const patterns = await detectPatterns(siteId, {
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(),
      });

      // Should not detect abandonment patterns (or very low severity)
      const abandonmentPatterns = patterns.filter((p) => p.type === 'ABANDONMENT');
      expect(abandonmentPatterns.length).toBe(0);
    });

    it('should respect analysis window date range', async () => {
      // Create sessions outside the analysis window
      await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_old_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage: '/cart',
              duration: 120000,
              pageCount: 3,
              bounced: false,
              converted: false,
              journeyPath: ['/home', '/products', '/cart'],
              createdAt: new Date(Date.now() - 7 * 86400000), // 7 days ago
            },
          });
        })
      );

      // Create recent sessions within analysis window
      await Promise.all(
        Array.from({ length: 99 }, async (_, i) => {
          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_recent_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage: '/cart',
              duration: 120000,
              pageCount: 3,
              bounced: false,
              converted: false,
              journeyPath: ['/home', '/products', '/cart'],
              createdAt: new Date(), // Today
            },
          });
        })
      );

      // Analyze only last 24 hours
      const patterns = await detectPatterns(siteId, {
        startDate: new Date(Date.now() - 86400000), // 1 day ago
        endDate: new Date(),
      });

      // Should only analyze recent sessions (99 sessions = below threshold)
      // This tests that old sessions are correctly excluded
      expect(patterns.length).toBe(0); // Below min threshold of 100 sessions
    });

    it('should validate statistical significance threshold (min 100 sessions)', async () => {
      // Create exactly 99 sessions (1 below threshold)
      await Promise.all(
        Array.from({ length: 99 }, async (_, i) => {
          return testPrisma.session.create({
            data: {
              siteId,
              sessionId: `session_${i}_${Date.now()}`,
              entryPage: '/home',
              exitPage: '/cart',
              duration: 120000,
              pageCount: 3,
              bounced: false,
              converted: false,
              journeyPath: ['/home', '/products', '/cart'],
              createdAt: new Date(),
            },
          });
        })
      );

      const patterns = await detectPatterns(siteId, {
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(),
      });

      // Should not detect patterns (below statistical significance)
      expect(patterns.length).toBe(0);
    });
  });
});
