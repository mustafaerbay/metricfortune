/**
 * Type definitions for Peer Benchmarks feature
 * Story 2.5: Peer Benchmarks Tab
 */

/**
 * Categorical percentile ranking
 */
export type Percentile = 'top-25' | 'median' | 'bottom-25';

/**
 * Performance relative to peer average
 */
export type Performance = 'above' | 'at' | 'below';

/**
 * Core metrics data structure
 */
export interface MetricData {
  conversionRate: number;
  avgOrderValue: number;
  cartAbandonmentRate: number;
  bounceRate: number;
}

/**
 * Detailed metric comparison with peer benchmarks
 */
export interface MetricComparison {
  metric: string;
  userValue: number;
  peerAverage: number;
  percentile: Percentile;
  percentileValue: number; // Exact percentile (0-100)
  performance: Performance;
  explanation: string;
  recommendationCount?: number; // Optional: count of related recommendations
}

/**
 * Peer group composition information
 */
export interface PeerGroupInfo {
  count: number;
  industry: string;
  revenueRange: string;
  description: string; // e.g., "Compared to 47 fashion e-commerce stores, $1-5M revenue"
}
