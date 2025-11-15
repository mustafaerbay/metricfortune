/**
 * Journey Insights Type Definitions
 * Defines types for customer journey funnel analysis and visualization
 */

/**
 * Journey type classification based on entry page
 */
export type JourneyType = 'all' | 'homepage' | 'search' | 'direct-to-product' | 'other';

/**
 * Page information within a funnel stage
 */
export interface StagePage {
  url: string;
  count: number;
  avgTimeSpent?: number; // Average seconds spent on this page
}

/**
 * Individual funnel stage with metrics
 */
export interface FunnelStage {
  /** Stage name (e.g., "Entry", "Product View", "Cart", "Checkout", "Purchase") */
  name: string;
  /** Number of sessions that reached this stage */
  count: number;
  /** Percentage of total sessions that reached this stage */
  percentage: number;
  /** Percentage that dropped off from previous stage (undefined for first stage) */
  dropOffRate?: number;
  /** Conversion rate to next stage (undefined for last stage) */
  conversionRate?: number;
  /** Average time spent in this stage (seconds) */
  avgTimeSpent?: number;
  /** Top pages visited in this stage */
  topPages?: StagePage[];
  /** Entry points for this stage */
  entryPages?: string[];
  /** Exit points from this stage */
  exitPages?: string[];
}

/**
 * Complete funnel data with all stages and metrics
 */
export interface FunnelData {
  /** All funnel stages in order */
  stages: FunnelStage[];
  /** Total number of sessions analyzed */
  totalSessions: number;
  /** Overall conversion rate from entry to purchase (percentage) */
  overallConversion: number;
  /** Journey type filter applied */
  journeyType: JourneyType;
  /** Date range analyzed */
  dateRange: {
    start: Date;
    end: Date;
    label: string; // e.g., "Last 30 days"
  };
}

/**
 * Plain-language insight about the funnel
 */
export interface FunnelInsight {
  /** Primary insight message */
  primary: string;
  /** Secondary insight (optional) */
  secondary?: string;
  /** Stage with biggest drop-off */
  biggestDropOffStage?: string;
  /** Drop-off percentage for biggest drop */
  biggestDropOffRate?: number;
  /** Stage with best performance */
  bestPerformingStage?: string;
  /** Best conversion rate */
  bestConversionRate?: number;
}

/**
 * Journey type statistics
 */
export interface JourneyTypeStats {
  type: JourneyType;
  label: string;
  count: number;
  percentage: number;
}

/**
 * Date range option for selector
 */
export interface DateRangeOption {
  value: number; // days
  label: string; // display text
}

/**
 * Constants for funnel stages
 */
export const FUNNEL_STAGES = [
  'Entry',
  'Product View',
  'Cart',
  'Checkout',
  'Purchase'
] as const;

export type FunnelStageName = typeof FUNNEL_STAGES[number];

/**
 * Date range options
 */
export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' }
];

/**
 * Journey type labels
 */
export const JOURNEY_TYPE_LABELS: Record<JourneyType, string> = {
  all: 'All Visitors',
  homepage: 'Homepage Visitors',
  search: 'Search Visitors',
  'direct-to-product': 'Direct-to-Product Visitors',
  other: 'Other Visitors'
};
