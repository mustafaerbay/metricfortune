/**
 * Loading State for Peer Benchmarks Page
 * Story 2.5: Peer Benchmarks Tab
 *
 * Skeleton UI with shimmer effect showing table structure
 */

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Peer group info skeleton */}
      <Skeleton className="h-5 w-80 mb-6" />

      {/* Metric cards skeleton (4 metrics) */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            {/* Metric header */}
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-7 w-24" />
            </div>

            {/* Bar chart skeletons */}
            <div className="space-y-3 mb-4">
              {/* User bar */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="flex-1 h-10 rounded-lg" />
              </div>

              {/* Peer bar */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="flex-1 h-10 rounded-lg" />
              </div>
            </div>

            {/* Explanation skeleton */}
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-3/4" />
          </Card>
        ))}
      </div>
    </div>
  );
}
