/**
 * Pattern detection type definitions
 *
 * This module defines TypeScript types and interfaces for the pattern
 * detection service, including abandonment, hesitation, and engagement patterns.
 */

import { DateRange } from './session';

/**
 * Pattern type enumeration
 * Defines the three types of behavioral patterns detected by the system
 */
export enum PatternType {
  ABANDONMENT = 'ABANDONMENT',
  HESITATION = 'HESITATION',
  LOW_ENGAGEMENT = 'LOW_ENGAGEMENT',
}

/**
 * Base pattern metadata
 * Pattern-specific data that varies by pattern type
 */
export interface PatternMetadata {
  // Abandonment pattern fields
  stage?: string; // Journey stage where abandonment occurs
  dropOffRate?: number; // Percentage who abandon (0-100)
  nextStage?: string; // Expected next stage

  // Hesitation pattern fields
  field?: string; // Form field name
  reEntryRate?: number; // Percentage with re-entry (0-100)
  avgReEntries?: number; // Average number of re-entries

  // Low engagement pattern fields
  page?: string; // Page URL
  timeOnPage?: number; // Average time on page (seconds)
  siteAverage?: number; // Site average time on page (seconds)
  engagementGap?: number; // Percentage below average (0-100)

  // Common fields
  affectedSessions?: number; // Number of sessions showing this pattern
  sampleSize?: number; // Total sessions analyzed for this pattern
}

/**
 * Input data structure for pattern detector
 * Represents a detected pattern ready for storage
 */
export interface PatternData {
  siteId: string;
  patternType: PatternType;
  description: string; // Human-readable summary
  severity: number; // 0.0 - 1.0, used for ranking
  sessionCount: number; // Number of sessions analyzed
  confidenceScore: number; // Statistical confidence (0.0 - 1.0)
  metadata: PatternMetadata; // Pattern-specific data
}

/**
 * Query options for pattern retrieval
 * Optional filters for getPatterns Server Action
 */
export interface PatternQueryOptions {
  patternType?: PatternType; // Filter by pattern type
  minSeverity?: number; // Minimum severity threshold (0.0 - 1.0)
  minConfidence?: number; // Minimum confidence score (0.0 - 1.0)
  dateRange?: DateRange; // Filter by detection date
  limit?: number; // Maximum number of results
  sortBy?: 'severity' | 'detectedAt' | 'confidence'; // Sort field
  sortOrder?: 'asc' | 'desc'; // Sort direction
}

/**
 * Pattern detection job result
 * Tracks the outcome of a pattern detection job
 */
export interface PatternDetectionResult {
  siteId: string;
  patternsDetected: number;
  patternsStored: number;
  sessionsAnalyzed: number;
  executionTimeMs: number;
  errors: string[];
  timestamp: Date;
}

/**
 * Statistical thresholds for pattern detection
 * Constants used by the pattern detector service
 */
export const PATTERN_THRESHOLDS = {
  MIN_SESSIONS: 100, // Minimum sessions for pattern confidence
  ABANDONMENT_RATE: 30, // Minimum drop-off percentage (30%)
  HESITATION_RATE: 20, // Minimum re-entry percentage (20%)
  LOW_ENGAGEMENT_THRESHOLD: 0.7, // 70% of site average
  MIN_PAGEVIEWS_PER_URL: 50, // Minimum sample size for engagement patterns
} as const;

/**
 * Confidence score thresholds
 * Session count ranges for confidence calculation
 */
export const CONFIDENCE_LEVELS = {
  MEDIUM: { min: 100, max: 200, score: 0.6 },
  HIGH: { min: 200, max: 500, score: 0.8 },
  VERY_HIGH: { min: 500, max: Infinity, score: 1.0 },
} as const;

// Re-export DateRange for convenience
export type { DateRange };
