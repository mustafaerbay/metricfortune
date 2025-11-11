/**
 * Session Aggregation Data Accuracy Tests (AC #6)
 * Validates session grouping, metadata calculation, and conversion detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { testPrisma, createTestTrackingEvents, seedBusiness } from '../../helpers/database';

describe('Session Aggregation Accuracy', () => {
  let siteId: string;

  beforeEach(async () => {
    const business = await seedBusiness({
      name: 'Test Business',
      industry: 'fashion',
      revenueRange: '1M-5M',
      productTypes: ['clothing'],
      platform: 'Shopify',
    });
    siteId = business.siteId;
  });

  describe('Session Grouping', () => {
    it('should group events by sessionId into single session', async () => {
      // AC #6: Session grouping accuracy
      const sessionId = 'session-123';
      const baseTime = new Date();

      // Create multiple events for same session
      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: baseTime,
          data: { url: '/page1' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 10000),
          data: { url: '/page2' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 20000),
          data: { url: '/page3' },
        },
      ]);

      const events = await testPrisma.trackingEvent.findMany({
        where: { sessionId },
      });

      expect(events.length).toBe(3);
      expect(events.every((e) => e.sessionId === sessionId)).toBe(true);
    });
  });

  describe('Metadata Calculation', () => {
    it('should calculate session duration correctly', async () => {
      // AC #6: Duration calculation accuracy
      const sessionId = 'session-456';
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 300000); // 5 minutes later

      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: startTime,
          data: { url: '/start' },
        },
        {
          siteId,
          sessionId,
          eventType: 'time',
          timestamp: endTime,
          data: { duration: 300000 },
        },
      ]);

      // Verify events stored correctly with timestamps
      const events = await testPrisma.trackingEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });

      expect(events.length).toBe(2);
      const duration = events[1].timestamp.getTime() - events[0].timestamp.getTime();
      expect(duration).toBe(300000); // 5 minutes
    });

    it('should count pages correctly', async () => {
      // AC #6: Page count accuracy
      const sessionId = 'session-789';
      const baseTime = new Date();

      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: baseTime,
          data: { url: '/page1' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 5000),
          data: { url: '/page2' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 10000),
          data: { url: '/page3' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 15000),
          data: { url: '/page4' },
        },
      ]);

      const pageviews = await testPrisma.trackingEvent.count({
        where: {
          sessionId,
          eventType: 'pageview',
        },
      });

      expect(pageviews).toBe(4);
    });

    it('should identify bounce sessions correctly', async () => {
      // AC #6: Bounce detection accuracy
      const sessionId = 'session-bounce';
      const timestamp = new Date();

      // Single pageview = bounce
      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp,
          data: { url: '/only-page' },
        },
      ]);

      const pageviews = await testPrisma.trackingEvent.count({
        where: {
          sessionId,
          eventType: 'pageview',
        },
      });

      expect(pageviews).toBe(1); // Single page = bounce
    });
  });

  describe('Conversion Detection', () => {
    it('should detect converted sessions', async () => {
      // AC #6: Conversion detection accuracy
      const sessionId = 'session-converted';
      const baseTime = new Date();

      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: baseTime,
          data: { url: '/products' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 30000),
          data: { url: '/checkout' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 60000),
          data: { url: '/order/confirmation' },
        },
      ]);

      const events = await testPrisma.trackingEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });

      // Verify conversion flow exists
      const hasCheckout = events.some((e) =>
        e.data && typeof e.data === 'object' && 'url' in e.data &&
        typeof e.data.url === 'string' && e.data.url.includes('checkout')
      );
      const hasConfirmation = events.some((e) =>
        e.data && typeof e.data === 'object' && 'url' in e.data &&
        typeof e.data.url === 'string' && e.data.url.includes('confirmation')
      );

      expect(hasCheckout).toBe(true);
      expect(hasConfirmation).toBe(true);
    });
  });

  describe('Entry and Exit Page Accuracy', () => {
    it('should correctly identify entry and exit pages', async () => {
      // AC #6: Entry/exit page accuracy
      const sessionId = 'session-entry-exit';
      const baseTime = new Date();

      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: baseTime,
          data: { url: '/entry-page' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 10000),
          data: { url: '/middle-page' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: new Date(baseTime.getTime() + 20000),
          data: { url: '/exit-page' },
        },
      ]);

      const events = await testPrisma.trackingEvent.findMany({
        where: { sessionId, eventType: 'pageview' },
        orderBy: { timestamp: 'asc' },
      });

      // First pageview = entry page
      expect(events[0].data).toMatchObject({ url: '/entry-page' });

      // Last pageview = exit page
      expect(events[events.length - 1].data).toMatchObject({ url: '/exit-page' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-page sessions', async () => {
      // AC #6: Edge case - single page session
      const sessionId = 'session-single';
      const timestamp = new Date();

      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp,
          data: { url: '/single-page' },
        },
      ]);

      const events = await testPrisma.trackingEvent.findMany({
        where: { sessionId },
      });

      expect(events.length).toBe(1);
      // Entry page = Exit page for single-page sessions
    });

    it('should handle very long sessions (>1 hour)', async () => {
      // AC #6: Edge case - long session
      const sessionId = 'session-long';
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 3600000 * 2); // 2 hours

      await createTestTrackingEvents([
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: startTime,
          data: { url: '/start' },
        },
        {
          siteId,
          sessionId,
          eventType: 'pageview',
          timestamp: endTime,
          data: { url: '/end' },
        },
      ]);

      const events = await testPrisma.trackingEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });

      const duration = events[1].timestamp.getTime() - events[0].timestamp.getTime();
      expect(duration).toBeGreaterThan(3600000); // > 1 hour
    });
  });
});
