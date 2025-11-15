/**
 * Journey Calculator Service
 *
 * Pure business logic for calculating customer journey funnels from session data.
 * Processes Session records to identify funnel stages, calculate drop-off rates,
 * and generate plain-language insights.
 *
 * Funnel Stages: Entry → Product View → Cart → Checkout → Purchase
 *
 * @module services/analytics/journey-calculator
 */

import type { Session } from '@prisma/client';
import type {
  FunnelData,
  FunnelStage,
  FunnelInsight,
  JourneyType,
  JourneyTypeStats,
  StagePage,
} from '@/types/journey';
import { FUNNEL_STAGES, JOURNEY_TYPE_LABELS } from '@/types/journey';
import { subDays } from 'date-fns';

/**
 * Calculate funnel stages from session data
 *
 * Analyzes sessions to identify which funnel stages were reached,
 * calculates visitor counts, drop-off rates, and conversion rates.
 *
 * @param sessions - Array of session records to analyze
 * @param dateRange - Number of days to analyze (for date range label)
 * @param journeyType - Filter sessions by journey type (default: 'all')
 * @returns Complete funnel data with stages and metrics
 *
 * @example
 * const sessions = await prisma.session.findMany({ where: { siteId } });
 * const funnelData = calculateFunnelStages(sessions, 30, 'all');
 */
export function calculateFunnelStages(
  sessions: Session[],
  dateRange: number = 30,
  journeyType: JourneyType = 'all'
): FunnelData {
  // Filter sessions by journey type
  const filteredSessions =
    journeyType === 'all'
      ? sessions
      : sessions.filter((s) => detectJourneyType(s) === journeyType);

  const totalSessions = filteredSessions.length;

  // Handle empty state
  if (totalSessions === 0) {
    return {
      stages: FUNNEL_STAGES.map((name) => ({
        name,
        count: 0,
        percentage: 0,
        dropOffRate: 0,
        conversionRate: 0,
        avgTimeSpent: 0,
        topPages: [],
      })),
      totalSessions: 0,
      overallConversion: 0,
      journeyType,
      dateRange: {
        start: subDays(new Date(), dateRange),
        end: new Date(),
        label: `Last ${dateRange} days`,
      },
    };
  }

  // Track which sessions reached each stage
  const stageReached: Map<string, Set<string>> = new Map();
  const stagePages: Map<string, Map<string, number>> = new Map(); // stage -> url -> count
  const stageDurations: Map<string, number[]> = new Map(); // stage -> durations[]

  // Initialize maps for all stages
  for (const stageName of FUNNEL_STAGES) {
    stageReached.set(stageName, new Set());
    stagePages.set(stageName, new Map());
    stageDurations.set(stageName, []);
  }

  // Analyze each session
  for (const session of filteredSessions) {
    // All sessions reach Entry
    stageReached.get('Entry')!.add(session.sessionId);
    if (session.entryPage) {
      const entryPages = stagePages.get('Entry')!;
      entryPages.set(session.entryPage, (entryPages.get(session.entryPage) || 0) + 1);
    }

    // Check which stages each session reached based on journey path
    const reachedStages = identifySessionStages(session);

    for (const stage of reachedStages) {
      stageReached.get(stage)!.add(session.sessionId);

      // Track pages visited in this stage
      const pagesInStage = getPagesForStage(session.journeyPath, stage);
      const stagePageMap = stagePages.get(stage)!;
      for (const page of pagesInStage) {
        stagePageMap.set(page, (stagePageMap.get(page) || 0) + 1);
      }

      // Track duration (approximate by dividing total session duration by stages reached)
      if (session.duration) {
        stageDurations.get(stage)!.push(session.duration / reachedStages.length);
      }
    }
  }

  // Build funnel stages with metrics
  const stages: FunnelStage[] = [];
  let previousCount = totalSessions;

  for (let i = 0; i < FUNNEL_STAGES.length; i++) {
    const stageName = FUNNEL_STAGES[i];
    const count = stageReached.get(stageName)!.size;
    const percentage = totalSessions > 0 ? (count / totalSessions) * 100 : 0;

    // Calculate drop-off rate from previous stage
    const dropOffRate = i > 0 ? ((previousCount - count) / previousCount) * 100 : undefined;

    // Calculate conversion rate to next stage
    const nextCount = i < FUNNEL_STAGES.length - 1 ? stageReached.get(FUNNEL_STAGES[i + 1])!.size : undefined;
    const conversionRate = nextCount !== undefined && count > 0 ? (nextCount / count) * 100 : undefined;

    // Calculate average time spent in stage
    const durations = stageDurations.get(stageName)!;
    const avgTimeSpent = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : undefined;

    // Get top pages for this stage
    const pageMap = stagePages.get(stageName)!;
    const topPages: StagePage[] = Array.from(pageMap.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 pages

    stages.push({
      name: stageName,
      count,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      dropOffRate: dropOffRate !== undefined ? Math.round(dropOffRate * 10) / 10 : undefined,
      conversionRate: conversionRate !== undefined ? Math.round(conversionRate * 10) / 10 : undefined,
      avgTimeSpent: avgTimeSpent !== undefined ? Math.round(avgTimeSpent) : undefined,
      topPages: topPages.length > 0 ? topPages : undefined,
    });

    previousCount = count;
  }

  // Calculate overall conversion (Entry to Purchase)
  const purchaseCount = stageReached.get('Purchase')!.size;
  const overallConversion = totalSessions > 0 ? (purchaseCount / totalSessions) * 100 : 0;

  return {
    stages,
    totalSessions,
    overallConversion: Math.round(overallConversion * 10) / 10,
    journeyType,
    dateRange: {
      start: subDays(new Date(), dateRange),
      end: new Date(),
      label: `Last ${dateRange} days`,
    },
  };
}

/**
 * Identify which funnel stages a session reached
 *
 * Analyzes session's journey path to determine which stages were visited
 *
 * @param session - Session record
 * @returns Array of stage names reached
 */
function identifySessionStages(session: Session): string[] {
  const stages: string[] = ['Entry']; // All sessions reach Entry

  const journeyPath = session.journeyPath;

  // Check for Product View
  if (journeyPath.some((url) => isProductPage(url))) {
    stages.push('Product View');
  }

  // Check for Cart
  if (journeyPath.some((url) => isCartPage(url))) {
    stages.push('Cart');
  }

  // Check for Checkout
  if (journeyPath.some((url) => isCheckoutPage(url))) {
    stages.push('Checkout');
  }

  // Check for Purchase (conversion)
  if (session.converted) {
    stages.push('Purchase');
  }

  return stages;
}

/**
 * Get pages that belong to a specific funnel stage
 *
 * @param journeyPath - Array of page URLs from session
 * @param stage - Funnel stage name
 * @returns Array of URLs for that stage
 */
function getPagesForStage(journeyPath: string[], stage: string): string[] {
  switch (stage) {
    case 'Entry':
      return journeyPath.length > 0 ? [journeyPath[0]] : [];
    case 'Product View':
      return journeyPath.filter(isProductPage);
    case 'Cart':
      return journeyPath.filter(isCartPage);
    case 'Checkout':
      return journeyPath.filter(isCheckoutPage);
    case 'Purchase':
      return journeyPath.filter(isPurchasePage);
    default:
      return [];
  }
}

/**
 * Check if URL is a product page
 */
function isProductPage(url: string): boolean {
  const urlLower = url.toLowerCase();
  return (
    urlLower.includes('/product') ||
    urlLower.includes('/item') ||
    urlLower.includes('/products/') ||
    !!urlLower.match(/\/p\/\w+/)
  );
}

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
 * Check if URL is a purchase confirmation page
 */
function isPurchasePage(url: string): boolean {
  const urlLower = url.toLowerCase();
  return (
    urlLower.includes('/confirmation') ||
    urlLower.includes('/thank') ||
    urlLower.includes('/success') ||
    urlLower.includes('/order-complete')
  );
}

/**
 * Detect journey type from session entry page
 *
 * @param session - Session record
 * @returns Journey type classification
 */
export function detectJourneyType(session: Session): JourneyType {
  const entryPage = session.entryPage.toLowerCase();

  // Homepage visitors
  if (entryPage === '/' || entryPage === '' || entryPage.includes('/home')) {
    return 'homepage';
  }

  // Search visitors
  if (entryPage.includes('/search') || entryPage.includes('/collections')) {
    return 'search';
  }

  // Direct-to-product visitors
  if (isProductPage(entryPage)) {
    return 'direct-to-product';
  }

  return 'other';
}

/**
 * Calculate journey type statistics
 *
 * Counts sessions by journey type and returns statistics
 *
 * @param sessions - Array of session records
 * @returns Array of journey type statistics
 */
export function calculateJourneyTypeStats(sessions: Session[]): JourneyTypeStats[] {
  const typeCounts = new Map<JourneyType, number>();

  // Initialize all types
  typeCounts.set('all', sessions.length);
  typeCounts.set('homepage', 0);
  typeCounts.set('search', 0);
  typeCounts.set('direct-to-product', 0);
  typeCounts.set('other', 0);

  // Count each journey type
  for (const session of sessions) {
    const type = detectJourneyType(session);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  // Build statistics array
  const stats: JourneyTypeStats[] = [];
  for (const [type, count] of typeCounts.entries()) {
    const percentage = sessions.length > 0 ? (count / sessions.length) * 100 : 0;
    stats.push({
      type,
      label: JOURNEY_TYPE_LABELS[type],
      count,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  return stats;
}

/**
 * Generate plain-language insights from funnel data
 *
 * Identifies biggest drop-off point and best-performing stage
 *
 * @param funnelData - Calculated funnel data
 * @returns Insight object with primary and secondary messages
 */
export function generateInsight(funnelData: FunnelData): FunnelInsight {
  // Find stage with biggest drop-off
  let maxDropOff = 0;
  let dropOffStage = '';

  for (const stage of funnelData.stages) {
    if (stage.dropOffRate && stage.dropOffRate > maxDropOff) {
      maxDropOff = stage.dropOffRate;
      dropOffStage = stage.name;
    }
  }

  // Find stage with best conversion rate
  let maxConversion = 0;
  let bestStage = '';

  for (const stage of funnelData.stages) {
    if (stage.conversionRate && stage.conversionRate > maxConversion) {
      maxConversion = stage.conversionRate;
      bestStage = stage.name;
    }
  }

  // Handle empty state
  if (funnelData.totalSessions === 0) {
    return {
      primary: 'No data yet. Start collecting sessions to see journey insights.',
    };
  }

  // Generate primary insight
  const primary =
    maxDropOff > 0
      ? `Your biggest opportunity: ${maxDropOff.toFixed(1)}% abandon at ${dropOffStage}`
      : 'Great! No significant drop-offs detected in your funnel.';

  // Generate secondary insight
  const secondary =
    maxConversion > 0 && bestStage
      ? `Strong performance: ${maxConversion.toFixed(1)}% convert from ${bestStage} to next stage`
      : undefined;

  return {
    primary,
    secondary,
    biggestDropOffStage: dropOffStage || undefined,
    biggestDropOffRate: maxDropOff > 0 ? maxDropOff : undefined,
    bestPerformingStage: bestStage || undefined,
    bestConversionRate: maxConversion > 0 ? maxConversion : undefined,
  };
}
