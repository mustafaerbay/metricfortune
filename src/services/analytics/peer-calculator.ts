/**
 * Peer Benchmarks Calculation Service
 * Story 2.5: Peer Benchmarks Tab
 *
 * Pure functions for calculating user metrics, peer metrics, and percentile rankings.
 * No database queries - all calculations are performed on provided data.
 */

import { Session, Business } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { MetricData, MetricComparison, Percentile, Performance, PeerGroupInfo } from '@/types/peer';

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
 * Calculate key metrics from user's session data
 *
 * @param sessions Array of session records for the user's site
 * @returns Calculated metrics (conversion rate, AOV, cart abandonment, bounce rate)
 */
export function calculateUserMetrics(sessions: Session[]): MetricData {
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return {
      conversionRate: 0,
      avgOrderValue: 0,
      cartAbandonmentRate: 0,
      bounceRate: 0
    };
  }

  const convertedSessions = sessions.filter(s => s.converted).length;
  const bouncedSessions = sessions.filter(s => s.bounced).length;

  // Detect cart and checkout from journey paths
  const cartSessions = sessions.filter(s =>
    s.journeyPath.some(url => isCartPage(url))
  ).length;

  const checkoutSessions = sessions.filter(s =>
    s.journeyPath.some(url => isCheckoutPage(url))
  ).length;

  // For AOV calculation, we would need to query ShopifyOrders via Business relationship
  // This is simplified for MVP - AOV calculation can be enhanced in future iterations
  // For now, setting to 0 as we don't have direct session-to-order linking
  const avgOrderValue = 0;

  return {
    conversionRate: (convertedSessions / totalSessions) * 100,
    avgOrderValue,
    cartAbandonmentRate: cartSessions > 0 ? ((cartSessions - checkoutSessions) / cartSessions) * 100 : 0,
    bounceRate: (bouncedSessions / totalSessions) * 100
  };
}

/**
 * Calculate aggregate peer metrics across all businesses in peer group
 *
 * @param peerBusinesses Array of businesses in the peer group
 * @returns Average metrics across all peer businesses
 */
export async function calculatePeerMetrics(peerBusinesses: Business[]): Promise<MetricData> {
  if (peerBusinesses.length === 0) {
    return {
      conversionRate: 0,
      avgOrderValue: 0,
      cartAbandonmentRate: 0,
      bounceRate: 0
    };
  }

  // Fetch sessions for each peer business and calculate their metrics
  const allPeerMetrics = await Promise.all(
    peerBusinesses.map(async (peer) => {
      const sessions = await prisma.session.findMany({
        where: { siteId: peer.siteId },
        orderBy: { createdAt: 'desc' },
        take: 1000 // Last 1000 sessions for recent performance
      });
      return calculateUserMetrics(sessions);
    })
  );

  // Calculate averages across all peer businesses
  const average = (values: number[]): number =>
    values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

  return {
    conversionRate: average(allPeerMetrics.map(m => m.conversionRate)),
    avgOrderValue: average(allPeerMetrics.map(m => m.avgOrderValue)),
    cartAbandonmentRate: average(allPeerMetrics.map(m => m.cartAbandonmentRate)),
    bounceRate: average(allPeerMetrics.map(m => m.bounceRate))
  };
}

/**
 * Calculate percentile ranking for a user's metric value among peers
 *
 * @param userValue User's metric value
 * @param peerValues Array of peer metric values
 * @param higherIsBetter Whether higher values indicate better performance (default: true)
 * @returns Categorical percentile and exact percentile value
 */
export function calculatePercentile(
  userValue: number,
  peerValues: number[],
  higherIsBetter: boolean = true
): { percentile: Percentile; percentileValue: number } {
  if (peerValues.length === 0) {
    return { percentile: 'median', percentileValue: 50 };
  }

  // Sort peer values
  const sorted = [...peerValues].sort((a, b) => a - b);

  // Find position of user value in sorted array
  let position: number;
  if (higherIsBetter) {
    // Count how many peers have lower values
    position = sorted.filter(v => v < userValue).length;
  } else {
    // For "lower is better" metrics (e.g., bounce rate), count how many peers have higher values
    position = sorted.filter(v => v > userValue).length;
  }

  const percentileValue = Math.round((position / sorted.length) * 100);

  // Categorize percentile
  let percentile: Percentile;
  if (percentileValue >= 75) {
    percentile = 'top-25';
  } else if (percentileValue >= 25) {
    percentile = 'median';
  } else {
    percentile = 'bottom-25';
  }

  return { percentile, percentileValue };
}

/**
 * Generate contextual explanation for a metric comparison
 *
 * @param metricName Name of the metric (e.g., "conversion rate")
 * @param userValue User's metric value
 * @param peerAverage Peer group average
 * @param percentileValue Exact percentile (0-100)
 * @returns Human-readable explanation string
 */
export function generateExplanation(
  metricName: string,
  userValue: number,
  peerAverage: number,
  percentileValue: number
): string {
  const performance: Performance = userValue >= peerAverage ? 'above' : 'below';

  if (performance === 'above') {
    return `Your ${userValue.toFixed(1)}${metricName.includes('value') ? '' : '%'} ${metricName} is in the top ${100 - percentileValue}% of peers`;
  } else {
    return `Your ${userValue.toFixed(1)}${metricName.includes('value') ? '' : '%'} ${metricName} is in the bottom ${percentileValue}% of peers`;
  }
}

/**
 * Compare user metrics with peer metrics and generate detailed comparisons
 *
 * @param userMetrics User's calculated metrics
 * @param peerMetrics Peer group average metrics
 * @param peerBusinesses Array of peer businesses (for percentile calculation)
 * @returns Array of detailed metric comparisons
 */
export async function compareMetrics(
  userMetrics: MetricData,
  peerMetrics: MetricData,
  peerBusinesses: Business[]
): Promise<MetricComparison[]> {
  // Fetch all peer metric values for percentile calculation
  const allPeerMetrics = await Promise.all(
    peerBusinesses.map(async (peer) => {
      const sessions = await prisma.session.findMany({
        where: { siteId: peer.siteId },
        orderBy: { createdAt: 'desc' },
        take: 1000
      });
      return calculateUserMetrics(sessions);
    })
  );

  const metrics: Array<{
    key: keyof MetricData;
    name: string;
    higherIsBetter: boolean;
  }> = [
    { key: 'conversionRate', name: 'conversion rate', higherIsBetter: true },
    // AOV removed temporarily - requires session-to-order linking not yet implemented
    // { key: 'avgOrderValue', name: 'average order value', higherIsBetter: true },
    { key: 'cartAbandonmentRate', name: 'cart abandonment rate', higherIsBetter: false },
    { key: 'bounceRate', name: 'bounce rate', higherIsBetter: false }
  ];

  return metrics.map(({ key, name, higherIsBetter }) => {
    const userValue = userMetrics[key];
    const peerAverage = peerMetrics[key];
    const peerValues = allPeerMetrics.map(m => m[key]);

    const { percentile, percentileValue } = calculatePercentile(
      userValue,
      peerValues,
      higherIsBetter
    );

    const performance: Performance =
      userValue > peerAverage ? 'above' :
      userValue < peerAverage ? 'below' : 'at';

    const explanation = generateExplanation(name, userValue, peerAverage, percentileValue);

    return {
      metric: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
      userValue,
      peerAverage,
      percentile,
      percentileValue,
      performance,
      explanation
    };
  });
}

/**
 * Generate peer group composition description
 *
 * @param peerCount Number of businesses in peer group
 * @param industry Industry name
 * @param revenueRange Revenue range description
 * @returns Formatted description string
 */
export function generatePeerGroupDescription(
  peerCount: number,
  industry: string,
  revenueRange: string
): string {
  return `Compared to ${peerCount} ${industry} businesses, ${revenueRange} revenue`;
}
