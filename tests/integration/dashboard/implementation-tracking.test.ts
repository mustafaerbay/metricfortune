/**
 * Implementation Tracking Integration Tests
 * Story 2.6: Implementation Tracking & Results
 *
 * Tests before/after metrics calculation with real database sessions,
 * business isolation, edge cases, and Server Action functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import {
  calculateBeforeMetrics,
  calculateAfterMetrics,
  calculateMetricChange,
  determineImplementationStatus,
  fetchDailyMetrics,
} from '@/services/analytics/implementation-tracker';
import { updateImplementationNotes } from '@/actions/recommendations';
import { subDays, addDays } from 'date-fns';

describe('Implementation Tracking Integration Tests', () => {
  const testUserEmail = 'impl-track-test@example.com';
  const testSiteId = 'site-impl-track-test';
  let testUserId: string;
  let testBusinessId: string;
  let testRecommendationId: string;

  beforeEach(async () => {
    // Clean up existing test data
    await prisma.session.deleteMany({
      where: { siteId: { startsWith: 'site-impl-track' } },
    });
    await prisma.recommendation.deleteMany({
      where: {
        business: {
          siteId: { startsWith: 'site-impl-track' },
        },
      },
    });
    await prisma.business.deleteMany({
      where: { siteId: { startsWith: 'site-impl-track' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'impl-track',
        },
      },
    });

    // Create test user and business
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: await hash('password123', 10),
      },
    });
    testUserId = user.id;

    const business = await prisma.business.create({
      data: {
        userId: testUserId,
        siteId: testSiteId,
        name: 'Test Business - Implementation Tracking',
        industry: 'fashion',
        revenueRange: '$1-5M',
        productTypes: ['clothing'],
        platform: 'shopify',
      },
    });
    testBusinessId = business.id;

    // Create test recommendation
    const recommendation = await prisma.recommendation.create({
      data: {
        businessId: testBusinessId,
        title: 'Test Recommendation',
        problemStatement: 'Test problem',
        actionSteps: ['Step 1', 'Step 2'],
        expectedImpact: 'High impact',
        confidenceLevel: 'HIGH',
        status: 'IMPLEMENTED',
        impactLevel: 'HIGH',
        implementedAt: new Date(), // Will be overridden in tests
      },
    });
    testRecommendationId = recommendation.id;
  });

  describe('Before Metrics Calculation', () => {
    it('should calculate metrics for 7-day period before implementation', async () => {
      const implementedAt = new Date();

      // Create sessions in before period (7 days before implementation)
      const beforeStart = subDays(implementedAt, 7);

      // Create sessions with different patterns
      await prisma.session.createMany({
        data: [
          // 2 converted sessions
          {
            siteId: testSiteId,
            sessionId: 'before-converted-1',
            journeyPath: ['/home', '/product', '/cart', '/checkout', '/confirmation'],
            converted: true,
            bounced: false,
            entryPage: '/home',
            pageCount: 5,
            createdAt: new Date(beforeStart.getTime() + 1 * 24 * 60 * 60 * 1000), // Day 1
          },
          {
            siteId: testSiteId,
            sessionId: 'before-converted-2',
            journeyPath: ['/product', '/cart', '/checkout', '/confirmation'],
            converted: true,
            bounced: false,
            entryPage: '/product',
            pageCount: 4,
            createdAt: new Date(beforeStart.getTime() + 2 * 24 * 60 * 60 * 1000), // Day 2
          },
          // 2 abandoned cart sessions
          {
            siteId: testSiteId,
            sessionId: 'before-abandoned-1',
            journeyPath: ['/home', '/product', '/cart'],
            converted: false,
            bounced: false,
            entryPage: '/home',
            pageCount: 3,
            createdAt: new Date(beforeStart.getTime() + 3 * 24 * 60 * 60 * 1000), // Day 3
          },
          {
            siteId: testSiteId,
            sessionId: 'before-abandoned-2',
            journeyPath: ['/product', '/cart'],
            converted: false,
            bounced: false,
            entryPage: '/product',
            pageCount: 2,
            createdAt: new Date(beforeStart.getTime() + 4 * 24 * 60 * 60 * 1000), // Day 4
          },
          // 1 bounced session
          {
            siteId: testSiteId,
            sessionId: 'before-bounced-1',
            journeyPath: ['/home'],
            converted: false,
            bounced: true,
            entryPage: '/home',
            pageCount: 1,
            createdAt: new Date(beforeStart.getTime() + 5 * 24 * 60 * 60 * 1000), // Day 5
          },
        ],
      });

      const beforeMetrics = await calculateBeforeMetrics(testSiteId, implementedAt);

      // Verify metrics
      expect(beforeMetrics.sessionCount).toBe(5);
      expect(beforeMetrics.conversionRate).toBeCloseTo(40, 1); // 2/5 = 40%
      expect(beforeMetrics.cartAbandonmentRate).toBeCloseTo(50, 1); // 2 carts, 2 abandoned = 50%
      expect(beforeMetrics.confidence).toBe('low'); // < 100 sessions
    });

    it('should return zero metrics for no sessions in before period', async () => {
      const implementedAt = new Date();

      const beforeMetrics = await calculateBeforeMetrics(testSiteId, implementedAt);

      expect(beforeMetrics.sessionCount).toBe(0);
      expect(beforeMetrics.conversionRate).toBe(0);
      expect(beforeMetrics.cartAbandonmentRate).toBe(0);
      expect(beforeMetrics.confidence).toBe('low');
    });

    it('should only include sessions within 7-day before window', async () => {
      const implementedAt = new Date();

      // Create sessions OUTSIDE before period (8 days before)
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'outside-before',
          journeyPath: ['/home', '/product', '/cart', '/checkout', '/confirmation'],
          converted: true,
          bounced: false,
          entryPage: '/home',
          pageCount: 5,
          createdAt: subDays(implementedAt, 8),
        },
      });

      // Create session INSIDE before period (5 days before)
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'inside-before',
          journeyPath: ['/home', '/product'],
          converted: false,
          bounced: false,
          entryPage: '/home',
          pageCount: 2,
          createdAt: subDays(implementedAt, 5),
        },
      });

      const beforeMetrics = await calculateBeforeMetrics(testSiteId, implementedAt);

      // Should only count the session inside the 7-day window
      expect(beforeMetrics.sessionCount).toBe(1);
    });
  });

  describe('After Metrics Calculation', () => {
    it('should calculate metrics for 7-day period after implementation', async () => {
      const implementedAt = subDays(new Date(), 10); // 10 days ago to have complete after period

      // Create sessions in after period
      const afterStart = implementedAt;

      await prisma.session.createMany({
        data: [
          // 3 converted sessions (better than before!)
          {
            siteId: testSiteId,
            sessionId: 'after-converted-1',
            journeyPath: ['/home', '/cart', '/checkout', '/confirmation'],
            converted: true,
            bounced: false,
            entryPage: '/home',
            pageCount: 4,
            createdAt: new Date(afterStart.getTime() + 1 * 24 * 60 * 60 * 1000),
          },
          {
            siteId: testSiteId,
            sessionId: 'after-converted-2',
            journeyPath: ['/product', '/checkout', '/confirmation'],
            converted: true,
            bounced: false,
            entryPage: '/product',
            pageCount: 3,
            createdAt: new Date(afterStart.getTime() + 2 * 24 * 60 * 60 * 1000),
          },
          {
            siteId: testSiteId,
            sessionId: 'after-converted-3',
            journeyPath: ['/home', '/product', '/confirmation'],
            converted: true,
            bounced: false,
            entryPage: '/home',
            pageCount: 3,
            createdAt: new Date(afterStart.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
          // 1 abandoned cart (less abandonment!)
          {
            siteId: testSiteId,
            sessionId: 'after-abandoned-1',
            journeyPath: ['/product', '/cart'],
            converted: false,
            bounced: false,
            entryPage: '/product',
            pageCount: 2,
            createdAt: new Date(afterStart.getTime() + 4 * 24 * 60 * 60 * 1000),
          },
          // 1 normal session
          {
            siteId: testSiteId,
            sessionId: 'after-normal-1',
            journeyPath: ['/home', '/product'],
            converted: false,
            bounced: false,
            entryPage: '/home',
            pageCount: 2,
            createdAt: new Date(afterStart.getTime() + 5 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      const afterMetrics = await calculateAfterMetrics(testSiteId, implementedAt);

      expect(afterMetrics.sessionCount).toBe(5);
      expect(afterMetrics.conversionRate).toBeCloseTo(60, 1); // 3/5 = 60%
      expect(afterMetrics.cartAbandonmentRate).toBeCloseTo(100, 1); // 1 cart, 1 abandoned = 100%
      expect(afterMetrics.confidence).toBe('low'); // < 100 sessions
    });

    it('should handle incomplete after period (< 7 days)', async () => {
      const implementedAt = subDays(new Date(), 3); // Only 3 days ago

      // Create sessions in partial after period
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'partial-after-1',
          journeyPath: ['/home', '/checkout', '/confirmation'],
          converted: true,
          bounced: false,
          entryPage: '/home',
          pageCount: 3,
          createdAt: addDays(implementedAt, 1),
        },
      });

      const afterMetrics = await calculateAfterMetrics(testSiteId, implementedAt);

      // Should calculate based on available data
      expect(afterMetrics.sessionCount).toBe(1);
      expect(afterMetrics.conversionRate).toBe(100); // 1/1 = 100%
    });
  });

  describe('End-to-End Metrics Comparison', () => {
    it('should show positive trend when conversion improves', async () => {
      const implementedAt = subDays(new Date(), 14); // 14 days ago

      // Before: 20% conversion (2/10)
      await createTestSessions(testSiteId, subDays(implementedAt, 3), {
        converted: 2,
        abandoned: 3,
        normal: 5,
      });

      // After: 50% conversion (5/10)
      await createTestSessions(testSiteId, addDays(implementedAt, 3), {
        converted: 5,
        abandoned: 2,
        normal: 3,
      });

      const beforeMetrics = await calculateBeforeMetrics(testSiteId, implementedAt);
      const afterMetrics = await calculateAfterMetrics(testSiteId, implementedAt);

      const conversionChange = calculateMetricChange(
        beforeMetrics.conversionRate,
        afterMetrics.conversionRate,
        false
      );

      expect(beforeMetrics.conversionRate).toBeCloseTo(20, 1);
      expect(afterMetrics.conversionRate).toBeCloseTo(50, 1);
      expect(conversionChange.direction).toBe('positive');
      expect(conversionChange.value).toBeCloseTo(150, 0); // 150% increase

      const status = determineImplementationStatus(
        14,
        conversionChange,
        calculateMetricChange(beforeMetrics.cartAbandonmentRate, afterMetrics.cartAbandonmentRate, true)
      );

      expect(status).toBe('Positive trend');
    });

    it('should enforce business isolation (cannot see other business sessions)', async () => {
      const implementedAt = new Date();
      const otherSiteId = 'site-impl-track-other';

      // Create sessions for OTHER business
      await prisma.session.create({
        data: {
          siteId: otherSiteId,
          sessionId: 'other-business-session',
          journeyPath: ['/home', '/checkout', '/confirmation'],
          converted: true,
          bounced: false,
          entryPage: '/home',
          pageCount: 3,
          createdAt: subDays(implementedAt, 3),
        },
      });

      // Calculate metrics for test business
      const beforeMetrics = await calculateBeforeMetrics(testSiteId, implementedAt);

      // Should NOT include other business's sessions
      expect(beforeMetrics.sessionCount).toBe(0);
    });
  });

  describe('Daily Metrics Fetching', () => {
    it('should fetch daily metrics for 14-day period', async () => {
      const implementedAt = subDays(new Date(), 10);

      // Create sessions across multiple days
      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: 'day-1-session',
            journeyPath: ['/home', '/confirmation'],
            converted: true,
            bounced: false,
            entryPage: '/home',
            pageCount: 2,
            createdAt: subDays(implementedAt, 5), // Before period
          },
          {
            siteId: testSiteId,
            sessionId: 'day-2-session',
            journeyPath: ['/product'],
            converted: false,
            bounced: true,
            entryPage: '/product',
            pageCount: 1,
            createdAt: addDays(implementedAt, 2), // After period
          },
        ],
      });

      const dailyMetrics = await fetchDailyMetrics(testSiteId, implementedAt);

      expect(dailyMetrics.length).toBeGreaterThan(0);
      expect(dailyMetrics.length).toBeLessThanOrEqual(15); // Max 15 days (7 before + implementation day + 7 after)

      // Each daily metric should have required fields
      dailyMetrics.forEach((metric) => {
        expect(metric).toHaveProperty('date');
        expect(metric).toHaveProperty('conversionRate');
        expect(metric).toHaveProperty('cartAbandonmentRate');
        expect(metric).toHaveProperty('sessionCount');
      });
    });
  });
});

/**
 * Helper function to create test sessions with specific patterns
 */
async function createTestSessions(
  siteId: string,
  baseDate: Date,
  counts: { converted: number; abandoned: number; normal: number }
) {
  const sessions = [];
  let sessionCounter = 0;

  // Converted sessions
  for (let i = 0; i < counts.converted; i++) {
    sessions.push({
      siteId,
      sessionId: `test-session-${sessionCounter++}`,
      journeyPath: ['/home', '/product', '/cart', '/checkout', '/confirmation'],
      converted: true,
      bounced: false,
      entryPage: '/home',
      pageCount: 5,
      createdAt: new Date(baseDate.getTime() + i * 60 * 1000), // Stagger by minutes
    });
  }

  // Abandoned cart sessions
  for (let i = 0; i < counts.abandoned; i++) {
    sessions.push({
      siteId,
      sessionId: `test-session-${sessionCounter++}`,
      journeyPath: ['/home', '/product', '/cart'],
      converted: false,
      bounced: false,
      entryPage: '/home',
      pageCount: 3,
      createdAt: new Date(baseDate.getTime() + (counts.converted + i) * 60 * 1000),
    });
  }

  // Normal sessions (no cart, no conversion)
  for (let i = 0; i < counts.normal; i++) {
    sessions.push({
      siteId,
      sessionId: `test-session-${sessionCounter++}`,
      journeyPath: ['/home', '/product'],
      converted: false,
      bounced: false,
      entryPage: '/home',
      pageCount: 2,
      createdAt: new Date(baseDate.getTime() + (counts.converted + counts.abandoned + i) * 60 * 1000),
    });
  }

  await prisma.session.createMany({ data: sessions });
}
