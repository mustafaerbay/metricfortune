import { z } from 'zod';

/**
 * Event types supported by the tracking system
 */
export type EventType = 'pageview' | 'click' | 'form' | 'scroll' | 'time';

/**
 * Position data for click events
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Event data structure - extensible with type-specific fields
 */
export interface EventData {
  // Pageview fields
  url?: string;
  referrer?: string;
  title?: string;
  path?: string;

  // Click fields
  selector?: string;
  position?: Position;

  // Form fields
  formId?: string;
  fieldInteractions?: Record<string, unknown>;

  // Scroll fields
  scrollDepth?: number;
  timeAtDepth?: number;

  // Time on page fields
  timeOnPage?: number;

  // Extensible - allow additional fields
  [key: string]: unknown;
}

/**
 * Tracking event structure
 */
export interface TrackingEvent {
  siteId: string;
  sessionId: string;
  event: {
    type: EventType;
    timestamp: number;
    data: EventData;
  };
}

/**
 * Batch tracking events structure (sent by tracking script)
 */
export interface TrackingEventBatch {
  events: TrackingEvent[];
}

/**
 * Zod schema for position validation
 */
const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Zod schema for event data validation
 * Allows all fields to be optional and extensible
 */
const eventDataSchema = z.object({
  // Pageview
  url: z.string().optional(),
  referrer: z.string().optional(),
  title: z.string().optional(),
  path: z.string().optional(),

  // Click
  selector: z.string().optional(),
  position: positionSchema.optional(),

  // Form
  formId: z.string().optional(),
  fieldInteractions: z.record(z.string(), z.unknown()).optional(),

  // Scroll
  scrollDepth: z.number().optional(),
  timeAtDepth: z.number().optional(),

  // Time
  timeOnPage: z.number().optional(),
}).passthrough(); // Allow additional fields

/**
 * Zod schema for tracking event validation
 */
export const trackingEventSchema = z.object({
  siteId: z.string().min(1, { message: 'siteId is required' }),
  sessionId: z.string().min(1, { message: 'sessionId is required' }),
  event: z.object({
    type: z.enum(['pageview', 'click', 'form', 'scroll', 'time']),
    timestamp: z.number().positive({ message: 'timestamp must be positive' }),
    data: eventDataSchema,
  }),
});

/**
 * Zod schema for batch tracking events
 */
export const trackingEventBatchSchema = z.object({
  events: z.array(trackingEventSchema).min(1, { message: 'At least one event is required' }),
});

/**
 * API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Rate limit info for responses
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
