'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import type { DailyMetric } from '@/types/implementation';
import { getDailyMetrics } from '@/actions/implementation-tracking';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricTrendChartProps {
  implementedAt: Date;
  siteId: string;
}

/**
 * Custom tooltip for chart hover
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
      <p className="mb-2 text-sm font-medium text-gray-900">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold text-gray-900">
              {entry.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricTrendChart({ implementedAt, siteId }: MetricTrendChartProps) {
  const [data, setData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const metrics = await getDailyMetrics(siteId, implementedAt);
        setData(metrics);
      } catch (err) {
        console.error('Failed to fetch daily metrics:', err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [siteId, implementedAt]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
        <p>
          <span className="font-semibold">Unable to load metric trends.</span>{' '}
          This may be a temporary issue — please try refreshing the page. If the problem
          persists, check your internet connection or contact support.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 rounded border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100"
          aria-label="Retry loading metric trend chart"
        >
          Refresh page
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
        No data available for chart
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map(metric => ({
    date: format(metric.date, 'MMM dd'),
    fullDate: format(metric.date, 'MMM dd, yyyy'),
    conversionRate: metric.conversionRate,
    cartAbandonmentRate: metric.cartAbandonmentRate,
    sessionCount: metric.sessionCount,
  }));

  // Find the implementation date index for reference line
  const implementedDateStr = format(implementedAt, 'MMM dd');

  return (
    <div className="w-full" role="img" aria-label="Metric trends chart showing conversion rate and cart abandonment over 14 days">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6b7280' }}
          />

          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#6b7280' }}
            label={{
              value: 'Rate (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '12px', fill: '#6b7280' },
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: '14px' }}
            iconType="line"
          />

          {/* Implementation date reference line */}
          <ReferenceLine
            x={implementedDateStr}
            stroke="#7c3aed"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Implemented',
              position: 'top',
              fill: '#7c3aed',
              fontSize: 12,
              fontWeight: 600,
            }}
          />

          {/* Conversion Rate Line */}
          <Line
            type="monotone"
            dataKey="conversionRate"
            name="Conversion Rate"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={{ r: 4, fill: '#7c3aed' }}
            activeDot={{ r: 6 }}
          />

          {/* Cart Abandonment Line */}
          <Line
            type="monotone"
            dataKey="cartAbandonmentRate"
            name="Cart Abandonment"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ r: 4, fill: '#f59e0b' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Chart accessibility description */}
      <p className="sr-only">
        Line chart showing daily metrics for 14 days: 7 days before and 7 days after implementation.
        Two lines represent conversion rate (purple) and cart abandonment rate (amber).
        A vertical dashed line indicates the implementation date.
      </p>
    </div>
  );
}
