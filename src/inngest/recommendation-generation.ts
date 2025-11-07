/**
 * Recommendation Generation Background Job
 *
 * Triggered Inngest function that runs after pattern detection completes
 * to generate actionable recommendations for businesses.
 *
 * Features:
 * - Triggered job (runs after pattern-detection completes)
 * - Processes all businesses with recent patterns from last 7 days
 * - Generates 3-5 prioritized recommendations per business
 * - Includes peer success data when available
 * - Automatic retries on failure (up to 3 times with exponential backoff)
 * - Structured logging for monitoring
 * - Tracks recommendations generated per business
 *
 * @module inngest/recommendation-generation
 */

import { inngest } from '@/lib/inngest';
import {
  generateAndStoreRecommendations,
} from '@/services/analytics/recommendation-engine';
import { prisma } from '@/lib/prisma';
import type { RecommendationGenerationResult } from '@/types/recommendation';

/**
 * Analysis window configuration (days)
 * Default: analyze patterns from last 7 days
 */
const ANALYSIS_WINDOW_DAYS = 7;

/**
 * Maximum recommendations to generate per business
 */
const MAX_RECOMMENDATIONS_PER_BUSINESS = 5;

/**
 * Minimum pattern severity threshold
 * Only patterns with severity >= this value will generate recommendations
 */
const MIN_SEVERITY = 0.3;

/**
 * Recommendation Generation Background Job
 *
 * Triggered after pattern detection completes. Generates recommendations
 * for all businesses with detected patterns from the last 7 days.
 */
export const recommendationGenerationJob = inngest.createFunction(
  {
    id: 'recommendation-generation',
    name: 'Recommendation Generation Job',
    // Automatic retries (3 attempts with exponential backoff)
    retries: 3,
  },
  { event: 'recommendation/generate' },
  async ({ event, step }) => {
    const jobStartTime = Date.now();

    console.log('[RecommendationGeneration] Job started');
    console.log('[RecommendationGeneration] Event data:', event.data);

    try {
      // Step 1: Fetch all businesses with recent patterns
      const businesses = await step.run('fetch-businesses-with-patterns', async () => {
        // Calculate date cutoff for patterns
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ANALYSIS_WINDOW_DAYS);

        // Query businesses that have patterns detected in the last N days
        const recentPatterns = await prisma.pattern.findMany({
          where: {
            detectedAt: {
              gte: cutoffDate,
            },
            severity: {
              gte: MIN_SEVERITY,
            },
          },
          select: {
            siteId: true,
          },
          distinct: ['siteId'],
        });

        const uniqueSiteIds = [...new Set(recentPatterns.map((p) => p.siteId))];

        console.log(
          `[RecommendationGeneration] Found ${uniqueSiteIds.length} sites with patterns (last ${ANALYSIS_WINDOW_DAYS} days)`
        );

        // Get business details for these sites
        const businessesWithPatterns = await prisma.business.findMany({
          where: {
            siteId: {
              in: uniqueSiteIds,
            },
          },
          select: {
            id: true,
            siteId: true,
            name: true,
          },
        });

        console.log(
          `[RecommendationGeneration] Processing ${businessesWithPatterns.length} businesses`
        );

        return businessesWithPatterns;
      });

      // Edge case: no businesses with patterns
      if (businesses.length === 0) {
        console.log('[RecommendationGeneration] No businesses with patterns to process');
        return {
          status: 'success',
          businessesProcessed: 0,
          recommendationsGenerated: 0,
          recommendationsStored: 0,
          executionTimeMs: Date.now() - jobStartTime,
        };
      }

      // Step 2: Generate recommendations for each business
      const results: RecommendationGenerationResult[] = [];
      let totalRecommendationsGenerated = 0;
      let totalRecommendationsStored = 0;
      const errors: string[] = [];

      for (const business of businesses) {
        const businessResult = await step.run(
          `generate-recommendations-${business.id}`,
          async () => {
            console.log(
              `[RecommendationGeneration] Processing business: ${business.name} (${business.id})`
            );

            try {
              const result = await generateAndStoreRecommendations({
                siteId: business.siteId,
                businessId: business.id,
                analysisWindowDays: ANALYSIS_WINDOW_DAYS,
                minSeverity: MIN_SEVERITY,
                maxRecommendations: MAX_RECOMMENDATIONS_PER_BUSINESS,
                includePeerData: true,
              });

              console.log(
                `[RecommendationGeneration] Business ${business.id}: ` +
                  `Generated ${result.recommendationsGenerated}, ` +
                  `Stored ${result.recommendationsStored} ` +
                  `(${result.executionTimeMs}ms)`
              );

              return result;
            } catch (error) {
              const errorMessage = `Business ${business.id} failed: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`;
              console.error(`[RecommendationGeneration] ${errorMessage}`);

              // Return partial result with error
              return {
                businessId: business.id,
                siteId: business.siteId,
                recommendationsGenerated: 0,
                recommendationsStored: 0,
                patternsProcessed: 0,
                executionTimeMs: 0,
                errors: [errorMessage],
                timestamp: new Date(),
              };
            }
          }
        );

        results.push(businessResult);
        totalRecommendationsGenerated += businessResult.recommendationsGenerated;
        totalRecommendationsStored += businessResult.recommendationsStored;

        if (businessResult.errors.length > 0) {
          errors.push(...businessResult.errors);
        }
      }

      // Step 3: Log summary and return results
      const executionTimeMs = Date.now() - jobStartTime;

      console.log('[RecommendationGeneration] Job completed successfully');
      console.log(`[RecommendationGeneration] Summary:
        - Businesses processed: ${businesses.length}
        - Recommendations generated: ${totalRecommendationsGenerated}
        - Recommendations stored: ${totalRecommendationsStored}
        - Execution time: ${executionTimeMs}ms
        - Errors: ${errors.length}
      `);

      return {
        status: 'success',
        businessesProcessed: businesses.length,
        recommendationsGenerated: totalRecommendationsGenerated,
        recommendationsStored: totalRecommendationsStored,
        executionTimeMs,
        errors,
        results,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - jobStartTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during job execution';

      console.error(`[RecommendationGeneration] Job failed: ${errorMessage}`);

      // Return failure result
      return {
        status: 'failed',
        businessesProcessed: 0,
        recommendationsGenerated: 0,
        recommendationsStored: 0,
        executionTimeMs,
        errors: [errorMessage],
      };
    }
  }
);

/**
 * Trigger recommendation generation job manually
 * Can be used for testing or manual invocation
 */
export async function triggerRecommendationGeneration(data?: { siteId?: string }) {
  return await inngest.send({
    name: 'recommendation/generate',
    data: data || {},
  });
}
