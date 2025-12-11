/**
 * Type definitions for Implementation Tracking feature
 * Story 2.6: Implementation Tracking & Results
 */

/**
 * Confidence level based on session count
 */
export type Confidence = 'high' | 'medium' | 'low';

/**
 * Trend direction for metric changes
 */
export type TrendDirection = 'positive' | 'negative' | 'neutral';

/**
 * Semantic color for trend visualization
 */
export type TrendColor = 'green' | 'red' | 'gray';

/**
 * Status of implementation measurement
 */
export type ImplementationStatus =
  | 'Too early to measure'
  | 'Positive trend'
  | 'No change detected'
  | 'Negative trend';

/**
 * Metrics data for a time period (before or after implementation)
 */
export interface MetricsData {
  conversionRate: number;
  cartAbandonmentRate: number;
  sessionCount: number;
  confidence: Confidence;
}

/**
 * Metric change calculation with trend analysis
 */
export interface ChangeMetric {
  value: number; // Percentage change
  direction: TrendDirection;
  formatted: string; // e.g., "+15.2%"
  color: TrendColor;
}

/**
 * Complete implementation tracking data for a recommendation
 */
export interface ImplementationTrackingData {
  recommendationId: string;
  implementedAt: Date;
  daysSinceImplementation: number;
  status: ImplementationStatus;
  beforeMetrics: MetricsData;
  afterMetrics: MetricsData;
  conversionChange: ChangeMetric;
  abandonmentChange: ChangeMetric;
}

/**
 * Daily metrics point for trend chart
 */
export interface DailyMetric {
  date: Date;
  conversionRate: number;
  cartAbandonmentRate: number;
  sessionCount: number;
}
