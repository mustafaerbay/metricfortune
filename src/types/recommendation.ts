/**
 * Recommendation type definitions
 *
 * This module defines TypeScript types and interfaces for the recommendation
 * generation service, including rule-based recommendation engine and storage.
 */

import { PatternType, PatternData } from './pattern';

/**
 * Impact level enumeration
 * Maps to Prisma enum ImpactLevel
 */
export enum ImpactLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Confidence level enumeration
 * Maps to Prisma enum ConfidenceLevel
 */
export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Recommendation status enumeration
 * Maps to Prisma enum RecommendationStatus
 */
export enum RecommendationStatus {
  NEW = 'NEW',
  PLANNED = 'PLANNED',
  IMPLEMENTED = 'IMPLEMENTED',
  DISMISSED = 'DISMISSED',
}

/**
 * Conversion value weights for prioritization
 * Used to calculate impact score: severity × conversionValueWeight
 */
export const CONVERSION_VALUE_WEIGHTS = {
  HIGH: 3.0, // Abandonment patterns - direct conversion impact
  MEDIUM: 2.0, // Hesitation patterns, cart engagement - indirect impact
  LOW_MEDIUM: 1.5, // Low engagement patterns - engagement precedes conversion
} as const;

/**
 * Recommendation data structure
 * Input to storage and output from recommendation generation
 */
export interface RecommendationData {
  businessId: string;
  siteId: string;
  title: string;
  problemStatement: string;
  actionSteps: string[];
  expectedImpact: string;
  confidenceLevel: ConfidenceLevel;
  impactLevel: ImpactLevel;
  peerSuccessData: string | null;
}

/**
 * Recommendation with calculated impact score
 * Internal type used during prioritization
 */
export interface RecommendationWithScore extends RecommendationData {
  impactScore: number; // severity × conversionValueWeight
}

/**
 * Recommendation rule definition
 * Maps pattern types to specific recommendation templates
 */
export interface RecommendationRule {
  patternType: PatternType;
  contextMatcher: (metadata: any) => boolean; // Checks if metadata matches rule
  titleTemplate: string;
  problemTemplate: string;
  actionSteps: string[];
  expectedImpactTemplate: string;
  conversionValue: keyof typeof CONVERSION_VALUE_WEIGHTS;
}

/**
 * Query options for recommendation retrieval
 * Used in Server Actions to filter and sort recommendations
 */
export interface RecommendationQueryOptions {
  status?: RecommendationStatus;
  impactLevel?: ImpactLevel;
  confidenceLevel?: ConfidenceLevel;
  limit?: number;
  sortBy?: 'createdAt' | 'impactLevel';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Peer success statistics
 * Aggregated data from similar businesses
 */
export interface PeerSuccessStats {
  similarBusinessCount: number;
  implementationCount: number;
  successRate: number; // 0.0 - 1.0
  averageImprovementPercent: number;
}

/**
 * Recommendation generation result
 * Tracks the outcome of a recommendation generation job
 * Note: timestamp is Date | string to handle Inngest serialization
 */
export interface RecommendationGenerationResult {
  businessId: string;
  siteId: string;
  recommendationsGenerated: number;
  recommendationsStored: number;
  patternsProcessed: number;
  executionTimeMs: number;
  errors: string[];
  timestamp: Date | string;
}

/**
 * Confidence level mapping thresholds
 * Maps pattern confidence score to recommendation confidence level
 */
export const CONFIDENCE_THRESHOLDS = {
  LOW: { min: 0.0, max: 0.65 },
  MEDIUM: { min: 0.66, max: 0.85 },
  HIGH: { min: 0.86, max: 1.0 },
} as const;

/**
 * Impact level mapping thresholds
 * Maps pattern severity to recommendation impact level
 */
export const IMPACT_THRESHOLDS = {
  LOW: { min: 0.0, max: 0.4 },
  MEDIUM: { min: 0.41, max: 0.7 },
  HIGH: { min: 0.71, max: 1.0 },
} as const;

/**
 * Recommendation generation options
 * Configuration for recommendation engine
 */
export interface RecommendationGenerationOptions {
  siteId: string;
  businessId: string;
  analysisWindowDays?: number; // Default: 7 days
  minSeverity?: number; // Minimum pattern severity (0.0 - 1.0)
  maxRecommendations?: number; // Default: 5
  includePeerData?: boolean; // Default: true
}

/**
 * Maps pattern confidence score to recommendation confidence level
 */
export function mapConfidenceLevel(confidenceScore: number): ConfidenceLevel {
  if (confidenceScore >= CONFIDENCE_THRESHOLDS.HIGH.min) {
    return ConfidenceLevel.HIGH;
  } else if (confidenceScore >= CONFIDENCE_THRESHOLDS.MEDIUM.min) {
    return ConfidenceLevel.MEDIUM;
  } else {
    return ConfidenceLevel.LOW;
  }
}

/**
 * Maps pattern severity to recommendation impact level
 */
export function mapImpactLevel(severity: number): ImpactLevel {
  if (severity >= IMPACT_THRESHOLDS.HIGH.min) {
    return ImpactLevel.HIGH;
  } else if (severity >= IMPACT_THRESHOLDS.MEDIUM.min) {
    return ImpactLevel.MEDIUM;
  } else {
    return ImpactLevel.LOW;
  }
}

/**
 * Calculates impact score for prioritization
 */
export function calculateImpactScore(
  severity: number,
  conversionValue: keyof typeof CONVERSION_VALUE_WEIGHTS
): number {
  return severity * CONVERSION_VALUE_WEIGHTS[conversionValue];
}

/**
 * Formats peer success data for display
 */
export function formatPeerSuccessData(stats: PeerSuccessStats | null): string | null {
  if (!stats || stats.implementationCount === 0) {
    return null;
  }

  return `${stats.implementationCount} similar ${
    stats.implementationCount === 1 ? 'store' : 'stores'
  } implemented this and saw ${Math.round(stats.averageImprovementPercent)}% average improvement`;
}
