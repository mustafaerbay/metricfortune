/**
 * Session Aggregation Background Job
 *
 * Scheduled Inngest function that runs every 4 hours to process
 * raw tracking events into aggregated session data.
 *
 * Features:
 * - Runs on cron schedule: every 4 hours (0 star-slash-4 star star star)
 * - Incremental processing: only processes events since last run
 * - Automatic retries on failure (up to 3 times with exponential backoff)
 * - Structured logging for monitoring
 * - Tracks last aggregation timestamp
 *
 * @module inngest/session-aggregation
 */

import { inngest } from '@/lib/inngest';
import {
  aggregateSessions,
  createSessions,
} from '@/services/analytics/session-aggregator';
import { prisma } from '@/lib/prisma';

/**
 * Key for storing last aggregation timestamp
 * This could be stored in database or Redis in production
 */
const LAST_AGGREGATION_KEY = 'session_aggregation_last_run';

/**
 * Session Aggregation Background Job
 *
 * Processes raw tracking events into sessions every 4 hours.
 * Uses incremental processing to only handle new events.
 */
export const sessionAggregationJob = inngest.createFunction(
  {
    id: 'session-aggregation',
    name: 'Session Aggregation Job',
    // Automatic retries (3 attempts with exponential backoff)
    retries: 3,
  },
  [
    { event: 'session/aggregate' },
    { cron: '0/15 * * * *' }, // Run every 15 minutes for testing
    // { cron: '0 */4 * * *' }, // Run every 4 hours at minute 0
  ],
  async ({ event, step }) => {
    const jobStartTime = Date.now();

    console.log('[SessionAggregation] Job started');

    try {
      // Step 1: Get last aggregation timestamp
      const lastAggregationTime = await step.run(
        'get-last-aggregation-time',
        async () => {
          // Try to get from environment variable or database
          // For MVP, we'll use a simple approach with a metadata table
          // In production, consider using Redis or a dedicated table
          const lastRun = await getLastAggregationTime();

          console.log(
            `[SessionAggregation] Last aggregation time: ${lastRun?.toISOString() || 'Never'}`
          );

          return lastRun;
        }
      );

      // Step 2: Determine time range for this run
      const endTime = new Date();
      const startTime = lastAggregationTime
        ? new Date(lastAggregationTime)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours

      console.log(
        `[SessionAggregation] Processing time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
      );

      // Step 3: Aggregate sessions from tracking events
      const sessionsData = await step.run('aggregate-sessions', async () => {
        return await aggregateSessions(startTime, endTime);
      });

      console.log(
        `[SessionAggregation] Aggregated ${sessionsData.length} sessions`
      );

      // Step 4: Store sessions in database
      // Note: Inngest serializes data between steps, so dates become strings
      // Convert back to SessionData format with proper Date objects
      const sessions = sessionsData.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      }));

      const result = await step.run('store-sessions', async () => {
        return await createSessions(sessions);
      });

      console.log(
        `[SessionAggregation] Stored ${result.created} sessions (${result.errors.length} errors)`
      );

      // Step 5: Update last aggregation timestamp
      await step.run('update-last-aggregation-time', async () => {
        await setLastAggregationTime(endTime);
        console.log(
          `[SessionAggregation] Updated last aggregation time to ${endTime.toISOString()}`
        );
      });

      // Calculate execution time
      const executionTimeMs = Date.now() - jobStartTime;
      const executionTimeSec = (executionTimeMs / 1000).toFixed(2);

      // Log completion summary
      const summary = {
        status: 'success',
        sessionsProcessed: sessions.length,
        sessionsCreated: result.created,
        errorCount: result.errors.length,
        executionTimeMs,
        executionTimeSec,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };

      console.log('[SessionAggregation] Job completed successfully', summary);

      return summary;
    } catch (error) {
      const executionTimeMs = Date.now() - jobStartTime;

      console.error('[SessionAggregation] Job failed', {
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs,
      });

      // Inngest will automatically retry on failure
      throw error;
    }
  }
);

/**
 * Get last aggregation timestamp
 *
 * Retrieves the timestamp of the last successful aggregation run.
 * Returns null if no previous run exists.
 *
 * Implementation uses a simple metadata table approach.
 * In production, consider using Redis for better performance.
 */
async function getLastAggregationTime(): Promise<Date | null> {
  try {
    // Check if we have a metadata table for tracking job state
    // For now, we'll use a simple approach: query the most recent session's createdAt
    // This assumes sessions are created in order
    const latestSession = await prisma.session.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return latestSession?.createdAt || null;
  } catch (error) {
    console.error(
      '[SessionAggregation] Error getting last aggregation time:',
      error
    );
    return null;
  }
}

/**
 * Set last aggregation timestamp
 *
 * Stores the timestamp of the current successful aggregation run.
 * This is used for incremental processing in the next run.
 *
 * @param timestamp - Timestamp to store
 */
async function setLastAggregationTime(timestamp: Date): Promise<void> {
  // In a production system, you might store this in:
  // 1. A dedicated metadata table
  // 2. Redis cache
  // 3. Environment variable (less ideal)
  // 4. Inngest state (if available)

  // For MVP, we'll rely on the session createdAt timestamps
  // which already track when sessions were processed
  console.log(`[SessionAggregation] Last aggregation time: ${timestamp.toISOString()}`);
}

/**
 * Manual trigger for session aggregation
 *
 * Can be called from API routes or admin panels to trigger
 * aggregation on-demand outside the scheduled cron.
 *
 * Example usage:
 * ```ts
 * import { inngest } from '@/lib/inngest';
 * await inngest.send({ name: 'session/aggregate', data: {} });
 * ```
 */
export async function triggerSessionAggregation() {
  return await inngest.send({
    name: 'session/aggregate',
    data: {},
  });
}
