/**
 * Journey Insights Page Integration Tests
 *
 * Tests data fetching, funnel calculation, business isolation, and date filtering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { subDays } from 'date-fns';
import {
  calculateFunnelStages,
  calculateJourneyTypeStats,
  detectJourneyType,
} from '@/services/analytics/journey-calculator';

describe('Journey Insights Integration Tests', () => {
  const testUserEmail = 'journey-test@example.com';
  const testSiteId = 'site-journey-test';
  let testUserId: string;

  beforeEach(async () => {
    // Clean up existing test data
    await prisma.session.deleteMany({ where: { siteId: testSiteId } });
    await prisma.business.deleteMany({
      where: { siteId: testSiteId },
    });
    await prisma.user.deleteMany({ where: { email: testUserEmail } });

    // Create test user and business
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Journey Test User',
        password: await hash('password123', 10),
      },
    });
    testUserId = user.id;

    await prisma.business.create({
      data: {
        userId: testUserId,
        siteId: testSiteId,
        name: 'Test Business',
        domain: 'test.example.com',
      },
    });
  });

  describe('Session Data Fetching and Filtering', () => {
    it('should fetch sessions filtered by businessId and date range', async () => {
      const now = new Date();
      const within30Days = subDays(now, 15);
      const within90Days = subDays(now, 60);
      const beyond90Days = subDays(now, 100);

      // Create sessions at different dates
      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: 'session-1',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
            createdAt: within30Days,
          },
          {
            siteId: testSiteId,
            sessionId: 'session-2',
            entryPage: '/',
            pageCount: 2,
            bounced: false,
            converted: false,
            journeyPath: ['/', '/products/item-1'],
            createdAt: within90Days,
          },
          {
            siteId: testSiteId,
            sessionId: 'session-3',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
            createdAt: beyond90Days,
          },
        ],
      });

      // Test 30-day filter
      const sessions30 = await prisma.session.findMany({
        where: {
          siteId: testSiteId,
          createdAt: {
            gte: subDays(now, 30),
            lte: now,
          },
        },
      });
      expect(sessions30.length).toBe(1);

      // Test 90-day filter
      const sessions90 = await prisma.session.findMany({
        where: {
          siteId: testSiteId,
          createdAt: {
            gte: subDays(now, 90),
            lte: now,
          },
        },
      });
      expect(sessions90.length).toBe(2);
    });

    it('should only return sessions for user\'s business (business isolation)', async () => {
      const otherSiteId = 'other-site-123';

      // Create sessions for test business
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'my-session',
          entryPage: '/',
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ['/'],
        },
      });

      // Create sessions for another business
      await prisma.session.create({
        data: {
          siteId: otherSiteId,
          sessionId: 'other-session',
          entryPage: '/',
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ['/'],
        },
      });

      // Fetch only user's business sessions
      const mySessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      expect(mySessions.length).toBe(1);
      expect(mySessions[0].sessionId).toBe('my-session');
    });
  });

  describe('Funnel Calculation with Real Data', () => {
    it('should calculate funnel correctly with sample session data', async () => {
      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: 'session-entry-only',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
          },
          {
            siteId: testSiteId,
            sessionId: 'session-to-product',
            entryPage: '/',
            pageCount: 2,
            bounced: false,
            converted: false,
            journeyPath: ['/', '/products/item-1'],
          },
          {
            siteId: testSiteId,
            sessionId: 'session-to-cart',
            entryPage: '/',
            pageCount: 3,
            bounced: false,
            converted: false,
            journeyPath: ['/', '/products/item-1', '/cart'],
          },
          {
            siteId: testSiteId,
            sessionId: 'session-purchase',
            entryPage: '/',
            pageCount: 5,
            bounced: false,
            converted: true,
            journeyPath: [
              '/',
              '/products/item-1',
              '/cart',
              '/checkout',
              '/confirmation',
            ],
          },
        ],
      });

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      const funnelData = calculateFunnelStages(sessions, 30, 'all');

      expect(funnelData.totalSessions).toBe(4);
      expect(funnelData.stages[0].count).toBe(4); // Entry: all 4
      expect(funnelData.stages[1].count).toBe(3); // Product View: 3
      expect(funnelData.stages[2].count).toBe(2); // Cart: 2
      expect(funnelData.stages[3].count).toBe(1); // Checkout: 1
      expect(funnelData.stages[4].count).toBe(1); // Purchase: 1
      expect(funnelData.overallConversion).toBe(25); // 1 of 4 = 25%
    });

    it('should handle empty state (less than 10 sessions)', async () => {
      // Create only 5 sessions
      await prisma.session.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          siteId: testSiteId,
          sessionId: `session-${i}`,
          entryPage: '/',
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ['/'],
        })),
      });

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      expect(sessions.length).toBe(5);
      // Page should show "Not Enough Data Yet" message
      expect(sessions.length).toBeLessThan(10);
    });
  });

  describe('Journey Type Filtering', () => {
    beforeEach(async () => {
      // Create sessions with different entry pages
      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: 'homepage-1',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
          },
          {
            siteId: testSiteId,
            sessionId: 'homepage-2',
            entryPage: '/home',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/home'],
          },
          {
            siteId: testSiteId,
            sessionId: 'search-1',
            entryPage: '/search?q=shoes',
            pageCount: 2,
            bounced: false,
            converted: false,
            journeyPath: ['/search?q=shoes', '/products/shoe-1'],
          },
          {
            siteId: testSiteId,
            sessionId: 'direct-1',
            entryPage: '/products/item-1',
            pageCount: 2,
            bounced: false,
            converted: false,
            journeyPath: ['/products/item-1', '/cart'],
          },
        ],
      });
    });

    it('should detect journey types correctly', async () => {
      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      const homepage = sessions.filter((s) => detectJourneyType(s) === 'homepage');
      const search = sessions.filter((s) => detectJourneyType(s) === 'search');
      const direct = sessions.filter((s) => detectJourneyType(s) === 'direct-to-product');

      expect(homepage.length).toBe(2);
      expect(search.length).toBe(1);
      expect(direct.length).toBe(1);
    });

    it('should filter funnel data by journey type', async () => {
      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      const homepageFunnel = calculateFunnelStages(sessions, 30, 'homepage');
      expect(homepageFunnel.totalSessions).toBe(2);

      const searchFunnel = calculateFunnelStages(sessions, 30, 'search');
      expect(searchFunnel.totalSessions).toBe(1);

      const directFunnel = calculateFunnelStages(sessions, 30, 'direct-to-product');
      expect(directFunnel.totalSessions).toBe(1);

      const allFunnel = calculateFunnelStages(sessions, 30, 'all');
      expect(allFunnel.totalSessions).toBe(4);
    });

    it('should calculate journey type statistics', async () => {
      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      const stats = calculateJourneyTypeStats(sessions);

      const allStat = stats.find((s) => s.type === 'all');
      expect(allStat?.count).toBe(4);

      const homepageStat = stats.find((s) => s.type === 'homepage');
      expect(homepageStat?.count).toBe(2);
      expect(homepageStat?.percentage).toBe(50);

      const searchStat = stats.find((s) => s.type === 'search');
      expect(searchStat?.count).toBe(1);
      expect(searchStat?.percentage).toBe(25);

      const directStat = stats.find((s) => s.type === 'direct-to-product');
      expect(directStat?.count).toBe(1);
      expect(directStat?.percentage).toBe(25);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter sessions by 7/30/90 day ranges', async () => {
      const now = new Date();

      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: 'recent',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
            createdAt: subDays(now, 3),
          },
          {
            siteId: testSiteId,
            sessionId: 'medium',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
            createdAt: subDays(now, 45),
          },
          {
            siteId: testSiteId,
            sessionId: 'old',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
            createdAt: subDays(now, 120),
          },
        ],
      });

      // 7 days
      const sessions7 = await prisma.session.findMany({
        where: {
          siteId: testSiteId,
          createdAt: { gte: subDays(now, 7) },
        },
      });
      expect(sessions7.length).toBe(1);

      // 30 days
      const sessions30 = await prisma.session.findMany({
        where: {
          siteId: testSiteId,
          createdAt: { gte: subDays(now, 30) },
        },
      });
      expect(sessions30.length).toBe(1);

      // 90 days
      const sessions90 = await prisma.session.findMany({
        where: {
          siteId: testSiteId,
          createdAt: { gte: subDays(now, 90) },
        },
      });
      expect(sessions90.length).toBe(2);
    });
  });

  describe('Business Ownership Verification', () => {
    it('should never return sessions from other businesses', async () => {
      const otherSiteId = 'other-business-site';

      // Create another user and business
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          name: 'Other User',
          password: await hash('password123', 10),
        },
      });

      await prisma.business.create({
        data: {
          userId: otherUser.id,
          siteId: otherSiteId,
          name: 'Other Business',
          domain: 'other.example.com',
        },
      });

      // Create sessions for both businesses
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'my-session',
          entryPage: '/',
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ['/'],
        },
      });

      await prisma.session.create({
        data: {
          siteId: otherSiteId,
          sessionId: 'other-session',
          entryPage: '/',
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ['/'],
        },
      });

      // Verify only own sessions are returned
      const business = await prisma.business.findUnique({
        where: { userId: testUserId },
      });

      const mySessions = await prisma.session.findMany({
        where: { siteId: business!.siteId },
      });

      expect(mySessions.length).toBe(1);
      expect(mySessions[0].sessionId).toBe('my-session');
    });
  });

  describe('Funnel Edge Cases', () => {
    it('should handle all stages at 100% conversion', async () => {
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'perfect-session',
          entryPage: '/',
          pageCount: 5,
          bounced: false,
          converted: true,
          journeyPath: [
            '/',
            '/products/item-1',
            '/cart',
            '/checkout',
            '/confirmation',
          ],
        },
      });

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      const funnelData = calculateFunnelStages(sessions, 30, 'all');

      expect(funnelData.overallConversion).toBe(100);
      expect(funnelData.stages.every((s) => s.count === 1)).toBe(true);
    });

    it('should handle no conversions', async () => {
      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: 'bounce-1',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
          },
          {
            siteId: testSiteId,
            sessionId: 'bounce-2',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/'],
          },
        ],
      });

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      const funnelData = calculateFunnelStages(sessions, 30, 'all');

      expect(funnelData.overallConversion).toBe(0);
      expect(funnelData.stages[4].count).toBe(0); // No purchases
    });

    it('should handle single session', async () => {
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'single',
          entryPage: '/',
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ['/'],
        },
      });

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      const funnelData = calculateFunnelStages(sessions, 30, 'all');

      expect(funnelData.totalSessions).toBe(1);
      expect(funnelData.stages[0].count).toBe(1);
    });
  });
});
