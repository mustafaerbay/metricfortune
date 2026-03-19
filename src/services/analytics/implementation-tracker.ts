/**
 * Implementation Tracking Calculation Service
 * Story 2.6: Implementation Tracking & Results
 *
 * Pure functions for calculating before/after metrics and trend analysis.
 * Reuses cart/checkout detection patterns from peer-calculator.ts.
 */

import { Session } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { subDays, addDays, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import type {
  MetricsData,
  ChangeMetric,
  Confidence,
  TrendDirection,
  TrendColor,
  ImplementationStatus,
  DailyMetric,
} from '@/types/implementation';

/**
 * Check if URL is a cart page
 */
function isCartPage(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.includes('/cart') || urlLower.includes('/basket');
}

/**
 * Check if URL is a checkout page
 */
function isCheckoutPage(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.includes('/checkout') || urlLower.includes('/payment');
}

/**
 * Determine confidence level based on session count
 */
function determineConfidence(sessionCount: number): Confidence {
  if (sessionCount >= 500) return 'high';
  if (sessionCount >= 100) return 'medium';
  return 'low';
}

/**
 * Calculate conversion rate from sessions
 */
function calculateConversionRate(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const convertedSessions = sessions.filter(s => s.converted).length;
  return (convertedSessions / sessions.length) * 100;
}

/**
 * Calculate cart abandonment rate from sessions
 */
function calculateCartAbandonment(sessions: Session[]): number {
  const cartSessions = sessions.filter(s =>
    s.journeyPath.some(url => isCartPage(url))
  ).length;

  if (cartSessions === 0) return 0;

  const checkoutSessions = sessions.filter(s =>
    s.journeyPath.some(url => isCheckoutPage(url))
  ).length;

  return ((cartSessions - checkoutSessions) / cartSessions) * 100;
}

/**
 * Calculate metrics for the 7-day period BEFORE implementation
 *
 * @param siteId Site identifier for filtering sessions
 * @param implementedAt Implementation date
 * @returns Metrics data for the before period
 */
export async function calculateBeforeMetrics(
  siteId: string,
  implementedAt: Date
): Promise<MetricsData> {
  const beforeStart = subDays(implementedAt, 7);
  const beforeEnd = implementedAt;

  const sessions = await prisma.session.findMany({
    where: {
      siteId,
      createdAt: {
        gte: beforeStart,
        lt: beforeEnd,
      },
    },
  });

  return {
    conversionRate: calculateConversionRate(sessions),
    cartAbandonmentRate: calculateCartAbandonment(sessions),
    sessionCount: sessions.length,
    confidence: determineConfidence(sessions.length),
  };
}

/**
 * Calculate metrics for the 7-day period AFTER implementation
 *
 * @param siteId Site identifier for filtering sessions
 * @param implementedAt Implementation date
 * @returns Metrics data for the after period
 */
export async function calculateAfterMetrics(
  siteId: string,
  implementedAt: Date
): Promise<MetricsData> {
  const afterStart = implementedAt;
  const afterEnd = addDays(implementedAt, 7);
  const now = new Date();

  // If after period hasn't completed yet, calculate based on available data
  const effectiveEnd = afterEnd < now ? afterEnd : now;

  const sessions = await prisma.session.findMany({
    where: {
      siteId,
      createdAt: {
        gte: afterStart,
        lt: effectiveEnd,
      },
    },
  });

  return {
    conversionRate: calculateConversionRate(sessions),
    cartAbandonmentRate: calculateCartAbandonment(sessions),
    sessionCount: sessions.length,
    confidence: determineConfidence(sessions.length),
  };
}

/**
 * Calculate metric change with trend direction and formatting
 *
 * @param before Metric value before implementation
 * @param after Metric value after implementation
 * @param lowerIsBetter Whether lower values indicate improvement (default: false)
 * @returns Change metric with direction, formatted string, and color
 */
export function calculateMetricChange(
  before: number,
  after: number,
  lowerIsBetter: boolean = false
): ChangeMetric {
  // Handle division by zero
  if (before === 0) {
    return {
      value: 0,
      direction: 'neutral',
      formatted: '0.0%',
      color: 'gray',
    };
  }

  const change = ((after - before) / before) * 100;

  // Determine direction based on change magnitude and whether lower is better
  let direction: TrendDirection;
  let color: TrendColor;

  if (lowerIsBetter) {
    // For metrics like cart abandonment, decreases are positive
    if (change <= -5) {
      direction = 'positive';
      color = 'green';
    } else if (change >= 5) {
      direction = 'negative';
      color = 'red';
    } else {
      direction = 'neutral';
      color = 'gray';
    }
  } else {
    // For metrics like conversion rate, increases are positive
    if (change >= 5) {
      direction = 'positive';
      color = 'green';
    } else if (change <= -5) {
      direction = 'negative';
      color = 'red';
    } else {
      direction = 'neutral';
      color = 'gray';
    }
  }

  return {
    value: change,
    direction,
    formatted: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    color,
  };
}

/**
 * Determine implementation status based on time elapsed and metric changes
 *
 * @param daysSinceImplementation Days since implementation date
 * @param conversionChange Conversion rate change metric
 * @param abandonmentChange Cart abandonment change metric
 * @returns Status indicator string
 */
export function determineImplementationStatus(
  daysSinceImplementation: number,
  conversionChange: ChangeMetric,
  abandonmentChange: ChangeMetric
): ImplementationStatus {
  // Too early if less than 7 days
  if (daysSinceImplementation < 7) {
    return 'Too early to measure';
  }

  // Positive if conversion improved (positive direction)
  // OR abandonment decreased (negative change is good for abandonment)
  const conversionImproved = conversionChange.direction === 'positive';
  const abandonmentImproved = abandonmentChange.value < -5; // Decrease in abandonment is good

  if (conversionImproved || abandonmentImproved) {
    return 'Positive trend';
  }

  // Negative if conversion declined OR abandonment increased significantly
  const conversionDeclined = conversionChange.direction === 'negative';
  const abandonmentIncreased = abandonmentChange.value > 5; // Increase in abandonment is bad

  if (conversionDeclined || abandonmentIncreased) {
    return 'Negative trend';
  }

  return 'No change detected';
}

/**
 * Fetch daily metrics for trend visualization (14-day period: 7 before + 7 after)
 *
 * @param siteId Site identifier for filtering sessions
 * @param implementedAt Implementation date
 * @returns Array of daily metric data points
 */
export async function fetchDailyMetrics(
  siteId: string,
  implementedAt: Date
): Promise<DailyMetric[]> {
  const startDate = subDays(implementedAt, 7);
  const endDate = addDays(implementedAt, 7);
  const now = new Date();
  const effectiveEnd = endDate < now ? endDate : now;

  // Single query for all sessions in the full window (replaces N+1 per-day queries)
  const allSessions = await prisma.session.findMany({
    where: {
      siteId,
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(effectiveEnd),
      },
    },
  });

  // Group sessions by day in memory
  const sessionsByDay = new Map<string, Session[]>();
  for (const session of allSessions) {
    const dayKey = startOfDay(session.createdAt).toISOString();
    const existing = sessionsByDay.get(dayKey) ?? [];
    existing.push(session);
    sessionsByDay.set(dayKey, existing);
  }

  // Build metrics for each day in the range
  const dailyMetrics: DailyMetric[] = [];
  let currentDate = startDate;
  while (currentDate <= effectiveEnd) {
    const dayKey = startOfDay(currentDate).toISOString();
    const sessions = sessionsByDay.get(dayKey) ?? [];

    dailyMetrics.push({
      date: currentDate,
      conversionRate: calculateConversionRate(sessions),
      cartAbandonmentRate: calculateCartAbandonment(sessions),
      sessionCount: sessions.length,
    });

    currentDate = addDays(currentDate, 1);
  }

  return dailyMetrics;
}

/**
 * Check if enough time has passed for after metrics (at least 7 days)
 *
 * @param implementedAt Implementation date
 * @returns Whether after period is complete
 */
export function isAfterPeriodComplete(implementedAt: Date): boolean {
  const daysSince = differenceInDays(new Date(), implementedAt);
  return daysSince >= 7;
}
