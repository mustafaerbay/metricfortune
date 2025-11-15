'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';
import type { FunnelData, FunnelStage, JourneyTypeStats, JourneyType } from '@/types/journey';
import { DATE_RANGE_OPTIONS, JOURNEY_TYPE_LABELS } from '@/types/journey';
import { cn } from '@/lib/utils';

interface JourneyFunnelProps {
  funnelData: FunnelData;
  journeyTypeStats: JourneyTypeStats[];
  businessName: string;
}

/**
 * JourneyFunnel Component
 *
 * Interactive funnel visualization showing customer journey stages and drop-offs
 *
 * AC#2: Funnel shows key stages: Entry → Product View → Cart → Checkout → Purchase
 * AC#3: Each stage shows: visitor count, drop-off percentage, conversion rate
 * AC#4: Clickable stages reveal detailed breakdown
 * AC#5: Multiple journey types displayed
 * AC#6: Date range selector
 */
export function JourneyFunnel({
  funnelData,
  journeyTypeStats,
  businessName,
}: JourneyFunnelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const currentRange = searchParams.get('range') || '30';
  const currentType = (searchParams.get('type') || 'all') as JourneyType;

  // Handle date range change
  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', value);
    router.push(`?${params.toString()}`);
  };

  // Handle journey type change
  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', value);
    router.push(`?${params.toString()}`);
  };

  // Toggle stage details
  const toggleStageDetails = (stageName: string) => {
    setExpandedStage(expandedStage === stageName ? null : stageName);
  };

  // Get color based on conversion/drop-off rate
  const getStageColor = (stage: FunnelStage) => {
    if (stage.conversionRate === undefined) return 'bg-purple-600'; // Last stage

    if (stage.conversionRate > 50) return 'bg-green-600';
    if (stage.conversionRate > 25) return 'bg-amber-500';
    return 'bg-red-600';
  };

  const getStageTextColor = (stage: FunnelStage) => {
    if (stage.conversionRate === undefined) return 'text-purple-700';

    if (stage.conversionRate > 50) return 'text-green-700';
    if (stage.conversionRate > 25) return 'text-amber-700';
    return 'text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Controls: Date Range & Journey Type */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="date-range" className="text-sm font-medium">
            Date Range:
          </label>
          <Select value={currentRange} onValueChange={handleRangeChange}>
            <SelectTrigger id="date-range" className="w-40">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Journey Type Tabs */}
        <Tabs value={currentType} onValueChange={handleTypeChange} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="direct-to-product">Direct</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Funnel Visualization */}
      <Card className="p-6">
        <h3 className="mb-6 text-lg font-semibold">Customer Journey Funnel</h3>

        {/* Desktop: Horizontal Funnel */}
        <div className="hidden lg:flex items-start justify-between gap-4 mb-8">
          {funnelData.stages.map((stage, index) => (
            <div key={stage.name} className="flex-1 flex flex-col items-center">
              {/* Stage Card */}
              <button
                onClick={() => toggleStageDetails(stage.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleStageDetails(stage.name);
                  }
                }}
                className={cn(
                  'w-full rounded-lg p-4 text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
                  getStageColor(stage)
                )}
                aria-label={`Journey stage: ${stage.name}, ${stage.count} visitors, ${stage.percentage}% of total${stage.conversionRate ? `, ${stage.conversionRate}% conversion` : ''}`}
                aria-expanded={expandedStage === stage.name}
              >
                <div className="text-xs font-medium uppercase opacity-90">
                  Stage {index + 1}
                </div>
                <div className="mt-1 text-sm font-semibold">{stage.name}</div>
                <div className="mt-3 text-3xl font-bold">{stage.count.toLocaleString()}</div>
                <div className="mt-1 text-sm opacity-90">{stage.percentage}% of total</div>

                {stage.conversionRate !== undefined && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    {stage.conversionRate}% convert
                  </div>
                )}

                {stage.dropOffRate !== undefined && stage.dropOffRate > 0 && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm opacity-90">
                    <TrendingDown className="h-4 w-4" />
                    {stage.dropOffRate}% drop
                  </div>
                )}
              </button>

              {/* Arrow to next stage */}
              {index < funnelData.stages.length - 1 && (
                <div className="mt-4 flex items-center text-gray-400">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile: Vertical Funnel */}
        <div className="lg:hidden space-y-3 mb-6">
          {funnelData.stages.map((stage, index) => (
            <div key={stage.name}>
              <button
                onClick={() => toggleStageDetails(stage.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleStageDetails(stage.name);
                  }
                }}
                className={cn(
                  'w-full rounded-lg p-4 text-white transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
                  getStageColor(stage)
                )}
                aria-label={`Journey stage: ${stage.name}, ${stage.count} visitors, ${stage.percentage}% of total${stage.conversionRate ? `, ${stage.conversionRate}% conversion` : ''}`}
                aria-expanded={expandedStage === stage.name}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-xs font-medium uppercase opacity-90">
                      Stage {index + 1}
                    </div>
                    <div className="mt-1 text-lg font-semibold">{stage.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{stage.count.toLocaleString()}</div>
                    <div className="text-xs opacity-90">{stage.percentage}%</div>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  {stage.conversionRate !== undefined && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stage.conversionRate}% convert
                    </span>
                  )}
                  {stage.dropOffRate !== undefined && stage.dropOffRate > 0 && (
                    <span className="flex items-center gap-1 opacity-90">
                      <TrendingDown className="h-3 w-3" />
                      {stage.dropOffRate}% drop
                    </span>
                  )}
                </div>
              </button>

              {/* Arrow to next stage */}
              {index < funnelData.stages.length - 1 && (
                <div className="flex justify-center py-2 text-gray-400">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stage Details (Expanded) */}
        {expandedStage && (
          <div
            className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6 animate-in fade-in slide-in-from-top-4 duration-300"
            role="region"
            aria-label={`Details for ${expandedStage} stage`}
          >
            {(() => {
              const stage = funnelData.stages.find((s) => s.name === expandedStage);
              if (!stage) return null;

              return (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {stage.name} Details
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedStage(null)}
                      aria-label="Close details"
                    >
                      <ChevronUp className="h-4 w-4" />
                      Close
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Visitor Count */}
                    <div className="rounded-lg bg-white p-4">
                      <div className="text-sm font-medium text-gray-600">Total Visitors</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900">
                        {stage.count.toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {stage.percentage}% of all sessions
                      </div>
                    </div>

                    {/* Average Time Spent */}
                    {stage.avgTimeSpent !== undefined && (
                      <div className="rounded-lg bg-white p-4">
                        <div className="text-sm font-medium text-gray-600">
                          Avg. Time Spent
                        </div>
                        <div className="mt-1 text-2xl font-bold text-gray-900">
                          {Math.floor(stage.avgTimeSpent / 60)}m {stage.avgTimeSpent % 60}s
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Per session in this stage
                        </div>
                      </div>
                    )}

                    {/* Conversion Rate */}
                    {stage.conversionRate !== undefined && (
                      <div className="rounded-lg bg-white p-4">
                        <div className="text-sm font-medium text-gray-600">
                          Conversion Rate
                        </div>
                        <div className={cn('mt-1 text-2xl font-bold', getStageTextColor(stage))}>
                          {stage.conversionRate}%
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Continue to next stage
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top Pages */}
                  {stage.topPages && stage.topPages.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold text-gray-700">Top Pages</h5>
                      <div className="mt-2 space-y-2">
                        {stage.topPages.map((page) => (
                          <div
                            key={page.url}
                            className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm"
                          >
                            <span className="truncate text-gray-700" title={page.url}>
                              {page.url}
                            </span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {page.count} visits
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Accessibility: Hidden data table for screen readers */}
        <div className="sr-only">
          <table>
            <caption>Customer Journey Funnel Data</caption>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Visitors</th>
                <th>Percentage</th>
                <th>Conversion Rate</th>
                <th>Drop-off Rate</th>
              </tr>
            </thead>
            <tbody>
              {funnelData.stages.map((stage) => (
                <tr key={stage.name}>
                  <td>{stage.name}</td>
                  <td>{stage.count}</td>
                  <td>{stage.percentage}%</td>
                  <td>{stage.conversionRate !== undefined ? `${stage.conversionRate}%` : 'N/A'}</td>
                  <td>{stage.dropOffRate !== undefined ? `${stage.dropOffRate}%` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Journey Type Statistics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {journeyTypeStats
          .filter((stat) => stat.type !== 'all')
          .map((stat) => (
            <Card
              key={stat.type}
              className={cn(
                'p-4 transition-all duration-200',
                currentType === stat.type
                  ? 'ring-2 ring-purple-600 bg-purple-50'
                  : 'hover:bg-gray-50'
              )}
            >
              <div className="text-sm font-medium text-gray-600">{stat.label}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {stat.count.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-gray-500">{stat.percentage}%</div>
            </Card>
          ))}
      </div>
    </div>
  );
}
