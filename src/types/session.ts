/**
 * Session aggregation and journey mapping type definitions
 *
 * This module defines TypeScript types and interfaces for the session
 * aggregation service, journey visualization, and related functionality.
 */

/**
 * Input data structure for session aggregator
 * Represents a processed session ready for storage
 */
export interface SessionData {
  siteId: string;
  sessionId: string;
  entryPage: string;
  exitPage: string | null;
  duration: number | null; // seconds, null if single event
  pageCount: number;
  bounced: boolean;
  converted: boolean;
  journeyPath: string[]; // Ordered array of page URLs
  createdAt: Date;
}

/**
 * Journey sequence extracted from tracking events
 * Represents a user's navigation path through the site
 */
export interface JourneySequence {
  sessionId: string;
  pages: string[]; // Ordered array of page URLs
  entryPage: string;
  exitPage: string;
  timestamp: Date;
}

/**
 * Session metadata calculations
 * Aggregated metrics for a session
 */
export interface SessionMetadata {
  duration: number | null; // seconds
  pageCount: number;
  bounced: boolean; // true if single pageview
  converted: boolean; // true if conversion event present
  eventCount: number; // total number of events in session
}

/**
 * Journey funnel stage with drop-off rates
 * Used for visualization of user journey funnels
 */
export interface JourneyFunnel {
  stage: string; // Stage name (e.g., 'Entry', 'Product', 'Cart', 'Checkout', 'Confirmation')
  visitors: number; // Number of visitors at this stage
  dropOffRate: number; // Percentage who left at this stage (0-100)
  dropOffCount?: number; // Absolute number who dropped off
}

/**
 * Complete funnel data for a site
 * Contains all stages and overall metrics
 */
export interface JourneyFunnelData {
  siteId: string;
  funnels: JourneyFunnel[];
  totalSessions: number;
  conversionRate: number; // Percentage who completed full funnel (0-100)
  calculatedAt: Date;
}

/**
 * Date range for session queries
 * Optional parameters for filtering sessions
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Aggregation job result
 * Tracks the outcome of a session aggregation job
 */
export interface AggregationResult {
  sessionsProcessed: number;
  sessionsCreated: number;
  eventsProcessed: number;
  executionTimeMs: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
}

/**
 * Common funnel stage identifiers
 * Standard stages for e-commerce journey analysis
 */
export const FUNNEL_STAGES = {
  ENTRY: 'Entry',
  BROWSE: 'Browse',
  PRODUCT: 'Product',
  CART: 'Cart',
  CHECKOUT: 'Checkout',
  CONFIRMATION: 'Confirmation',
  EXIT: 'Exit',
} as const;

export type FunnelStage = typeof FUNNEL_STAGES[keyof typeof FUNNEL_STAGES];
