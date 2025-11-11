/**
 * Tracking Data Generator for Test Data
 * Generates synthetic tracking events with realistic user behavior patterns
 */

import { nanoid } from 'nanoid';
import type { TrackingEvent, EventType, EventData } from '@/types/tracking';

export interface SessionConfig {
  siteId: string;
  sessionId?: string;
  scenario: 'conversion' | 'abandonment' | 'bounce' | 'exploration' | 'long-session';
  platform?: 'desktop' | 'mobile';
  startTime?: Date;
}

export interface VolumeConfig {
  name: 'small' | 'medium' | 'large' | 'xlarge';
  sessionCount: number;
  eventsPerSession: { min: number; max: number };
}

// Common e-commerce pages
const PAGES = {
  entry: [
    '/',
    '/collections/new-arrivals',
    '/collections/sale',
    '/products/featured-item',
    '/blog/latest-trends',
  ],
  product: [
    '/products/product-1',
    '/products/product-2',
    '/products/bestseller',
    '/products/limited-edition',
  ],
  cart: ['/cart'],
  checkout: ['/checkout', '/checkout/shipping', '/checkout/payment'],
  account: ['/account', '/account/login', '/account/register'],
  info: ['/about', '/contact', '/shipping', '/returns'],
  confirmation: ['/order/confirmation'],
};

// Volume configurations (as per story requirements)
export const VOLUME_CONFIGS: Record<VolumeConfig['name'], VolumeConfig> = {
  small: { name: 'small', sessionCount: 100, eventsPerSession: { min: 3, max: 15 } },
  medium: { name: 'medium', sessionCount: 1000, eventsPerSession: { min: 5, max: 25 } },
  large: { name: 'large', sessionCount: 10000, eventsPerSession: { min: 3, max: 30 } },
  xlarge: { name: 'xlarge', sessionCount: 50000, eventsPerSession: { min: 3, max: 30 } },
};

/**
 * Generate a random session ID
 */
export function generateSessionId(): string {
  return `session_${nanoid(16)}`;
}

/**
 * Create a tracking event
 */
function createEvent(
  siteId: string,
  sessionId: string,
  type: EventType,
  data: EventData,
  timestamp: number
): TrackingEvent {
  return {
    siteId,
    sessionId,
    event: {
      type,
      timestamp,
      data,
    },
  };
}

/**
 * Generate a pageview event
 */
function generatePageview(
  siteId: string,
  sessionId: string,
  url: string,
  referrer: string | null,
  timestamp: number
): TrackingEvent {
  const path = new URL(url, 'https://example.com').pathname;
  return createEvent(siteId, sessionId, 'pageview', {
    url,
    referrer,
    title: `Page - ${path}`,
    path,
  }, timestamp);
}

/**
 * Generate a click event
 */
function generateClick(
  siteId: string,
  sessionId: string,
  selector: string,
  text: string,
  timestamp: number,
  href?: string
): TrackingEvent {
  return createEvent(siteId, sessionId, 'click', {
    selector,
    tagName: href ? 'a' : 'button',
    text,
    href,
    x: Math.floor(Math.random() * 1200),
    y: Math.floor(Math.random() * 800),
    position: {
      x: Math.floor(Math.random() * 1200),
      y: Math.floor(Math.random() * 800),
    },
  }, timestamp);
}

/**
 * Generate a form event
 */
function generateFormEvent(
  siteId: string,
  sessionId: string,
  formId: string,
  fieldName: string,
  eventType: 'focus' | 'blur' | 'change',
  timestamp: number
): TrackingEvent {
  return createEvent(siteId, sessionId, 'form', {
    formId,
    fieldName,
    fieldType: fieldName.includes('email') ? 'email' : 'text',
    eventType,
    fieldInteractions: {
      focusCount: eventType === 'focus' ? 1 : 0,
      changeCount: eventType === 'change' ? 1 : 0,
    },
  }, timestamp);
}

/**
 * Generate a scroll event
 */
function generateScroll(
  siteId: string,
  sessionId: string,
  depthPercent: number,
  timestamp: number
): TrackingEvent {
  const scrollHeight = 2400;
  const scrollTop = (scrollHeight * depthPercent) / 100;
  return createEvent(siteId, sessionId, 'scroll', {
    depth: depthPercent,
    scrollTop,
    scrollHeight,
    scrollDepth: depthPercent,
    timeAtDepth: Math.floor(Math.random() * 5000),
  }, timestamp);
}

/**
 * Generate a time event
 */
function generateTimeEvent(
  siteId: string,
  sessionId: string,
  duration: number,
  timestamp: number
): TrackingEvent {
  return createEvent(siteId, sessionId, 'time', {
    duration,
    timeOnPage: duration,
  }, timestamp);
}

/**
 * Generate events for a conversion scenario (user completes purchase)
 */
function generateConversionSession(config: SessionConfig): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const sessionId = config.sessionId || generateSessionId();
  let timestamp = config.startTime?.getTime() || Date.now();

  // Entry page
  const entryPage = PAGES.entry[Math.floor(Math.random() * PAGES.entry.length)];
  events.push(generatePageview(config.siteId, sessionId, entryPage, null, timestamp));

  // Browse products
  timestamp += 15000;
  const product = PAGES.product[Math.floor(Math.random() * PAGES.product.length)];
  events.push(generatePageview(config.siteId, sessionId, product, entryPage, timestamp));

  timestamp += 5000;
  events.push(generateScroll(config.siteId, sessionId, 50, timestamp));

  timestamp += 10000;
  events.push(generateClick(config.siteId, sessionId, '.add-to-cart', 'Add to Cart', timestamp));

  // View cart
  timestamp += 3000;
  events.push(generatePageview(config.siteId, sessionId, '/cart', product, timestamp));

  // Proceed to checkout
  timestamp += 8000;
  events.push(generateClick(config.siteId, sessionId, '.checkout-button', 'Proceed to Checkout', timestamp));

  // Checkout flow
  timestamp += 5000;
  events.push(generatePageview(config.siteId, sessionId, '/checkout', '/cart', timestamp));

  timestamp += 3000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'email', 'focus', timestamp));

  timestamp += 2000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'email', 'change', timestamp));

  timestamp += 5000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'name', 'focus', timestamp));

  timestamp += 2000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'name', 'change', timestamp));

  // Complete purchase
  timestamp += 10000;
  events.push(generateClick(config.siteId, sessionId, '.complete-order', 'Complete Order', timestamp));

  timestamp += 2000;
  events.push(generatePageview(config.siteId, sessionId, '/order/confirmation', '/checkout', timestamp));

  // Time on confirmation page
  timestamp += 5000;
  events.push(generateTimeEvent(config.siteId, sessionId, 5000, timestamp));

  return events;
}

/**
 * Generate events for an abandonment scenario (user leaves at checkout)
 */
function generateAbandonmentSession(config: SessionConfig): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const sessionId = config.sessionId || generateSessionId();
  let timestamp = config.startTime?.getTime() || Date.now();

  // Entry page
  const entryPage = PAGES.entry[Math.floor(Math.random() * PAGES.entry.length)];
  events.push(generatePageview(config.siteId, sessionId, entryPage, null, timestamp));

  // Browse products
  timestamp += 20000;
  const product = PAGES.product[Math.floor(Math.random() * PAGES.product.length)];
  events.push(generatePageview(config.siteId, sessionId, product, entryPage, timestamp));

  timestamp += 8000;
  events.push(generateScroll(config.siteId, sessionId, 75, timestamp));

  timestamp += 12000;
  events.push(generateClick(config.siteId, sessionId, '.add-to-cart', 'Add to Cart', timestamp));

  // View cart
  timestamp += 4000;
  events.push(generatePageview(config.siteId, sessionId, '/cart', product, timestamp));

  // Start checkout but abandon
  timestamp += 15000;
  events.push(generateClick(config.siteId, sessionId, '.checkout-button', 'Proceed to Checkout', timestamp));

  timestamp += 6000;
  events.push(generatePageview(config.siteId, sessionId, '/checkout', '/cart', timestamp));

  // Show hesitation - multiple form interactions
  timestamp += 3000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'email', 'focus', timestamp));

  timestamp += 5000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'email', 'blur', timestamp));

  timestamp += 2000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'email', 'focus', timestamp));

  timestamp += 3000;
  events.push(generateFormEvent(config.siteId, sessionId, 'checkout-form', 'email', 'change', timestamp));

  // Leave without completing (abandonment)
  timestamp += 10000;
  events.push(generateTimeEvent(config.siteId, sessionId, 10000, timestamp));

  return events;
}

/**
 * Generate events for a bounce scenario (single page visit)
 */
function generateBounceSession(config: SessionConfig): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const sessionId = config.sessionId || generateSessionId();
  let timestamp = config.startTime?.getTime() || Date.now();

  // Entry and immediate exit
  const entryPage = PAGES.entry[Math.floor(Math.random() * PAGES.entry.length)];
  events.push(generatePageview(config.siteId, sessionId, entryPage, null, timestamp));

  timestamp += 3000;
  events.push(generateTimeEvent(config.siteId, sessionId, 3000, timestamp));

  return events;
}

/**
 * Generate events for an exploration scenario (browsing without purchase)
 */
function generateExplorationSession(config: SessionConfig): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const sessionId = config.sessionId || generateSessionId();
  let timestamp = config.startTime?.getTime() || Date.now();

  // Entry page
  const entryPage = PAGES.entry[Math.floor(Math.random() * PAGES.entry.length)];
  events.push(generatePageview(config.siteId, sessionId, entryPage, null, timestamp));

  // Browse multiple products
  const productsToView = Math.floor(Math.random() * 3) + 2; // 2-4 products
  let previousPage = entryPage;

  for (let i = 0; i < productsToView; i++) {
    timestamp += Math.floor(Math.random() * 20000) + 10000; // 10-30s per page
    const product = PAGES.product[Math.floor(Math.random() * PAGES.product.length)];
    events.push(generatePageview(config.siteId, sessionId, product, previousPage, timestamp));

    timestamp += 5000;
    events.push(generateScroll(config.siteId, sessionId, Math.floor(Math.random() * 50) + 30, timestamp));

    previousPage = product;
  }

  // Maybe view info pages
  if (Math.random() > 0.5) {
    timestamp += 8000;
    const infoPage = PAGES.info[Math.floor(Math.random() * PAGES.info.length)];
    events.push(generatePageview(config.siteId, sessionId, infoPage, previousPage, timestamp));

    timestamp += 15000;
    events.push(generateTimeEvent(config.siteId, sessionId, 15000, timestamp));
  }

  return events;
}

/**
 * Generate events for a long session (extensive browsing)
 */
function generateLongSession(config: SessionConfig): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const sessionId = config.sessionId || generateSessionId();
  let timestamp = config.startTime?.getTime() || Date.now();

  // Entry page
  const entryPage = PAGES.entry[Math.floor(Math.random() * PAGES.entry.length)];
  events.push(generatePageview(config.siteId, sessionId, entryPage, null, timestamp));

  // Extended browsing
  const pagesCount = Math.floor(Math.random() * 10) + 10; // 10-19 pages
  let previousPage = entryPage;

  for (let i = 0; i < pagesCount; i++) {
    timestamp += Math.floor(Math.random() * 30000) + 20000; // 20-50s per page

    const pageType = Math.random();
    let nextPage: string;

    if (pageType < 0.6) {
      nextPage = PAGES.product[Math.floor(Math.random() * PAGES.product.length)];
    } else if (pageType < 0.8) {
      nextPage = PAGES.info[Math.floor(Math.random() * PAGES.info.length)];
    } else {
      nextPage = PAGES.entry[Math.floor(Math.random() * PAGES.entry.length)];
    }

    events.push(generatePageview(config.siteId, sessionId, nextPage, previousPage, timestamp));

    // More scrolling in long sessions
    if (Math.random() > 0.3) {
      timestamp += 3000;
      events.push(generateScroll(config.siteId, sessionId, Math.floor(Math.random() * 80) + 20, timestamp));
    }

    // Occasional clicks
    if (Math.random() > 0.6) {
      timestamp += 2000;
      events.push(generateClick(config.siteId, sessionId, '.product-link', 'View Details', timestamp));
    }

    previousPage = nextPage;
  }

  timestamp += 5000;
  events.push(generateTimeEvent(config.siteId, sessionId, 5000, timestamp));

  return events;
}

/**
 * Generate a session based on scenario type
 */
export function generateSession(config: SessionConfig): TrackingEvent[] {
  switch (config.scenario) {
    case 'conversion':
      return generateConversionSession(config);
    case 'abandonment':
      return generateAbandonmentSession(config);
    case 'bounce':
      return generateBounceSession(config);
    case 'exploration':
      return generateExplorationSession(config);
    case 'long-session':
      return generateLongSession(config);
    default:
      throw new Error(`Unknown scenario: ${config.scenario}`);
  }
}

/**
 * Generate multiple sessions with mixed scenarios for a site
 */
export function generateMultipleSessions(
  siteId: string,
  count: number,
  scenarioMix?: {
    conversion?: number;
    abandonment?: number;
    bounce?: number;
    exploration?: number;
    longSession?: number;
  }
): TrackingEvent[][] {
  // Default scenario distribution
  const mix = scenarioMix || {
    conversion: 0.15,      // 15% convert
    abandonment: 0.25,     // 25% abandon at checkout
    bounce: 0.20,          // 20% bounce
    exploration: 0.30,     // 30% browse
    longSession: 0.10,     // 10% long sessions
  };

  const sessions: TrackingEvent[][] = [];
  let conversionCount = Math.floor(count * (mix.conversion || 0));
  let abandonmentCount = Math.floor(count * (mix.abandonment || 0));
  let bounceCount = Math.floor(count * (mix.bounce || 0));
  let explorationCount = Math.floor(count * (mix.exploration || 0));
  let longSessionCount = count - conversionCount - abandonmentCount - bounceCount - explorationCount;

  // Generate sessions
  const scenarios: SessionConfig['scenario'][] = [
    ...Array(conversionCount).fill('conversion'),
    ...Array(abandonmentCount).fill('abandonment'),
    ...Array(bounceCount).fill('bounce'),
    ...Array(explorationCount).fill('exploration'),
    ...Array(longSessionCount).fill('long-session'),
  ];

  // Shuffle scenarios
  scenarios.sort(() => Math.random() - 0.5);

  // Generate sessions with staggered start times
  const baseTime = Date.now() - (24 * 60 * 60 * 1000); // Start 24 hours ago
  scenarios.forEach((scenario, i) => {
    const startTime = new Date(baseTime + (i * (24 * 60 * 60 * 1000) / count));
    sessions.push(generateSession({
      siteId,
      scenario,
      startTime,
    }));
  });

  return sessions;
}

/**
 * Generate test data according to volume configuration
 */
export function generateVolumeTestData(
  siteId: string,
  volumeConfig: VolumeConfig['name']
): TrackingEvent[] {
  const config = VOLUME_CONFIGS[volumeConfig];
  const sessions = generateMultipleSessions(siteId, config.sessionCount);

  // Flatten all events
  return sessions.flat();
}

/**
 * Export generated sessions to JSON
 */
export function exportSessionsToJSON(sessions: TrackingEvent[][]): string {
  return JSON.stringify(sessions, null, 2);
}

/**
 * Export all events to JSON
 */
export function exportEventsToJSON(events: TrackingEvent[]): string {
  return JSON.stringify(events, null, 2);
}
