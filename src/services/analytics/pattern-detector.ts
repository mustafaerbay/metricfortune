/**
 * Pattern Detector Service
 *
 * Pure business logic module for detecting behavioral patterns and friction points
 * from aggregated session data.
 *
 * This service:
 * - Analyzes Session data to detect abandonment patterns (>30% drop-off)
 * - Queries TrackingEvent for hesitation patterns (form re-entry)
 * - Calculates low engagement patterns (below-average time-on-page)
 * - Applies statistical significance thresholds (minimum 100 sessions)
 * - Generates human-readable pattern summaries
 * - Stores detected patterns with confidence scores
 *
 * @module services/analytics/pattern-detector
 */

import { prisma } from '@/lib/prisma';
import type { Pattern } from '@prisma/client';
import type {
  PatternData,
  PatternType,
  PatternMetadata,
  DateRange,
  PatternDetectionResult,
} from '@/types/pattern';
import {
  PATTERN_THRESHOLDS,
  CONFIDENCE_LEVELS,
  PatternType as PatternTypeEnum,
} from '@/types/pattern';

/**
 * Detect behavioral patterns for a site within an analysis window
 *
 * Analyzes session data to identify:
 * - Abandonment patterns (>30% drop-off in journey stages)
 * - Hesitation patterns (form field re-entry)
 * - Low engagement patterns (<70% of site average time-on-page)
 *
 * @param siteId - Site to analyze
 * @param analysisWindow - Date range for analysis
 * @returns Array of detected patterns meeting statistical thresholds
 *
 * @example
 * const patterns = await detectPatterns('site_123', {
 *   startDate: new Date('2025-11-01'),
 *   endDate: new Date('2025-11-07')
 * });
 */
export async function detectPatterns(
  siteId: string,
  analysisWindow: DateRange
): Promise<PatternData[]> {
  const startTimeMs = performance.now();
  console.log(
    `[PatternDetector] Starting detection for site ${siteId} (${analysisWindow.startDate.toISOString()} to ${analysisWindow.endDate.toISOString()})`
  );

  try {
    // Query sessions within analysis window
    const sessions = await prisma.session.findMany({
      where: {
        siteId,
        createdAt: {
          gte: analysisWindow.startDate,
          lte: analysisWindow.endDate,
        },
      },
      select: {
        sessionId: true,
        journeyPath: true,
        duration: true,
        pageCount: true,
        exitPage: true,
        createdAt: true,
      },
    });

    console.log(
      `[PatternDetector] Fetched ${sessions.length} sessions in ${(performance.now() - startTimeMs).toFixed(2)}ms`
    );

    // Edge case: insufficient data
    if (sessions.length < PATTERN_THRESHOLDS.MIN_SESSIONS) {
      console.log(
        `[PatternDetector] Insufficient data (${sessions.length} < ${PATTERN_THRESHOLDS.MIN_SESSIONS} required sessions)`
      );
      return [];
    }

    // Detect all pattern types
    const allPatterns: PatternData[] = [];

    // 1. Abandonment patterns
    const abandonmentPatterns = await detectAbandonmentPatterns(siteId, sessions);
    allPatterns.push(...abandonmentPatterns);

    // 2. Hesitation patterns
    const hesitationPatterns = await detectHesitationPatterns(
      siteId,
      analysisWindow
    );
    allPatterns.push(...hesitationPatterns);

    // 3. Low engagement patterns
    const engagementPatterns = await detectLowEngagementPatterns(siteId, sessions);
    allPatterns.push(...engagementPatterns);

    // Filter patterns by statistical significance
    const significantPatterns = allPatterns.filter(
      (pattern) => pattern.sessionCount >= PATTERN_THRESHOLDS.MIN_SESSIONS
    );

    const totalTimeMs = performance.now() - startTimeMs;
    console.log(
      `[PatternDetector] Completed: ${significantPatterns.length} patterns detected (${allPatterns.length} total, ${allPatterns.length - significantPatterns.length} below threshold) in ${(totalTimeMs / 1000).toFixed(2)}s`
    );

    return significantPatterns;
  } catch (error) {
    console.error('[PatternDetector] Error during detection:', error);
    throw error;
  }
}

/**
 * Detect abandonment patterns from journey paths
 *
 * Analyzes session journeyPath arrays to identify stages with >30% drop-off
 *
 * @param siteId - Site ID
 * @param sessions - Sessions to analyze
 * @returns Array of abandonment patterns
 */
async function detectAbandonmentPatterns(
  siteId: string,
  sessions: Array<{
    journeyPath: string[];
    sessionId: string;
  }>
): Promise<PatternData[]> {
  console.log(`[PatternDetector] Analyzing abandonment patterns`);

  // Build transition map: stage -> next stage -> count
  const transitionCounts = new Map<string, Map<string, number>>();
  const stageCounts = new Map<string, number>();

  for (const session of sessions) {
    const journey = session.journeyPath;

    // Track each stage
    for (let i = 0; i < journey.length; i++) {
      const stage = journey[i];
      stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);

      // Track transitions to next stage
      if (i < journey.length - 1) {
        const nextStage = journey[i + 1];
        if (!transitionCounts.has(stage)) {
          transitionCounts.set(stage, new Map());
        }
        const nextMap = transitionCounts.get(stage)!;
        nextMap.set(nextStage, (nextMap.get(nextStage) || 0) + 1);
      }
    }
  }

  // Identify drop-offs: stages where <70% continue to any next stage
  const patterns: PatternData[] = [];

  for (const [stage, count] of stageCounts.entries()) {
    // Skip if insufficient sample size
    if (count < PATTERN_THRESHOLDS.MIN_SESSIONS) {
      continue;
    }

    // Calculate continuation rate
    const transitions = transitionCounts.get(stage);
    const continueCount = transitions
      ? Array.from(transitions.values()).reduce((sum, c) => sum + c, 0)
      : 0;
    const abandonCount = count - continueCount;
    const abandonRate = (abandonCount / count) * 100;

    // Check if abandonment rate exceeds threshold
    if (abandonRate >= PATTERN_THRESHOLDS.ABANDONMENT_RATE) {
      const severity = calculateSeverity(abandonRate / 100, count, sessions.length);
      const confidence = calculateConfidenceScore(count);

      const metadata: PatternMetadata = {
        stage,
        dropOffRate: Math.round(abandonRate * 100) / 100,
        affectedSessions: abandonCount,
        sampleSize: count,
      };

      const pattern: PatternData = {
        siteId,
        patternType: PatternTypeEnum.ABANDONMENT,
        description: generatePatternSummary(
          PatternTypeEnum.ABANDONMENT,
          metadata
        ),
        severity,
        sessionCount: count,
        confidenceScore: confidence,
        metadata,
      };

      patterns.push(pattern);
    }
  }

  console.log(
    `[PatternDetector] Found ${patterns.length} abandonment patterns`
  );
  return patterns;
}

/**
 * Detect hesitation patterns from form interactions
 *
 * Analyzes TrackingEvent data for form fields with re-entry patterns
 *
 * @param siteId - Site ID
 * @param analysisWindow - Date range for analysis
 * @returns Array of hesitation patterns
 */
async function detectHesitationPatterns(
  siteId: string,
  analysisWindow: DateRange
): Promise<PatternData[]> {
  console.log(`[PatternDetector] Analyzing hesitation patterns`);

  try {
    // Query form interaction events
    const formEvents = await prisma.trackingEvent.findMany({
      where: {
        siteId,
        eventType: {
          in: ['form_focus', 'form_blur', 'form_input'],
        },
        timestamp: {
          gte: analysisWindow.startDate,
          lte: analysisWindow.endDate,
        },
      },
      select: {
        sessionId: true,
        eventType: true,
        data: true,
      },
      orderBy: [{ sessionId: 'asc' }, { timestamp: 'asc' }],
    });

    // Group by session and field
    const sessionFieldInteractions = new Map<
      string,
      Map<string, { focusCount: number; blurCount: number }>
    >();

    for (const event of formEvents) {
      const data = event.data as Record<string, unknown>;
      const field = (data?.field as string) || (data?.name as string);
      if (!field) continue;

      if (!sessionFieldInteractions.has(event.sessionId)) {
        sessionFieldInteractions.set(event.sessionId, new Map());
      }

      const fieldMap = sessionFieldInteractions.get(event.sessionId)!;
      if (!fieldMap.has(field)) {
        fieldMap.set(field, { focusCount: 0, blurCount: 0 });
      }

      const counts = fieldMap.get(field)!;
      if (event.eventType === 'form_focus') {
        counts.focusCount++;
      } else if (event.eventType === 'form_blur') {
        counts.blurCount++;
      }
    }

    // Analyze re-entry patterns by field
    const fieldStats = new Map<
      string,
      { sessions: number; reEntries: number }
    >();

    for (const [, fieldMap] of sessionFieldInteractions.entries()) {
      for (const [field, counts] of fieldMap.entries()) {
        if (!fieldStats.has(field)) {
          fieldStats.set(field, { sessions: 0, reEntries: 0 });
        }

        const stats = fieldStats.get(field)!;
        stats.sessions++;

        // Re-entry detected if focus count > 1
        if (counts.focusCount > 1) {
          stats.reEntries++;
        }
      }
    }

    // Identify fields with high re-entry rates
    const patterns: PatternData[] = [];

    for (const [field, stats] of fieldStats.entries()) {
      if (stats.sessions < PATTERN_THRESHOLDS.MIN_SESSIONS) {
        continue;
      }

      const reEntryRate = (stats.reEntries / stats.sessions) * 100;

      if (reEntryRate >= PATTERN_THRESHOLDS.HESITATION_RATE) {
        const severity = calculateSeverity(
          reEntryRate / 100,
          stats.reEntries,
          stats.sessions
        );
        const confidence = calculateConfidenceScore(stats.sessions);

        const metadata: PatternMetadata = {
          field,
          reEntryRate: Math.round(reEntryRate * 100) / 100,
          affectedSessions: stats.reEntries,
          sampleSize: stats.sessions,
        };

        const pattern: PatternData = {
          siteId,
          patternType: PatternTypeEnum.HESITATION,
          description: generatePatternSummary(
            PatternTypeEnum.HESITATION,
            metadata
          ),
          severity,
          sessionCount: stats.sessions,
          confidenceScore: confidence,
          metadata,
        };

        patterns.push(pattern);
      }
    }

    console.log(
      `[PatternDetector] Found ${patterns.length} hesitation patterns`
    );
    return patterns;
  } catch (error) {
    console.error(
      '[PatternDetector] Error detecting hesitation patterns:',
      error
    );
    return [];
  }
}

/**
 * Detect low engagement patterns from session durations
 *
 * Identifies pages with time-on-page <70% of site average
 *
 * @param siteId - Site ID
 * @param sessions - Sessions to analyze
 * @returns Array of low engagement patterns
 */
async function detectLowEngagementPatterns(
  siteId: string,
  sessions: Array<{
    journeyPath: string[];
    duration: number | null;
    pageCount: number;
  }>
): Promise<PatternData[]> {
  console.log(`[PatternDetector] Analyzing low engagement patterns`);

  // Calculate time-on-page per URL
  const pageStats = new Map<
    string,
    { totalTime: number; sessionCount: number }
  >();

  for (const session of sessions) {
    if (!session.duration || session.pageCount === 0) continue;

    // Approximate time per page
    const timePerPage = session.duration / session.pageCount;

    for (const page of session.journeyPath) {
      if (!pageStats.has(page)) {
        pageStats.set(page, { totalTime: 0, sessionCount: 0 });
      }

      const stats = pageStats.get(page)!;
      stats.totalTime += timePerPage;
      stats.sessionCount++;
    }
  }

  // Calculate site average time-on-page
  let totalSiteTime = 0;
  let totalPageviews = 0;

  for (const [, stats] of pageStats.entries()) {
    totalSiteTime += stats.totalTime;
    totalPageviews += stats.sessionCount;
  }

  if (totalPageviews === 0) {
    return [];
  }

  const siteAverage = totalSiteTime / totalPageviews;
  const threshold = siteAverage * PATTERN_THRESHOLDS.LOW_ENGAGEMENT_THRESHOLD;

  // Identify pages below threshold
  const patterns: PatternData[] = [];

  for (const [page, stats] of pageStats.entries()) {
    if (stats.sessionCount < PATTERN_THRESHOLDS.MIN_PAGEVIEWS_PER_URL) {
      continue;
    }

    const avgTimeOnPage = stats.totalTime / stats.sessionCount;

    if (avgTimeOnPage < threshold) {
      const engagementGap =
        ((siteAverage - avgTimeOnPage) / siteAverage) * 100;
      const severity = calculateSeverity(
        engagementGap / 100,
        stats.sessionCount,
        sessions.length
      );
      const confidence = calculateConfidenceScore(stats.sessionCount);

      const metadata: PatternMetadata = {
        page,
        timeOnPage: Math.round(avgTimeOnPage * 100) / 100,
        siteAverage: Math.round(siteAverage * 100) / 100,
        engagementGap: Math.round(engagementGap * 100) / 100,
        affectedSessions: stats.sessionCount,
        sampleSize: stats.sessionCount,
      };

      const pattern: PatternData = {
        siteId,
        patternType: PatternTypeEnum.LOW_ENGAGEMENT,
        description: generatePatternSummary(
          PatternTypeEnum.LOW_ENGAGEMENT,
          metadata
        ),
        severity,
        sessionCount: stats.sessionCount,
        confidenceScore: confidence,
        metadata,
      };

      patterns.push(pattern);
    }
  }

  console.log(
    `[PatternDetector] Found ${patterns.length} low engagement patterns`
  );
  return patterns;
}

/**
 * Calculate confidence score based on sample size
 *
 * @param sessionCount - Number of sessions in sample
 * @returns Confidence score 0.0 - 1.0
 */
function calculateConfidenceScore(sessionCount: number): number {
  if (sessionCount >= CONFIDENCE_LEVELS.VERY_HIGH.min) {
    return CONFIDENCE_LEVELS.VERY_HIGH.score;
  } else if (sessionCount >= CONFIDENCE_LEVELS.HIGH.min) {
    return CONFIDENCE_LEVELS.HIGH.score;
  } else if (sessionCount >= CONFIDENCE_LEVELS.MEDIUM.min) {
    return CONFIDENCE_LEVELS.MEDIUM.score;
  }
  return 0.0;
}

/**
 * Calculate normalized severity score (0.0 - 1.0)
 *
 * Formula: (rate × affected_count) / max_possible_score
 *
 * @param rate - Pattern rate (0.0 - 1.0)
 * @param affectedCount - Number of affected sessions
 * @param totalCount - Total sessions analyzed
 * @returns Normalized severity score
 */
function calculateSeverity(
  rate: number,
  affectedCount: number,
  totalCount: number
): number {
  // Severity combines rate and volume
  const volumeWeight = affectedCount / totalCount;
  const severity = rate * 0.7 + volumeWeight * 0.3;

  // Clamp to 0.0 - 1.0
  return Math.max(0, Math.min(1, severity));
}

/**
 * Generate human-readable pattern summary
 *
 * @param patternType - Type of pattern
 * @param metadata - Pattern-specific metadata
 * @returns Human-readable summary string
 */
export function generatePatternSummary(
  patternType: PatternType,
  metadata: PatternMetadata
): string {
  switch (patternType) {
    case PatternTypeEnum.ABANDONMENT:
      return `${metadata.dropOffRate}% of users abandon at ${metadata.stage} (${metadata.affectedSessions} sessions)`;

    case PatternTypeEnum.HESITATION:
      return `${metadata.reEntryRate}% of users re-enter "${metadata.field}" field (hesitation indicator, ${metadata.affectedSessions} sessions)`;

    case PatternTypeEnum.LOW_ENGAGEMENT:
      return `${metadata.page} has ${metadata.engagementGap}% lower time-on-page than site average (${metadata.timeOnPage}s vs ${metadata.siteAverage}s, ${metadata.affectedSessions} pageviews)`;

    default:
      return 'Unknown pattern type';
  }
}

/**
 * Store detected patterns in database
 *
 * Uses Prisma createMany for bulk insert
 * Handles duplicates via skipDuplicates option
 *
 * @param patterns - Array of pattern data to store
 * @returns Result with created count and errors
 */
export async function storePatterns(
  patterns: PatternData[]
): Promise<{ created: number; errors: string[] }> {
  console.log(`[PatternDetector] Storing ${patterns.length} patterns`);

  const errors: string[] = [];
  let created = 0;

  if (patterns.length === 0) {
    return { created: 0, errors: [] };
  }

  try {
    // Use createMany for bulk insert
    const result = await prisma.pattern.createMany({
      data: patterns.map((pattern) => ({
        siteId: pattern.siteId,
        patternType: pattern.patternType,
        description: pattern.description,
        severity: pattern.severity,
        sessionCount: pattern.sessionCount,
        confidenceScore: pattern.confidenceScore,
        metadata: pattern.metadata as any,
        detectedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    created = result.count;
    console.log(`[PatternDetector] Successfully stored ${created} patterns`);
  } catch (error) {
    console.error('[PatternDetector] Error storing patterns:', error);
    errors.push(
      `Bulk insert failed: ${error instanceof Error ? error.message : String(error)}`
    );

    // Fallback: Try individual creates
    console.log('[PatternDetector] Attempting individual creates as fallback');
    for (const pattern of patterns) {
      try {
        await prisma.pattern.create({
          data: {
            siteId: pattern.siteId,
            patternType: pattern.patternType,
            description: pattern.description,
            severity: pattern.severity,
            sessionCount: pattern.sessionCount,
            confidenceScore: pattern.confidenceScore,
            metadata: pattern.metadata as any,
            detectedAt: new Date(),
          },
        });
        created++;
      } catch (createError) {
        errors.push(
          `Failed to create pattern: ${createError instanceof Error ? createError.message : String(createError)}`
        );
      }
    }
  }

  return { created, errors };
}
