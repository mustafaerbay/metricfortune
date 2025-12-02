'use client';

/**
 * Peer Comparison Table Component
 * Story 2.5: Peer Benchmarks Tab
 *
 * Displays horizontal bar chart comparisons between user metrics and peer averages
 * with color-coded performance indicators and percentile badges.
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import type { MetricComparison, PeerGroupInfo } from '@/types/peer';
import { cn } from '@/lib/utils';

interface PeerComparisonTableProps {
  data: MetricComparison[];
  peerGroupInfo: PeerGroupInfo;
}

/**
 * Get badge variant based on performance level
 */
function getPerformanceBadgeVariant(
  performance: 'above' | 'at' | 'below'
): 'success' | 'secondary' | 'warning' {
  switch (performance) {
    case 'above':
      return 'success'; // Green styling
    case 'at':
      return 'secondary'; // Orange styling
    case 'below':
      return 'warning'; // Amber styling
  }
}

/**
 * Get percentile badge label
 */
function getPercentileLabel(percentile: 'top-25' | 'median' | 'bottom-25'): string {
  switch (percentile) {
    case 'top-25':
      return 'Top 25%';
    case 'median':
      return 'Median';
    case 'bottom-25':
      return 'Bottom 25%';
  }
}

/**
 * Get bar color class based on performance
 */
function getBarColor(performance: 'above' | 'at' | 'below'): string {
  switch (performance) {
    case 'above':
      return 'bg-green-500'; // Above average - green
    case 'at':
      return 'bg-gray-400'; // At average - gray
    case 'below':
      return 'bg-amber-500'; // Below average - amber/yellow
  }
}

/**
 * Format metric value with appropriate units
 */
function formatMetricValue(value: number, metric: string): string {
  if (metric.toLowerCase().includes('value')) {
    // Currency format for AOV
    return `$${value.toFixed(2)}`;
  }
  // Percentage format for rates
  return `${value.toFixed(1)}%`;
}

export function PeerComparisonTable({ data, peerGroupInfo }: PeerComparisonTableProps) {
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Peer group composition header with tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block text-sm text-gray-600 cursor-help border-b border-dashed border-gray-400">
              <p>{peerGroupInfo.description}</p>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">Peer Group Details</p>
              <p className="text-xs">Industry: {peerGroupInfo.industry}</p>
              <p className="text-xs">Revenue Range: {peerGroupInfo.revenueRange}</p>
              <p className="text-xs">Total Businesses: {peerGroupInfo.count}</p>
              <p className="text-xs text-gray-500 mt-2">
                Your metrics are compared against businesses with similar characteristics
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Metric comparison cards */}
      <div className="space-y-4">
        {data.map((metric) => (
          <Card
            key={metric.metric}
            className="p-4 sm:p-6 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2"
            tabIndex={0}
            role="article"
            aria-label={`${metric.metric} comparison: ${formatMetricValue(metric.userValue, metric.metric)} (${getPercentileLabel(metric.percentile)})`}
          >
            {/* Metric header with badge - responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{metric.metric}</h3>
              <Badge
                variant={getPerformanceBadgeVariant(metric.performance)}
                className="px-3 py-1 self-start sm:self-auto"
              >
                {getPercentileLabel(metric.percentile)}
              </Badge>
            </div>

            {/* Horizontal comparison bars - responsive layout */}
            <div className="space-y-3 mb-4">
              {/* User's bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium w-full sm:w-24 text-gray-700">Your Store</span>
                <div className="flex-1 relative">
                  <div className="h-10 bg-gray-100 rounded-lg relative overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-lg transition-all duration-300 ease-out',
                        getBarColor(metric.performance)
                      )}
                      style={{
                        width: `${Math.min(
                          metric.metric.toLowerCase().includes('value')
                            ? (metric.userValue / Math.max(metric.userValue, metric.peerAverage)) * 100
                            : Math.min(metric.userValue, 100),
                          100
                        )}%`
                      }}
                      aria-label={`Your ${metric.metric}: ${formatMetricValue(metric.userValue, metric.metric)}`}
                    />
                    <span className="absolute right-3 top-2 text-sm font-semibold text-gray-900">
                      {formatMetricValue(metric.userValue, metric.metric)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Peer average bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium w-full sm:w-24 text-gray-700">Peer Avg</span>
                <div className="flex-1 relative">
                  <div className="h-10 bg-gray-100 rounded-lg relative overflow-hidden">
                    <div
                      className="h-full bg-gray-300 rounded-lg transition-all duration-300 ease-out"
                      style={{
                        width: `${Math.min(
                          metric.metric.toLowerCase().includes('value')
                            ? (metric.peerAverage / Math.max(metric.userValue, metric.peerAverage)) * 100
                            : Math.min(metric.peerAverage, 100),
                          100
                        )}%`
                      }}
                      aria-label={`Peer average ${metric.metric}: ${formatMetricValue(metric.peerAverage, metric.metric)}`}
                    />
                    <span className="absolute right-3 top-2 text-sm font-semibold text-gray-900">
                      {formatMetricValue(metric.peerAverage, metric.metric)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual explanation */}
            <p className="text-sm text-gray-600 mb-3">{metric.explanation}</p>

            {/* Link to recommendations for underperforming metrics */}
            {metric.performance === 'below' && (
              <Link
                href={`/dashboard/recommendations?metric=${encodeURIComponent(metric.metric.toLowerCase())}`}
                className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
              >
                View recommendations to improve →
                {metric.recommendationCount && metric.recommendationCount > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({metric.recommendationCount} available)
                  </span>
                )}
              </Link>
            )}
          </Card>
        ))}
      </div>

      {/* Accessibility: Hidden table for screen readers */}
      <table className="sr-only" aria-label="Peer benchmark comparison data">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Your Value</th>
            <th scope="col">Peer Average</th>
            <th scope="col">Percentile</th>
          </tr>
        </thead>
        <tbody>
          {data.map((metric) => (
            <tr key={metric.metric}>
              <th scope="row">{metric.metric}</th>
              <td>{formatMetricValue(metric.userValue, metric.metric)}</td>
              <td>{formatMetricValue(metric.peerAverage, metric.metric)}</td>
              <td>{getPercentileLabel(metric.percentile)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TooltipProvider>
  );
}
