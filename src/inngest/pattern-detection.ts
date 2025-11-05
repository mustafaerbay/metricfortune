/**
 * Pattern Detection Background Job
 *
 * Scheduled Inngest function that runs daily to detect behavioral patterns
 * and friction points from aggregated session data.
 *
 * Features:
 * - Runs on cron schedule: daily at 2 AM UTC (0 2 * * *)
 * - Analyzes last 7 days of session data (configurable)
 * - Processes all active sites in parallel batches
 * - Automatic retries on failure (up to 3 times with exponential backoff)
 * - Structured logging for monitoring
 * - Tracks patterns detected per site
 *
 * @module inngest/pattern-detection
 */

import { inngest } from '@/lib/inngest';
import {
  detectPatterns,
  storePatterns,
} from '@/services/analytics/pattern-detector';
import { prisma } from '@/lib/prisma';
import type { PatternDetectionResult, DateRange } from '@/types/pattern';

/**
 * Analysis window configuration (days)
 * Default: analyze last 7 days of session data
 */
const ANALYSIS_WINDOW_DAYS = 7;

/**
 * Batch size for parallel site processing
 * Larger batch sizes improve throughput but increase memory usage
 */
const SITE_BATCH_SIZE = 10;

/**
 * Pattern Detection Background Job
 *
 * Runs daily at 2 AM UTC to detect behavioral patterns across all active sites.
 * Analyzes session data from the last 7 days to identify friction points.
 */
export const patternDetectionJob = inngest.createFunction(
  {
    id: 'pattern-detection',
    name: 'Pattern Detection Job',
    // Automatic retries (3 attempts with exponential backoff)
    retries: 3,
  },
  [
    { event: 'pattern/detect' },
    { cron: '0 2 * * *' }, // Run daily at 2 AM UTC
  ],
  async ({ event, step }) => {
    const jobStartTime = Date.now();

    console.log('[PatternDetection] Job started');

    try {
      // Step 1: Define analysis window (last 7 days)
      const analysisWindow = await step.run('define-analysis-window', async () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - ANALYSIS_WINDOW_DAYS);

        const window: DateRange = { startDate, endDate };

        console.log(
          `[PatternDetection] Analysis window: ${startDate.toISOString()} to ${endDate.toISOString()} (${ANALYSIS_WINDOW_DAYS} days)`
        );

        return window;
      });

      // Step 2: Fetch all active sites
      const sites = await step.run('fetch-active-sites', async () => {
        const businesses = await prisma.business.findMany({
          select: {
            siteId: true,
            name: true,
          },
        });

        console.log(`[PatternDetection] Found ${businesses.length} active sites`);

        return businesses;
      });

      // Edge case: no sites to analyze
      if (sites.length === 0) {
        console.log('[PatternDetection] No sites to analyze');
        return {
          status: 'success',
          sitesAnalyzed: 0,
          patternsDetected: 0,
          patternsStored: 0,
          executionTimeMs: Date.now() - jobStartTime,
        };
      }

      // Step 3: Process sites in batches
      const siteResults: PatternDetectionResult[] = [];

      for (let i = 0; i < sites.length; i += SITE_BATCH_SIZE) {
        const batch = sites.slice(i, i + SITE_BATCH_SIZE);
        const batchNumber = Math.floor(i / SITE_BATCH_SIZE) + 1;

        console.log(
          `[PatternDetection] Processing batch ${batchNumber}: ${batch.length} sites`
        );

        const batchResults = await step.run(
          `process-sites-batch-${batchNumber}`,
          async () => {
            const results: PatternDetectionResult[] = [];

            // Process sites in batch sequentially to manage memory
            for (const site of batch) {
              const siteStartTime = Date.now();

              try {
                console.log(
                  `[PatternDetection] Analyzing site: ${site.siteId} (${site.name})`
                );

                // Detect patterns for this site
                const patterns = await detectPatterns(site.siteId, {
                  startDate: new Date(analysisWindow.startDate),
                  endDate: new Date(analysisWindow.endDate),
                });

                // Store detected patterns
                const storeResult = await storePatterns(patterns);

                const siteExecutionTime = Date.now() - siteStartTime;

                const result: PatternDetectionResult = {
                  siteId: site.siteId,
                  patternsDetected: patterns.length,
                  patternsStored: storeResult.created,
                  sessionsAnalyzed: patterns.reduce(
                    (sum, p) => sum + p.sessionCount,
                    0
                  ),
                  executionTimeMs: siteExecutionTime,
                  errors: storeResult.errors,
                  timestamp: new Date(),
                };

                results.push(result);

                console.log(
                  `[PatternDetection] Site ${site.siteId} complete: ${patterns.length} patterns detected, ${storeResult.created} stored in ${(siteExecutionTime / 1000).toFixed(2)}s`
                );
              } catch (error) {
                console.error(
                  `[PatternDetection] Error analyzing site ${site.siteId}:`,
                  error
                );

                // Log error but continue processing other sites
                results.push({
                  siteId: site.siteId,
                  patternsDetected: 0,
                  patternsStored: 0,
                  sessionsAnalyzed: 0,
                  executionTimeMs: Date.now() - siteStartTime,
                  errors: [
                    error instanceof Error ? error.message : String(error),
                  ],
                  timestamp: new Date(),
                });
              }
            }

            return results;
          }
        );

        // Inngest serializes Dates to strings, convert back to Date objects
        const convertedResults = batchResults.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        }));

        siteResults.push(...convertedResults);
      }

      // Calculate execution time
      const executionTimeMs = Date.now() - jobStartTime;
      const executionTimeSec = (executionTimeMs / 1000).toFixed(2);

      // Aggregate results
      const summary = {
        status: 'success' as const,
        sitesAnalyzed: siteResults.length,
        patternsDetected: siteResults.reduce(
          (sum, r) => sum + r.patternsDetected,
          0
        ),
        patternsStored: siteResults.reduce((sum, r) => sum + r.patternsStored, 0),
        sitesWithErrors: siteResults.filter((r) => r.errors.length > 0).length,
        executionTimeMs,
        executionTimeSec,
        analysisWindow: {
          startDate: analysisWindow.startDate,
          endDate: analysisWindow.endDate,
        },
      };

      console.log('[PatternDetection] Job completed successfully', summary);

      return summary;
    } catch (error) {
      const executionTimeMs = Date.now() - jobStartTime;

      console.error('[PatternDetection] Job failed', {
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs,
      });

      // Inngest will automatically retry on failure
      throw error;
    }
  }
);

/**
 * Manual trigger for pattern detection
 *
 * Can be called from API routes or admin panels to trigger
 * pattern detection on-demand outside the scheduled cron.
 *
 * @example
 * ```ts
 * import { inngest } from '@/lib/inngest';
 * await inngest.send({ name: 'pattern/detect', data: {} });
 * ```
 */
export async function triggerPatternDetection() {
  return await inngest.send({
    name: 'pattern/detect',
    data: {},
  });
}
