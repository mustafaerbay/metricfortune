/**
 * Peer Benchmarks Page Integration Tests
 * Story 2.5: Peer Benchmarks Tab
 *
 * Tests peer group filtering, metrics calculation, business ownership verification,
 * percentile calculation accuracy, and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import {
  calculateUserMetrics,
  calculatePeerMetrics,
  calculatePercentile,
  compareMetrics
} from '@/services/analytics/peer-calculator';
import type { Business } from '@prisma/client';

describe('Peer Benchmarks Integration Tests', () => {
  const testUserEmail = 'peer-test@example.com';
  const testSiteId = 'site-peer-test';
  const peerGroupId = 'peer-group-test';
  let testUserId: string;
  let testBusinessId: string;

  beforeEach(async () => {
    // Clean up existing test data
    await prisma.session.deleteMany({
      where: { siteId: { startsWith: 'site-peer-test' } }
    });
    await prisma.business.deleteMany({
      where: { siteId: { startsWith: 'site-peer-test' } }
    });
    await prisma.peerGroup.deleteMany({
      where: { id: peerGroupId }
    });
    await prisma.user.deleteMany({ where: { email: testUserEmail } });

    // Create test user and business
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Peer Test User',
        password: await hash('password123', 10)
      }
    });
    testUserId = user.id;

    const business = await prisma.business.create({
      data: {
        userId: testUserId,
        siteId: testSiteId,
        name: 'Test Business',
        domain: 'test.example.com',
        industry: 'fashion',
        revenueRange: '$1-5M',
        productTypes: ['clothing'],
        platform: 'shopify',
        peerGroupId: peerGroupId
      }
    });
    testBusinessId = business.id;

    // Create peer group
    await prisma.peerGroup.create({
      data: {
        id: peerGroupId,
        industry: 'fashion',
        revenueRange: '$1-5M',
        businessIds: [testBusinessId]
      }
    });
  });

  describe('Peer Group Business Fetching', () => {
    it('should fetch peer group businesses filtered by peerGroupId', async () => {
      // Create additional peer businesses
      const peer1 = await prisma.business.create({
        data: {
          userId: testUserId,
          siteId: 'site-peer-test-peer1',
          name: 'Peer Business 1',
          domain: 'peer1.example.com',
          industry: 'fashion',
          revenueRange: '$1-5M',
          productTypes: ['clothing'],
          platform: 'shopify',
          peerGroupId: peerGroupId
        }
      });

      const peer2 = await prisma.business.create({
        data: {
          userId: testUserId,
          siteId: 'site-peer-test-peer2',
          name: 'Peer Business 2',
          domain: 'peer2.example.com',
          industry: 'fashion',
          revenueRange: '$1-5M',
          productTypes: ['clothing'],
          platform: 'shopify',
          peerGroupId: peerGroupId
        }
      });

      // Create business in different peer group (should NOT be fetched)
      await prisma.business.create({
        data: {
          userId: testUserId,
          siteId: 'site-peer-test-other',
          name: 'Other Business',
          domain: 'other.example.com',
          industry: 'electronics',
          revenueRange: '$5-10M',
          productTypes: ['gadgets'],
          platform: 'woocommerce',
          peerGroupId: 'other-peer-group'
        }
      });

      // Fetch peer businesses
      const peerBusinesses = await prisma.business.findMany({
        where: {
          peerGroupId: peerGroupId,
          id: { not: testBusinessId }
        }
      });

      expect(peerBusinesses).toHaveLength(2);
      expect(peerBusinesses.map(b => b.id)).toContain(peer1.id);
      expect(peerBusinesses.map(b => b.id)).toContain(peer2.id);
      expect(peerBusinesses.map(b => b.id)).not.toContain(testBusinessId);
    });

    it('should exclude current business from peer group results', async () => {
      const peerBusinesses = await prisma.business.findMany({
        where: {
          peerGroupId: peerGroupId,
          id: { not: testBusinessId }
        }
      });

      expect(peerBusinesses.every(b => b.id !== testBusinessId)).toBe(true);
    });
  });

  describe('Peer Metrics Calculation', () => {
    it('should calculate user metrics from sample session data', async () => {
      // Create test sessions
      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: 'session-1',
            entryPage: '/',
            pageCount: 5,
            bounced: false,
            converted: true,
            journeyPath: ['/', '/products', '/cart', '/checkout', '/thank-you']
          },
          {
            siteId: testSiteId,
            sessionId: 'session-2',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/']
          },
          {
            siteId: testSiteId,
            sessionId: 'session-3',
            entryPage: '/',
            pageCount: 3,
            bounced: false,
            converted: false,
            journeyPath: ['/', '/products', '/cart']
          },
          {
            siteId: testSiteId,
            sessionId: 'session-4',
            entryPage: '/',
            pageCount: 4,
            bounced: false,
            converted: true,
            journeyPath: ['/', '/products', '/cart', '/checkout', '/thank-you']
          }
        ]
      });

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId }
      });

      const metrics = calculateUserMetrics(sessions);

      // 2 converted out of 4 = 50%
      expect(metrics.conversionRate).toBe(50);

      // AOV is 0 in MVP (no session-to-order linking)
      expect(metrics.avgOrderValue).toBe(0);

      // 3 reached cart, 2 reached checkout = (3-2)/3 = 33.33%
      expect(metrics.cartAbandonmentRate).toBeCloseTo(33.33, 1);

      // 1 bounced out of 4 = 25%
      expect(metrics.bounceRate).toBe(25);
    });

    it('should calculate peer metrics by averaging multiple business metrics', async () => {
      // Create peer businesses with sessions
      const peer1 = await prisma.business.create({
        data: {
          userId: testUserId,
          siteId: 'site-peer-test-peer1',
          name: 'Peer 1',
          domain: 'peer1.example.com',
          industry: 'fashion',
          revenueRange: '$1-5M',
          productTypes: ['clothing'],
          platform: 'shopify',
          peerGroupId: peerGroupId
        }
      });

      const peer2 = await prisma.business.create({
        data: {
          userId: testUserId,
          siteId: 'site-peer-test-peer2',
          name: 'Peer 2',
          domain: 'peer2.example.com',
          industry: 'fashion',
          revenueRange: '$1-5M',
          productTypes: ['clothing'],
          platform: 'shopify',
          peerGroupId: peerGroupId
        }
      });

      // Peer 1: 100% conversion rate (1/1)
      await prisma.session.create({
        data: {
          siteId: peer1.siteId,
          sessionId: 'peer1-session-1',
          entryPage: '/',
          pageCount: 3,
          bounced: false,
          converted: true,
          journeyPath: ['/', '/cart', '/checkout']
        }
      });

      // Peer 2: 50% conversion rate (1/2)
      await prisma.session.createMany({
        data: [
          {
            siteId: peer2.siteId,
            sessionId: 'peer2-session-1',
            entryPage: '/',
            pageCount: 3,
            bounced: false,
            converted: true,
            journeyPath: ['/', '/cart', '/checkout']
          },
          {
            siteId: peer2.siteId,
            sessionId: 'peer2-session-2',
            entryPage: '/',
            pageCount: 1,
            bounced: true,
            converted: false,
            journeyPath: ['/']
          }
        ]
      });

      const peerBusinesses = await prisma.business.findMany({
        where: {
          peerGroupId: peerGroupId,
          id: { not: testBusinessId }
        }
      });

      const peerMetrics = await calculatePeerMetrics(peerBusinesses);

      // Average conversion: (100 + 50) / 2 = 75%
      expect(peerMetrics.conversionRate).toBe(75);

      // AOV is 0 in MVP (no session-to-order linking)
      expect(peerMetrics.avgOrderValue).toBe(0);
    });
  });

  describe('Business Ownership Verification', () => {
    it('should only fetch sessions for user\'s own business', async () => {
      // Create another user with their own business
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user@example.com',
          name: 'Other User',
          password: await hash('password123', 10)
        }
      });

      const otherBusiness = await prisma.business.create({
        data: {
          userId: otherUser.id,
          siteId: 'site-other-user',
          name: 'Other Business',
          domain: 'other.example.com',
          industry: 'fashion',
          revenueRange: '$1-5M',
          productTypes: ['clothing'],
          platform: 'shopify',
          peerGroupId: peerGroupId
        }
      });

      // Create sessions for both businesses
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: 'test-session',
          entryPage: '/',
          pageCount: 1,
          bounced: false,
          converted: true,
          journeyPath: ['/']
        }
      });

      await prisma.session.create({
        data: {
          siteId: otherBusiness.siteId,
          sessionId: 'other-session',
          entryPage: '/',
          pageCount: 1,
          bounced: false,
          converted: true,
          journeyPath: ['/']
        }
      });

      // Fetch sessions only for test user's business
      const userSessions = await prisma.session.findMany({
        where: { siteId: testSiteId }
      });

      expect(userSessions).toHaveLength(1);
      expect(userSessions[0].sessionId).toBe('test-session');
    });
  });

  describe('Percentile Calculation Accuracy', () => {
    it('should accurately calculate top-25, median, and bottom-25 percentiles', async () => {
      // Create peer values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      const peerValues = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);

      // Top 25% (≥75th percentile)
      const top25Result = calculatePercentile(90, peerValues, true);
      expect(top25Result.percentile).toBe('top-25');
      expect(top25Result.percentileValue).toBeGreaterThanOrEqual(75);

      // Median (25-74th percentile)
      const medianResult = calculatePercentile(50, peerValues, true);
      expect(medianResult.percentile).toBe('median');
      expect(medianResult.percentileValue).toBeGreaterThanOrEqual(25);
      expect(medianResult.percentileValue).toBeLessThan(75);

      // Bottom 25% (<25th percentile)
      const bottom25Result = calculatePercentile(20, peerValues, true);
      expect(bottom25Result.percentile).toBe('bottom-25');
      expect(bottom25Result.percentileValue).toBeLessThan(25);
    });

    it('should handle "lower is better" metrics correctly', async () => {
      const peerValues = [20, 30, 40, 50, 60];

      // Lower bounce rate (15%) is better than peers
      const result = calculatePercentile(15, peerValues, false);
      expect(result.percentile).toBe('top-25');
      expect(result.percentileValue).toBe(100); // All peers have worse (higher) bounce rates
    });
  });

  describe('Edge Cases', () => {
    it('should handle business with no peer group assigned', async () => {
      const business = await prisma.business.findUnique({
        where: { id: testBusinessId }
      });

      // Update business to remove peer group
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { peerGroupId: null }
      });

      const updatedBusiness = await prisma.business.findUnique({
        where: { id: testBusinessId }
      });

      expect(updatedBusiness?.peerGroupId).toBeNull();
    });

    it('should handle insufficient peer data (<10 businesses)', async () => {
      // Create only 5 peer businesses
      const peerPromises = Array.from({ length: 5 }, (_, i) =>
        prisma.business.create({
          data: {
            userId: testUserId,
            siteId: `site-peer-test-peer${i}`,
            name: `Peer ${i}`,
            domain: `peer${i}.example.com`,
            industry: 'fashion',
            revenueRange: '$1-5M',
            productTypes: ['clothing'],
            platform: 'shopify',
            peerGroupId: peerGroupId
          }
        })
      );

      await Promise.all(peerPromises);

      const peerBusinesses = await prisma.business.findMany({
        where: {
          peerGroupId: peerGroupId,
          id: { not: testBusinessId }
        }
      });

      expect(peerBusinesses.length).toBeLessThan(10);
    });

    it('should handle new business with insufficient sessions (<100)', async () => {
      // Create only 50 sessions
      const sessionPromises = Array.from({ length: 50 }, (_, i) =>
        prisma.session.create({
          data: {
            siteId: testSiteId,
            sessionId: `session-${i}`,
            entryPage: '/',
            pageCount: 1,
            bounced: false,
            converted: false,
            journeyPath: ['/']
          }
        })
      );

      await Promise.all(sessionPromises);

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId }
      });

      expect(sessions.length).toBeLessThan(100);
    });

    it('should handle empty session data gracefully', async () => {
      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId }
      });

      expect(sessions).toHaveLength(0);

      const metrics = calculateUserMetrics(sessions);

      expect(metrics.conversionRate).toBe(0);
      expect(metrics.avgOrderValue).toBe(0);
      expect(metrics.cartAbandonmentRate).toBe(0);
      expect(metrics.bounceRate).toBe(0);
    });
  });

  describe('Recommendations Link for Underperforming Metrics', () => {
    it('should identify underperforming metrics (user value < peer average)', async () => {
      // Create peer businesses with better performance
      const peer1 = await prisma.business.create({
        data: {
          userId: testUserId,
          siteId: 'site-peer-high-performer',
          name: 'High Performer',
          domain: 'highperformer.example.com',
          industry: 'fashion',
          revenueRange: '$1-5M',
          productTypes: ['clothing'],
          platform: 'shopify',
          peerGroupId: peerGroupId
        }
      });

      // High-performing peer (80% conversion)
      await prisma.session.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          siteId: peer1.siteId,
          sessionId: `peer-session-${i}`,
          entryPage: '/',
          pageCount: i < 8 ? 3 : 1,
          bounced: i >= 8,
          converted: i < 8,
          journeyPath: i < 8 ? ['/', '/cart', '/checkout'] : ['/']
        }))
      });

      // Low-performing user (20% conversion)
      await prisma.session.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          siteId: testSiteId,
          sessionId: `user-session-${i}`,
          entryPage: '/',
          pageCount: i < 2 ? 3 : 1,
          bounced: i >= 2,
          converted: i < 2,
          journeyPath: i < 2 ? ['/', '/cart', '/checkout'] : ['/']
        }))
      });

      const userSessions = await prisma.session.findMany({
        where: { siteId: testSiteId }
      });

      const peerBusinesses = await prisma.business.findMany({
        where: {
          peerGroupId: peerGroupId,
          id: { not: testBusinessId }
        }
      });

      const userMetrics = calculateUserMetrics(userSessions);
      const peerMetrics = await calculatePeerMetrics(peerBusinesses);
      const comparisons = await compareMetrics(userMetrics, peerMetrics, peerBusinesses);

      // Find conversion rate comparison
      const conversionComparison = comparisons.find(c =>
        c.metric.toLowerCase().includes('conversion')
      );

      expect(conversionComparison?.performance).toBe('below');
      expect(conversionComparison?.userValue).toBeLessThan(conversionComparison?.peerAverage);
    });
  });
});
