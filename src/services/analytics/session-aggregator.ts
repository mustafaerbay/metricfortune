/**
 * Session Aggregator Service
 *
 * Pure business logic module for aggregating raw tracking events into
 * user sessions with journey sequences and metadata.
 *
 * This service:
 * - Groups TrackingEvent records by sessionId
 * - Extracts journey sequences (ordered pageview events)
 * - Calculates session metadata (duration, page count, bounce, conversion)
 * - Stores processed sessions in PostgreSQL
 * - Prepares journey funnel data for visualization
 *
 * Performance target: Process 10K sessions in <5 minutes
 *
 * @module services/analytics/session-aggregator
 */

import { prisma } from '@/lib/prisma';
import type {
  SessionData,
  JourneySequence,
  SessionMetadata,
  JourneyFunnel,
  JourneyFunnelData,
  AggregationResult,
  FunnelStage,
} from '@/types/session';
import { FUNNEL_STAGES } from '@/types/session';

/**
 * Aggregate raw tracking events into sessions
 *
 * Processes TrackingEvent records within the specified time range,
 * groups them by sessionId, and extracts session data including
 * journey sequences and metadata.
 *
 * @param startTime - Start of time range to process
 * @param endTime - End of time range to process
 * @returns Array of processed session data ready for storage
 *
 * @example
 * const sessions = await aggregateSessions(
 *   new Date('2025-11-01'),
 *   new Date('2025-11-02')
 * );
 */
export async function aggregateSessions(
  startTime: Date,
  endTime: Date
): Promise<SessionData[]> {
  const startTimeMs = performance.now();
  console.log(
    `[SessionAggregator] Starting aggregation for ${startTime.toISOString()} to ${endTime.toISOString()}`
  );

  try {
    // Query TrackingEvent from TimescaleDB using time-range filter
    // This leverages hypertable partitioning for optimal performance
    const events = await prisma.trackingEvent.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: [
        { sessionId: 'asc' },
        { timestamp: 'asc' },
      ],
    });

    console.log(
      `[SessionAggregator] Fetched ${events.length} events in ${(performance.now() - startTimeMs).toFixed(2)}ms`
    );

    // Group events by sessionId
    const sessionGroups = groupEventsBySession(events);
    console.log(
      `[SessionAggregator] Grouped into ${sessionGroups.size} sessions`
    );

    // Process sessions in batches for memory efficiency
    const BATCH_SIZE = 1000;
    const sessionIds = Array.from(sessionGroups.keys());
    const allSessions: SessionData[] = [];

    for (let i = 0; i < sessionIds.length; i += BATCH_SIZE) {
      const batchIds = sessionIds.slice(i, i + BATCH_SIZE);
      const batchSessions = batchIds
        .map((sessionId) => {
          const events = sessionGroups.get(sessionId)!;
          return processSession(events);
        })
        .filter((session): session is SessionData => session !== null);

      allSessions.push(...batchSessions);

      console.log(
        `[SessionAggregator] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchSessions.length} sessions`
      );
    }

    const totalTimeMs = performance.now() - startTimeMs;
    console.log(
      `[SessionAggregator] Completed: ${allSessions.length} sessions in ${(totalTimeMs / 1000).toFixed(2)}s`
    );

    return allSessions;
  } catch (error) {
    console.error('[SessionAggregator] Error during aggregation:', error);
    throw error;
  }
}

/**
 * Group tracking events by sessionId
 *
 * @param events - Array of tracking events
 * @returns Map of sessionId to array of events
 */
function groupEventsBySession(
  events: Array<{
    id: string;
    siteId: string;
    sessionId: string;
    eventType: string;
    timestamp: Date;
    data: unknown;
    createdAt: Date;
  }>
): Map<string, typeof events> {
  const groups = new Map<string, typeof events>();

  for (const event of events) {
    if (!groups.has(event.sessionId)) {
      groups.set(event.sessionId, []);
    }
    groups.get(event.sessionId)!.push(event);
  }

  return groups;
}

/**
 * Process a single session from its events
 *
 * Extracts journey sequence, calculates metadata, and returns SessionData
 * Returns null if session is invalid or has no usable data
 *
 * @param events - All events for a single session (must be ordered by timestamp)
 * @returns Processed session data or null if invalid
 */
function processSession(
  events: Array<{
    id: string;
    siteId: string;
    sessionId: string;
    eventType: string;
    timestamp: Date;
    data: unknown;
    createdAt: Date;
  }>
): SessionData | null {
  // Edge case: empty session
  if (events.length === 0) {
    return null;
  }

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  // Extract journey sequence (pageview events only)
  const journey = extractJourneySequence(events);

  // Edge case: session with no pageviews
  if (journey.pages.length === 0) {
    // Still create session but with empty journey
    return {
      siteId: firstEvent.siteId,
      sessionId: firstEvent.sessionId,
      entryPage: '',
      exitPage: null,
      duration: calculateDuration(firstEvent.timestamp, lastEvent.timestamp),
      pageCount: 0,
      bounced: false,
      converted: hasConversionEvent(events),
      journeyPath: [],
      createdAt: firstEvent.createdAt,
    };
  }

  // Calculate session metadata
  const metadata = calculateSessionMetadata(events, journey);

  return {
    siteId: firstEvent.siteId,
    sessionId: firstEvent.sessionId,
    entryPage: journey.entryPage,
    exitPage: journey.exitPage,
    duration: metadata.duration,
    pageCount: metadata.pageCount,
    bounced: metadata.bounced,
    converted: metadata.converted,
    journeyPath: journey.pages,
    createdAt: firstEvent.createdAt,
  };
}

/**
 * Extract journey sequence from tracking events
 *
 * Filters to pageview events only and builds ordered navigation path
 *
 * @param events - All events for a session
 * @returns Journey sequence with entry, exit, and full path
 */
function extractJourneySequence(
  events: Array<{
    eventType: string;
    data: unknown;
    timestamp: Date;
  }>
): JourneySequence {
  // Filter to pageview events only
  const pageviews = events.filter((event) => event.eventType === 'pageview');

  // Extract page URLs from event data
  const pages = pageviews
    .map((event) => {
      // Handle different data structures
      const data = event.data as Record<string, unknown>;
      return (data?.url as string) || (data?.page as string) || '';
    })
    .filter((url) => url !== '');

  const entryPage = pages.length > 0 ? pages[0] : '';
  const exitPage = pages.length > 0 ? pages[pages.length - 1] : '';

  return {
    sessionId: '', // Will be set by processSession
    pages,
    entryPage,
    exitPage,
    timestamp: events[0].timestamp,
  };
}

/**
 * Calculate session metadata from events and journey
 *
 * @param events - All events for a session
 * @param journey - Extracted journey sequence
 * @returns Session metadata (duration, page count, bounce, conversion)
 */
function calculateSessionMetadata(
  events: Array<{
    eventType: string;
    timestamp: Date;
  }>,
  journey: JourneySequence
): SessionMetadata {
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  // Calculate duration (null if single event)
  const duration = calculateDuration(firstEvent.timestamp, lastEvent.timestamp);

  // Page count from journey
  const pageCount = journey.pages.length;

  // Bounced if single pageview
  const bounced = pageCount === 1;

  // Converted if any conversion event present
  const converted = hasConversionEvent(events);

  return {
    duration,
    pageCount,
    bounced,
    converted,
    eventCount: events.length,
  };
}

/**
 * Calculate duration between two timestamps
 *
 * @param start - Start timestamp
 * @param end - End timestamp
 * @returns Duration in seconds, or null if timestamps are equal
 */
function calculateDuration(start: Date, end: Date): number | null {
  const durationMs = end.getTime() - start.getTime();

  // Return null for single-timestamp events
  if (durationMs === 0) {
    return null;
  }

  return Math.round(durationMs / 1000); // Convert to seconds
}

/**
 * Check if session contains a conversion event
 *
 * @param events - All events for a session
 * @returns True if conversion event present
 */
function hasConversionEvent(
  events: Array<{
    eventType: string;
  }>
): boolean {
  return events.some((event) => event.eventType === 'conversion');
}

/**
 * Store processed sessions in database
 *
 * Uses Prisma createMany for bulk insert performance
 * Handles duplicate sessions via upsert logic
 *
 * @param sessions - Array of session data to store
 * @returns Array of created session records
 *
 * @example
 * const sessions = await aggregateSessions(startTime, endTime);
 * await createSessions(sessions);
 */
export async function createSessions(
  sessions: SessionData[]
): Promise<{ created: number; errors: string[] }> {
  console.log(`[SessionAggregator] Storing ${sessions.length} sessions`);

  const errors: string[] = [];
  let created = 0;

  try {
    // Use createMany for bulk insert (best performance)
    // Note: createMany doesn't support skipDuplicates in all databases
    // So we'll use a transaction with individual creates if needed
    const result = await prisma.session.createMany({
      data: sessions.map((session) => ({
        siteId: session.siteId,
        sessionId: session.sessionId,
        entryPage: session.entryPage,
        exitPage: session.exitPage,
        duration: session.duration,
        pageCount: session.pageCount,
        bounced: session.bounced,
        converted: session.converted,
        journeyPath: session.journeyPath,
        createdAt: session.createdAt,
      })),
      skipDuplicates: true, // Skip if sessionId already exists
    });

    created = result.count;
    console.log(`[SessionAggregator] Successfully stored ${created} sessions`);
  } catch (error) {
    console.error('[SessionAggregator] Error storing sessions:', error);
    errors.push(
      `Bulk insert failed: ${error instanceof Error ? error.message : String(error)}`
    );

    // Fallback: Try individual upserts for better error handling
    console.log(
      '[SessionAggregator] Attempting individual upserts as fallback'
    );
    for (const session of sessions) {
      try {
        await prisma.session.upsert({
          where: { sessionId: session.sessionId },
          update: {
            entryPage: session.entryPage,
            exitPage: session.exitPage,
            duration: session.duration,
            pageCount: session.pageCount,
            bounced: session.bounced,
            converted: session.converted,
            journeyPath: session.journeyPath,
          },
          create: {
            siteId: session.siteId,
            sessionId: session.sessionId,
            entryPage: session.entryPage,
            exitPage: session.exitPage,
            duration: session.duration,
            pageCount: session.pageCount,
            bounced: session.bounced,
            converted: session.converted,
            journeyPath: session.journeyPath,
            createdAt: session.createdAt,
          },
        });
        created++;
      } catch (upsertError) {
        errors.push(
          `Failed to upsert session ${session.sessionId}: ${upsertError instanceof Error ? upsertError.message : String(upsertError)}`
        );
      }
    }
  }

  return { created, errors };
}

/**
 * Calculate journey funnels for a site
 *
 * Analyzes session data to identify funnel stages and calculate
 * drop-off rates for journey visualization.
 *
 * Common stages: Entry → Browse → Product → Cart → Checkout → Confirmation
 *
 * @param siteId - Site to calculate funnels for
 * @returns Journey funnel data with stages and drop-off rates
 *
 * @example
 * const funnelData = await calculateJourneyFunnels('site_123');
 * console.log(funnelData.funnels); // [{ stage: 'Entry', visitors: 1000, dropOffRate: 15 }, ...]
 */
export async function calculateJourneyFunnels(
  siteId: string
): Promise<JourneyFunnelData> {
  console.log(`[SessionAggregator] Calculating journey funnels for ${siteId}`);

  // Fetch all sessions for the site
  const sessions = await prisma.session.findMany({
    where: { siteId },
    select: {
      journeyPath: true,
      converted: true,
    },
  });

  if (sessions.length === 0) {
    return {
      siteId,
      funnels: [],
      totalSessions: 0,
      conversionRate: 0,
      calculatedAt: new Date(),
    };
  }

  // Identify funnel stages by analyzing journey paths
  const stageCounts = identifyFunnelStages(sessions);

  // Calculate drop-off rates
  const funnels = calculateDropOffRates(stageCounts);

  // Calculate overall conversion rate
  const conversions = sessions.filter((s) => s.converted).length;
  const conversionRate = (conversions / sessions.length) * 100;

  return {
    siteId,
    funnels,
    totalSessions: sessions.length,
    conversionRate,
    calculatedAt: new Date(),
  };
}

/**
 * Identify funnel stages from session journey paths
 *
 * Analyzes URLs to categorize into stages (Entry, Browse, Product, Cart, etc.)
 *
 * @param sessions - Sessions with journey paths
 * @returns Map of stage to visitor count
 */
function identifyFunnelStages(
  sessions: Array<{ journeyPath: string[] }>
): Map<FunnelStage, number> {
  const stageCounts = new Map<FunnelStage, number>();

  for (const session of sessions) {
    const stages = new Set<FunnelStage>();

    // All sessions start at Entry
    stages.add(FUNNEL_STAGES.ENTRY);

    // Analyze journey path to identify stages
    for (const url of session.journeyPath) {
      const urlLower = url.toLowerCase();

      if (
        urlLower.includes('/product') ||
        urlLower.includes('/item') ||
        urlLower.match(/\/p\/\w+/)
      ) {
        stages.add(FUNNEL_STAGES.PRODUCT);
      } else if (
        urlLower.includes('/cart') ||
        urlLower.includes('/basket')
      ) {
        stages.add(FUNNEL_STAGES.CART);
      } else if (
        urlLower.includes('/checkout') ||
        urlLower.includes('/payment')
      ) {
        stages.add(FUNNEL_STAGES.CHECKOUT);
      } else if (
        urlLower.includes('/confirmation') ||
        urlLower.includes('/thank') ||
        urlLower.includes('/success')
      ) {
        stages.add(FUNNEL_STAGES.CONFIRMATION);
      } else if (
        urlLower.includes('/category') ||
        urlLower.includes('/shop') ||
        urlLower.includes('/browse')
      ) {
        stages.add(FUNNEL_STAGES.BROWSE);
      }
    }

    // Increment count for each stage this session reached
    for (const stage of stages) {
      stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
    }
  }

  return stageCounts;
}

/**
 * Calculate drop-off rates between funnel stages
 *
 * @param stageCounts - Map of stage to visitor count
 * @returns Array of funnel stages with drop-off rates
 */
function calculateDropOffRates(
  stageCounts: Map<FunnelStage, number>
): JourneyFunnel[] {
  // Define funnel order
  const stageOrder: FunnelStage[] = [
    FUNNEL_STAGES.ENTRY,
    FUNNEL_STAGES.BROWSE,
    FUNNEL_STAGES.PRODUCT,
    FUNNEL_STAGES.CART,
    FUNNEL_STAGES.CHECKOUT,
    FUNNEL_STAGES.CONFIRMATION,
  ];

  const funnels: JourneyFunnel[] = [];

  for (let i = 0; i < stageOrder.length; i++) {
    const stage = stageOrder[i];
    const visitors = stageCounts.get(stage) || 0;

    // Skip stages with no visitors
    if (visitors === 0 && i > 0) {
      continue;
    }

    let dropOffRate = 0;
    let dropOffCount = 0;

    // Calculate drop-off to next stage
    if (i < stageOrder.length - 1) {
      const nextStage = stageOrder[i + 1];
      const nextVisitors = stageCounts.get(nextStage) || 0;
      dropOffCount = visitors - nextVisitors;
      dropOffRate = visitors > 0 ? (dropOffCount / visitors) * 100 : 0;
    }

    funnels.push({
      stage,
      visitors,
      dropOffRate: Math.round(dropOffRate * 100) / 100, // Round to 2 decimals
      dropOffCount,
    });
  }

  return funnels;
}
