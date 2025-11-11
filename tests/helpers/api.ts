/**
 * API Test Utilities
 * Provides helper functions for making API requests in tests
 */

import type { TrackingEvent } from '@/types/tracking';

/**
 * Submit tracking event(s) to the /api/track endpoint
 */
export async function submitTrackingEvent(
  siteId: string,
  events: TrackingEvent | TrackingEvent[],
  baseUrl: string = 'http://localhost:3000'
): Promise<Response> {
  const eventArray = Array.isArray(events) ? events : [events];

  return fetch(`${baseUrl}/api/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      events: eventArray,
    }),
  });
}

/**
 * Authenticate a test user and return session cookie
 * Uses NextAuth signIn API
 */
export async function authenticateTestUser(
  email: string,
  password: string = 'TestPassword123!',
  baseUrl: string = 'http://localhost:3000'
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/signin/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  // Extract session cookie from response
  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No session cookie returned from authentication');
  }

  return cookies;
}

/**
 * Mock Shopify webhook payload
 * Simulates Shopify order creation webhook
 */
export function mockShopifyWebhook(data: {
  orderId: string;
  shopDomain: string;
  total: number;
  currency: string;
}): any {
  return {
    id: parseInt(data.orderId),
    order_number: parseInt(data.orderId),
    email: `customer@${data.shopDomain}`,
    total_price: data.total.toString(),
    currency: data.currency,
    financial_status: 'paid',
    fulfillment_status: null,
    created_at: new Date().toISOString(),
    line_items: [
      {
        id: 1,
        title: 'Test Product',
        quantity: 1,
        price: data.total.toString(),
      },
    ],
    customer: {
      email: `customer@${data.shopDomain}`,
      first_name: 'Test',
      last_name: 'Customer',
    },
  };
}

/**
 * Wait for API response with retry logic
 */
export async function waitForApiResponse(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 10,
  delayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      lastError = error as Error;
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `Failed to get successful response from ${url} after ${maxRetries} retries: ${lastError?.message}`
  );
}

/**
 * Create a batch of tracking events for testing
 */
export function createTrackingEventBatch(
  siteId: string,
  sessionId: string,
  count: number = 10
): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  let timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    timestamp += 1000; // 1 second between events
    events.push({
      siteId,
      sessionId,
      event: {
        type: 'pageview',
        timestamp,
        data: {
          url: `https://example.com/page-${i}`,
          referrer: i > 0 ? `https://example.com/page-${i - 1}` : null,
          title: `Page ${i}`,
          path: `/page-${i}`,
        },
      },
    });
  }

  return events;
}
