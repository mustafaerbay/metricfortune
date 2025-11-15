/**
 * Journey Calculator Service Unit Tests
 *
 * Tests funnel calculation logic, journey type detection, and insight generation
 * Coverage target: 80%+
 */

import { describe, it, expect } from 'vitest';
import type { Session } from '@prisma/client';
import {
  calculateFunnelStages,
  detectJourneyType,
  calculateJourneyTypeStats,
  generateInsight,
} from '@/services/analytics/journey-calculator';

// Helper to create test session
function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test-session-' + Math.random(),
    siteId: 'site-123',
    sessionId: 'session-' + Math.random(),
    entryPage: '/',
    exitPage: '/exit',
    duration: 120,
    pageCount: 3,
    bounced: false,
    converted: false,
    journeyPath: ['/'],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('Journey Calculator Service', () => {
  describe('calculateFunnelStages', () => {
    it('should calculate funnel with all stages for complete journey', () => {
      const sessions: Session[] = [
        createSession({
          journeyPath: ['/', '/products/item-1', '/cart', '/checkout', '/thank-you'],
          converted: true,
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      expect(result.totalSessions).toBe(1);
      expect(result.stages).toHaveLength(5);
      expect(result.stages[0].name).toBe('Entry');
      expect(result.stages[0].count).toBe(1);
      expect(result.stages[1].name).toBe('Product View');
      expect(result.stages[1].count).toBe(1);
      expect(result.stages[2].name).toBe('Cart');
      expect(result.stages[2].count).toBe(1);
      expect(result.stages[3].name).toBe('Checkout');
      expect(result.stages[3].count).toBe(1);
      expect(result.stages[4].name).toBe('Purchase');
      expect(result.stages[4].count).toBe(1);
      expect(result.overallConversion).toBe(100);
    });

    it('should calculate drop-off rates correctly', () => {
      const sessions: Session[] = [
        createSession({
          journeyPath: ['/'],
          converted: false,
        }),
        createSession({
          journeyPath: ['/', '/products/item-1'],
          converted: false,
        }),
        createSession({
          journeyPath: ['/', '/products/item-1', '/cart'],
          converted: false,
        }),
        createSession({
          journeyPath: ['/', '/products/item-1', '/cart', '/checkout', '/success'],
          converted: true,
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      expect(result.totalSessions).toBe(4);
      expect(result.stages[0].count).toBe(4); // All reach Entry
      expect(result.stages[1].count).toBe(3); // 3 reach Product View
      expect(result.stages[1].dropOffRate).toBe(25); // 1 of 4 dropped = 25%
      expect(result.stages[2].count).toBe(2); // 2 reach Cart
      expect(result.stages[2].dropOffRate).toBe(33.3); // 1 of 3 dropped ≈ 33.3%
      expect(result.stages[4].count).toBe(1); // 1 purchase
      expect(result.overallConversion).toBe(25); // 1 of 4 = 25%
    });

    it('should calculate conversion rates correctly', () => {
      const sessions: Session[] = [
        createSession({
          journeyPath: ['/', '/products/item-1'],
          converted: false,
        }),
        createSession({
          journeyPath: ['/', '/products/item-1', '/cart'],
          converted: false,
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      expect(result.stages[0].conversionRate).toBe(100); // 2 of 2 reached Product View
      expect(result.stages[1].conversionRate).toBe(50); // 1 of 2 reached Cart
      expect(result.stages[2].conversionRate).toBe(0); // 0 of 1 reached Checkout
    });

    it('should handle empty session data', () => {
      const result = calculateFunnelStages([], 30, 'all');

      expect(result.totalSessions).toBe(0);
      expect(result.overallConversion).toBe(0);
      expect(result.stages).toHaveLength(5);
      expect(result.stages[0].count).toBe(0);
    });

    it('should track top pages for each stage', () => {
      const sessions: Session[] = [
        createSession({
          journeyPath: ['/', '/products/item-1', '/cart'],
        }),
        createSession({
          journeyPath: ['/', '/products/item-2', '/cart'],
        }),
        createSession({
          journeyPath: ['/', '/products/item-1', '/cart'],
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      const productStage = result.stages.find((s) => s.name === 'Product View');
      expect(productStage?.topPages).toBeDefined();
      expect(productStage?.topPages?.[0].url).toBe('/products/item-1');
      expect(productStage?.topPages?.[0].count).toBe(2);
      expect(productStage?.topPages?.[1].url).toBe('/products/item-2');
      expect(productStage?.topPages?.[1].count).toBe(1);
    });

    it('should filter by journey type', () => {
      const sessions: Session[] = [
        createSession({
          entryPage: '/',
          journeyPath: ['/'],
        }),
        createSession({
          entryPage: '/products/item-1',
          journeyPath: ['/products/item-1'],
        }),
        createSession({
          entryPage: '/search',
          journeyPath: ['/search'],
        }),
      ];

      const homepageResult = calculateFunnelStages(sessions, 30, 'homepage');
      expect(homepageResult.totalSessions).toBe(1);

      const directResult = calculateFunnelStages(sessions, 30, 'direct-to-product');
      expect(directResult.totalSessions).toBe(1);

      const searchResult = calculateFunnelStages(sessions, 30, 'search');
      expect(searchResult.totalSessions).toBe(1);

      const allResult = calculateFunnelStages(sessions, 30, 'all');
      expect(allResult.totalSessions).toBe(3);
    });

    it('should calculate average time spent per stage', () => {
      const sessions: Session[] = [
        createSession({
          journeyPath: ['/', '/products/item-1'],
          duration: 60,
        }),
        createSession({
          journeyPath: ['/', '/products/item-2'],
          duration: 120,
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      const entryStage = result.stages.find((s) => s.name === 'Entry');
      expect(entryStage?.avgTimeSpent).toBeDefined();
      expect(entryStage?.avgTimeSpent).toBeGreaterThan(0);
    });
  });

  describe('detectJourneyType', () => {
    it('should detect homepage visitors', () => {
      const session1 = createSession({ entryPage: '/' });
      const session2 = createSession({ entryPage: '/home' });
      const session3 = createSession({ entryPage: '' });

      expect(detectJourneyType(session1)).toBe('homepage');
      expect(detectJourneyType(session2)).toBe('homepage');
      expect(detectJourneyType(session3)).toBe('homepage');
    });

    it('should detect search visitors', () => {
      const session1 = createSession({ entryPage: '/search' });
      const session2 = createSession({ entryPage: '/collections/summer' });
      const session3 = createSession({ entryPage: '/search?q=shoes' });

      expect(detectJourneyType(session1)).toBe('search');
      expect(detectJourneyType(session2)).toBe('search');
      expect(detectJourneyType(session3)).toBe('search');
    });

    it('should detect direct-to-product visitors', () => {
      const session1 = createSession({ entryPage: '/products/item-1' });
      const session2 = createSession({ entryPage: '/product/item-2' });
      const session3 = createSession({ entryPage: '/item/abc' });

      expect(detectJourneyType(session1)).toBe('direct-to-product');
      expect(detectJourneyType(session2)).toBe('direct-to-product');
      expect(detectJourneyType(session3)).toBe('direct-to-product');
    });

    it('should detect other visitors', () => {
      const session1 = createSession({ entryPage: '/about' });
      const session2 = createSession({ entryPage: '/contact' });
      const session3 = createSession({ entryPage: '/blog/post-1' });

      expect(detectJourneyType(session1)).toBe('other');
      expect(detectJourneyType(session2)).toBe('other');
      expect(detectJourneyType(session3)).toBe('other');
    });

    it('should be case insensitive', () => {
      const session1 = createSession({ entryPage: '/PRODUCTS/item-1' });
      const session2 = createSession({ entryPage: '/SEARCH' });

      expect(detectJourneyType(session1)).toBe('direct-to-product');
      expect(detectJourneyType(session2)).toBe('search');
    });
  });

  describe('calculateJourneyTypeStats', () => {
    it('should calculate statistics for all journey types', () => {
      const sessions: Session[] = [
        createSession({ entryPage: '/' }),
        createSession({ entryPage: '/' }),
        createSession({ entryPage: '/products/item-1' }),
        createSession({ entryPage: '/search' }),
        createSession({ entryPage: '/about' }),
      ];

      const stats = calculateJourneyTypeStats(sessions);

      const allStat = stats.find((s) => s.type === 'all');
      expect(allStat?.count).toBe(5);
      expect(allStat?.percentage).toBe(100);

      const homepageStat = stats.find((s) => s.type === 'homepage');
      expect(homepageStat?.count).toBe(2);
      expect(homepageStat?.percentage).toBe(40);

      const directStat = stats.find((s) => s.type === 'direct-to-product');
      expect(directStat?.count).toBe(1);
      expect(directStat?.percentage).toBe(20);

      const searchStat = stats.find((s) => s.type === 'search');
      expect(searchStat?.count).toBe(1);
      expect(searchStat?.percentage).toBe(20);

      const otherStat = stats.find((s) => s.type === 'other');
      expect(otherStat?.count).toBe(1);
      expect(otherStat?.percentage).toBe(20);
    });

    it('should handle empty sessions', () => {
      const stats = calculateJourneyTypeStats([]);

      const allStat = stats.find((s) => s.type === 'all');
      expect(allStat?.count).toBe(0);
      expect(allStat?.percentage).toBe(0);
    });
  });

  describe('generateInsight', () => {
    it('should identify biggest drop-off stage', () => {
      const funnelData = calculateFunnelStages(
        [
          createSession({
            journeyPath: ['/'],
            converted: false,
          }),
          createSession({
            journeyPath: ['/', '/products/item-1'],
            converted: false,
          }),
          createSession({
            journeyPath: ['/', '/products/item-1', '/cart'],
            converted: false,
          }),
        ],
        30,
        'all'
      );

      const insight = generateInsight(funnelData);

      expect(insight.primary).toContain('biggest opportunity');
      expect(insight.biggestDropOffStage).toBeDefined();
      expect(insight.biggestDropOffRate).toBeGreaterThan(0);
    });

    it('should identify best performing stage', () => {
      const funnelData = calculateFunnelStages(
        [
          createSession({
            journeyPath: ['/', '/products/item-1', '/cart'],
            converted: false,
          }),
          createSession({
            journeyPath: ['/', '/products/item-1', '/cart'],
            converted: false,
          }),
        ],
        30,
        'all'
      );

      const insight = generateInsight(funnelData);

      expect(insight.secondary).toBeDefined();
      expect(insight.secondary).toContain('Strong performance');
      expect(insight.bestPerformingStage).toBeDefined();
      expect(insight.bestConversionRate).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', () => {
      const funnelData = calculateFunnelStages([], 30, 'all');
      const insight = generateInsight(funnelData);

      expect(insight.primary).toContain('No data yet');
    });

    it('should handle perfect funnel (no drop-offs)', () => {
      const funnelData = calculateFunnelStages(
        [
          createSession({
            journeyPath: ['/', '/products/item-1', '/cart', '/checkout', '/success'],
            converted: true,
          }),
        ],
        30,
        'all'
      );

      const insight = generateInsight(funnelData);

      expect(insight.primary).toContain('No significant drop-offs');
    });
  });

  describe('Edge Cases', () => {
    it('should handle sessions with no journey path', () => {
      const sessions: Session[] = [
        createSession({
          journeyPath: [],
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      expect(result.totalSessions).toBe(1);
      expect(result.stages[0].count).toBe(1); // Entry always counts
      expect(result.stages[1].count).toBe(0); // No product views
    });

    it('should handle sessions with duplicate pages in journey', () => {
      const sessions: Session[] = [
        createSession({
          journeyPath: [
            '/',
            '/products/item-1',
            '/products/item-1',
            '/cart',
            '/products/item-1',
          ],
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      // Should still count as reaching Product View stage once
      expect(result.stages[1].count).toBe(1);
    });

    it('should handle sessions with null duration', () => {
      const sessions: Session[] = [
        createSession({
          duration: null,
          journeyPath: ['/'],
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      expect(result.stages[0].avgTimeSpent).toBeUndefined();
    });

    it('should handle very long journey paths', () => {
      const longPath = Array.from({ length: 100 }, (_, i) => `/page-${i}`);
      const sessions: Session[] = [
        createSession({
          journeyPath: longPath,
        }),
      ];

      const result = calculateFunnelStages(sessions, 30, 'all');

      expect(result.totalSessions).toBe(1);
    });
  });
});
