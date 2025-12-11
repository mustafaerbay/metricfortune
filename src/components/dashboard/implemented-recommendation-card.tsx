'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import type { Recommendation } from '@prisma/client';
import type { MetricsData, ChangeMetric, ImplementationStatus } from '@/types/implementation';
import { MetricTrendChart } from './metric-trend-chart';
import { NotesEditor } from './notes-editor';
import { SuccessCelebration } from './success-celebration';

interface ImplementedRecommendationCardProps {
  recommendation: Recommendation & {
    business: {
      siteId: string;
    };
  };
  beforeMetrics: MetricsData;
  afterMetrics: MetricsData;
  conversionChange: ChangeMetric;
  abandonmentChange: ChangeMetric;
  status: ImplementationStatus;
}

/**
 * Get badge variant based on status
 */
function getStatusVariant(status: ImplementationStatus): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'Positive trend':
      return 'default';
    case 'Negative trend':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Get status badge color classes
 */
function getStatusColor(status: ImplementationStatus): string {
  switch (status) {
    case 'Positive trend':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Negative trend':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Too early to measure':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Metric row component for before/after display
 */
interface MetricRowProps {
  label: string;
  value: string;
  change?: ChangeMetric;
  ariaLabel?: string;
}

function MetricRow({ label, value, change, ariaLabel }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-gray-900">{value}</span>
        {change && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              change.color === 'green'
                ? 'text-green-600'
                : change.color === 'red'
                ? 'text-red-600'
                : 'text-gray-600'
            }`}
            aria-label={ariaLabel}
          >
            {change.direction === 'positive' && <ArrowUp className="h-4 w-4" />}
            {change.direction === 'negative' && <ArrowDown className="h-4 w-4" />}
            {change.direction === 'neutral' && <Minus className="h-4 w-4" />}
            <span>{change.formatted}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ImplementedRecommendationCard({
  recommendation,
  beforeMetrics,
  afterMetrics,
  conversionChange,
  abandonmentChange,
  status,
}: ImplementedRecommendationCardProps) {
  if (!recommendation.implementedAt) {
    return null;
  }

  // Check if this is a significant improvement worthy of celebration
  const significantImprovement =
    conversionChange.value >= 10 || Math.abs(abandonmentChange.value) >= 10;

  return (
    <>
      {/* Success celebration for significant improvements */}
      {significantImprovement && status === 'Positive trend' && (
        <SuccessCelebration
          recommendationId={recommendation.id}
          metric={conversionChange.value > Math.abs(abandonmentChange.value) ? 'conversion rate' : 'cart abandonment'}
          improvement={Math.max(conversionChange.value, Math.abs(abandonmentChange.value))}
        />
      )}

      <Card className="border-2 border-purple-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="border-b border-gray-100 pb-4">
          {/* Header: Title, Date, Status */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-semibold text-gray-900">
                {recommendation.title}
              </h3>
              <p className="text-sm text-gray-600">
                Implemented {formatDistanceToNow(recommendation.implementedAt, { addSuffix: true })}
              </p>
            </div>
            <Badge className={`border ${getStatusColor(status)}`}>
              {status === 'Positive trend' && <TrendingUp className="mr-1 h-4 w-4" />}
              {status === 'Negative trend' && <TrendingDown className="mr-1 h-4 w-4" />}
              {status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Metrics Comparison: Before vs After */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Before Metrics */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-700">
                Before (7 days)
              </h4>
              <div className="space-y-3">
                <MetricRow
                  label="Conversion Rate"
                  value={`${beforeMetrics.conversionRate.toFixed(1)}%`}
                />
                <MetricRow
                  label="Cart Abandonment"
                  value={`${beforeMetrics.cartAbandonmentRate.toFixed(1)}%`}
                />
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-xs text-gray-500">
                    {beforeMetrics.sessionCount} sessions
                    {' · '}
                    <span className="capitalize">{beforeMetrics.confidence}</span> confidence
                  </p>
                </div>
              </div>
            </div>

            {/* After Metrics */}
            <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
              <h4 className="mb-3 text-sm font-medium text-purple-900">
                After (7 days)
              </h4>
              <div className="space-y-3">
                <MetricRow
                  label="Conversion Rate"
                  value={`${afterMetrics.conversionRate.toFixed(1)}%`}
                  change={conversionChange}
                  ariaLabel={`Conversion rate ${conversionChange.direction === 'positive' ? 'improved' : conversionChange.direction === 'negative' ? 'declined' : 'unchanged'} by ${Math.abs(conversionChange.value).toFixed(1)}%`}
                />
                <MetricRow
                  label="Cart Abandonment"
                  value={`${afterMetrics.cartAbandonmentRate.toFixed(1)}%`}
                  change={abandonmentChange}
                  ariaLabel={`Cart abandonment ${Math.abs(abandonmentChange.value) >= 5 && abandonmentChange.value < 0 ? 'improved' : abandonmentChange.value >= 5 ? 'worsened' : 'unchanged'} by ${Math.abs(abandonmentChange.value).toFixed(1)}%`}
                />
                <div className="border-t border-purple-300 pt-2">
                  <p className="text-xs text-purple-700">
                    {afterMetrics.sessionCount} sessions
                    {' · '}
                    <span className="capitalize">{afterMetrics.confidence}</span> confidence
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Low confidence warning */}
          {(beforeMetrics.confidence === 'low' || afterMetrics.confidence === 'low') && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                ⚠️ Insufficient data - Results may not be statistically significant. Collect more sessions for higher confidence.
              </p>
            </div>
          )}

          {/* Metric Trend Chart */}
          {status !== 'Too early to measure' && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-4 text-sm font-medium text-gray-700">
                Metric Trends (14 days)
              </h4>
              <MetricTrendChart
                implementedAt={recommendation.implementedAt}
                siteId={recommendation.business.siteId}
              />
            </div>
          )}

          {/* Implementation Notes */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="mb-3 text-sm font-medium text-gray-700">
              Implementation Notes
            </h4>
            <NotesEditor
              recommendationId={recommendation.id}
              initialNotes={recommendation.implementationNotes || ''}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
