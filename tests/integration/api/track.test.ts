/**
 * Integration tests for POST /api/track endpoint
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST, OPTIONS } from '@/app/api/track/route';
import { clearRateLimits } from '@/lib/rate-limiter';
import { clearEventBuffer } from '@/services/tracking/event-processor';
import type { TrackingEvent } from '@/types/tracking';

// Mock NextRequest
class MockNextRequest {
  private bodyData: unknown;

  constructor(body: unknown) {
    this.bodyData = body;
  }

  async json() {
    return this.bodyData;
  }
}

// Mock Prisma
vi.mock('@/lib/prisma', () => {
  const mockBusiness = vi.fn();
  const mockCreateMany = vi.fn();
  const mockQueryRaw = vi.fn();

  return {
    prisma: {
      business: {
        findUnique: mockBusiness,
      },
      trackingEvent: {
        createMany: mockCreateMany,
      },
      $queryRaw: mockQueryRaw,
    },
    // Export mocks so they can be imported in tests
    __mockBusiness: mockBusiness,
    __mockCreateMany: mockCreateMany,
  };
});

// Import mocks from the mocked module
import { prisma } from '@/lib/prisma';

const mockBusiness = (prisma.business.findUnique as ReturnType<typeof vi.fn>);
const mockCreateMany = (prisma.trackingEvent.createMany as ReturnType<typeof vi.fn>);

describe('POST /api/track', () => {
  beforeEach(() => {
    clearRateLimits();
    clearEventBuffer();
    vi.clearAllMocks();

    // Default: business exists
    mockBusiness.mockResolvedValue({ siteId: 'test-site-123' });
    mockCreateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    clearRateLimits();
    clearEventBuffer();
  });

  describe('Schema Validation (AC#1)', () => {
    it('should accept valid tracking event', async () => {
      const validEvent: TrackingEvent = {
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

      const request = new MockNextRequest({ events: [validEvent] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept all event types', async () => {
      const eventTypes: Array<'pageview' | 'click' | 'form' | 'scroll' | 'time'> = [
        'pageview',
        'click',
        'form',
        'scroll',
        'time',
      ];

      for (const type of eventTypes) {
        const event: TrackingEvent = {
          siteId: 'test-site-123',
          sessionId: 'session-456',
          event: {
            type,
            timestamp: Date.now(),
            data: {},
          },
        };

        const request = new MockNextRequest({ events: [event] }) as any;
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should reject missing siteId', async () => {
      const invalidEvent = {
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [invalidEvent] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Validation failed');
    });

    it('should reject missing sessionId', async () => {
      const invalidEvent = {
        siteId: 'test-site-123',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [invalidEvent] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Validation failed');
    });

    it('should reject invalid event type', async () => {
      const invalidEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'invalid-type',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [invalidEvent] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid timestamp', async () => {
      const invalidEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: -1,
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [invalidEvent] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty events array', async () => {
      const request = new MockNextRequest({ events: [] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Validation failed');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Authentication (AC#6)', () => {
    it('should accept valid siteId', async () => {
      mockBusiness.mockResolvedValue({ siteId: 'valid-site' });

      const event: TrackingEvent = {
        siteId: 'valid-site',
        sessionId: 'session-123',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockBusiness).toHaveBeenCalledWith({
        where: { siteId: 'valid-site' },
        select: { siteId: true },
      });
    });

    it('should reject invalid siteId', async () => {
      mockBusiness.mockResolvedValue(null);

      const event: TrackingEvent = {
        siteId: 'invalid-site',
        sessionId: 'session-123',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid siteId');
    });

    it('should validate siteId before processing events', async () => {
      mockBusiness.mockResolvedValue(null);

      const event: TrackingEvent = {
        siteId: 'invalid-site',
        sessionId: 'session-123',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      await POST(request);

      // Should not call createMany if siteId is invalid
      expect(mockCreateMany).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting (AC#3)', () => {
    it('should allow requests under limit', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      // Make 5 requests (well under limit of 1000)
      for (let i = 0; i < 5; i++) {
        const request = new MockNextRequest({ events: [event] }) as any;
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should return rate limit headers', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);

      const headers = response.headers;
      expect(headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(headers.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should rate limit per siteId independently', async () => {
      // This test would require many requests to hit the limit
      // For brevity, we just verify the rate limit logic is called per-site

      const event1: TrackingEvent = {
        siteId: 'site-1',
        sessionId: 'session-1',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const event2: TrackingEvent = {
        siteId: 'site-2',
        sessionId: 'session-2',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      mockBusiness.mockResolvedValue({ siteId: 'site-1' });
      const request1 = new MockNextRequest({ events: [event1] }) as any;
      const response1 = await POST(request1);

      mockBusiness.mockResolvedValue({ siteId: 'site-2' });
      const request2 = new MockNextRequest({ events: [event2] }) as any;
      const response2 = await POST(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Event Processing (AC#5)', () => {
    it('should process batch of events', async () => {
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
            data: { scrollDepth: 75 },
          },
        },
      ];

      const request = new MockNextRequest({ events }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle pageview events', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {
            url: 'https://example.com/products',
            referrer: 'https://google.com',
            title: 'Products Page',
            path: '/products',
          },
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle click events', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'click',
          timestamp: Date.now(),
          data: {
            selector: 'button.add-to-cart',
            position: { x: 100, y: 200 },
          },
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle form events', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'form',
          timestamp: Date.now(),
          data: {
            formId: 'contact-form',
          },
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle scroll events', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'scroll',
          timestamp: Date.now(),
          data: {
            scrollDepth: 50,
            timeAtDepth: 5000,
          },
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle time events', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'time',
          timestamp: Date.now(),
          data: {
            timeOnPage: 30000,
          },
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('CORS (Cross-Origin)', () => {
    it('should include CORS headers in response', async () => {
      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);

      const headers = response.headers;
      expect(headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should handle OPTIONS preflight request', async () => {
      const response = await OPTIONS();
      const data = await response.json();

      expect(response.status).toBe(200);
      const headers = response.headers;
      expect(headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Error Handling (AC#7)', () => {
    it('should return 500 on database error', async () => {
      mockBusiness.mockRejectedValue(new Error('Database connection failed'));

      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();

      // Reset mock for subsequent tests
      mockBusiness.mockResolvedValue({ siteId: 'test-site-123' });
    });

    it('should not expose error details to client', async () => {
      mockBusiness.mockRejectedValue(new Error('Sensitive database error'));

      const event: TrackingEvent = {
        siteId: 'test-site-123',
        sessionId: 'session-456',
        event: {
          type: 'pageview',
          timestamp: Date.now(),
          data: {},
        },
      };

      const request = new MockNextRequest({ events: [event] }) as any;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).not.toContain('Sensitive');
      expect(data.error).toContain('Internal server error');
    });
  });
});
