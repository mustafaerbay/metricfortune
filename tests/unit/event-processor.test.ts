/**
 * Unit tests for Event Processor Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  processTrackingEvent,
  processTrackingEvents,
  clearEventBuffer,
  getBufferSize,
  flushEventBuffer,
} from '@/services/tracking/event-processor';
import type { TrackingEvent } from '@/types/tracking';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    trackingEvent: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

describe('Event Processor', () => {
  beforeEach(() => {
    clearEventBuffer();
  });

  afterEach(() => {
    clearEventBuffer();
  });

  describe('processTrackingEvent', () => {
    it('should successfully buffer a single event', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {
            url: 'https://example.com',
            referrer: 'https://google.com',
          },
        },
      };

      const result = await processTrackingEvent(event);

      expect(result.success).toBe(true);
      expect(result.buffered).toBe(true);
      expect(getBufferSize()).toBe(1);
    });

    it('should buffer multiple events', async () => {
      const events: TrackingEvent[] = [
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'pageview',
            timestamp: Date.now(),
            data: { url: 'https://example.com/page1' },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'click',
            timestamp: Date.now(),
            data: { selector: 'button.cta', position: { x: 100, y: 200 } },
          },
        },
      ];

      for (const event of events) {
        await processTrackingEvent(event);
      }

      expect(getBufferSize()).toBe(2);
    });
  });

  describe('processTrackingEvents', () => {
    it('should successfully buffer multiple events at once', async () => {
      const events: TrackingEvent[] = [
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'pageview',
            timestamp: Date.now(),
            data: { url: 'https://example.com/page1' },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'click',
            timestamp: Date.now(),
            data: { selector: 'button.cta' },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'scroll',
            timestamp: Date.now(),
            data: { scrollDepth: 75, timeAtDepth: 5000 },
          },
        },
      ];

      const result = await processTrackingEvents(events);

      expect(result.success).toBe(true);
      expect(result.buffered).toBe(false); // Serverless-optimized: writes directly, no buffering
      expect(getBufferSize()).toBe(0); // Buffer not used for batch events
    });

    it('should handle all event types', async () => {
      const events: TrackingEvent[] = [
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'pageview',
            timestamp: Date.now(),
            data: { url: 'https://example.com' },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'click',
            timestamp: Date.now(),
            data: { selector: 'a.link' },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'form',
            timestamp: Date.now(),
            data: { formId: 'contact-form' },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'scroll',
            timestamp: Date.now(),
            data: { scrollDepth: 50 },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'time',
            timestamp: Date.now(),
            data: { timeOnPage: 30000 },
          },
        },
      ];

      const result = await processTrackingEvents(events);

      expect(result.success).toBe(true);
      expect(getBufferSize()).toBe(0); // Serverless-optimized: writes directly
    });
  });

  describe('flushEventBuffer', () => {
    it('should flush buffer to database', async () => {
      const events: TrackingEvent[] = [
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'pageview',
            timestamp: Date.now(),
            data: { url: 'https://example.com' },
          },
        },
      ];

      await processTrackingEvents(events);
      expect(getBufferSize()).toBe(0); // Serverless-optimized: no buffering

      await flushEventBuffer();

      // Buffer remains empty (nothing was buffered)
      expect(getBufferSize()).toBe(0);
    });

    it('should handle empty buffer gracefully', async () => {
      expect(getBufferSize()).toBe(0);

      await expect(flushEventBuffer()).resolves.not.toThrow();

      expect(getBufferSize()).toBe(0);
    });
  });

  describe('getBufferSize', () => {
    it('should return correct buffer size', async () => {
      expect(getBufferSize()).toBe(0);

      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: { url: 'https://example.com' },
        },
      };

      await processTrackingEvent(event);
      expect(getBufferSize()).toBe(1);

      await processTrackingEvent(event);
      expect(getBufferSize()).toBe(2);
    });
  });

  describe('clearEventBuffer', () => {
    it('should clear all buffered events', async () => {
      const events: TrackingEvent[] = [
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'pageview',
            timestamp: Date.now(),
            data: { url: 'https://example.com' },
          },
        },
        {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type: 'click',
            timestamp: Date.now(),
            data: { selector: 'button' },
          },
        },
      ];

      await processTrackingEvents(events);
      expect(getBufferSize()).toBe(0); // Serverless-optimized: no buffering

      clearEventBuffer();
      expect(getBufferSize()).toBe(0); // Buffer already empty
    });
  });
});
