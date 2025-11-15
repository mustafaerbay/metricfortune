import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

/**
 * Loading State for Journey Insights Page
 *
 * Shows skeleton funnel diagram with 5 stage placeholders and shimmer effect
 * AC#1: Loading state for Journey Insights tab
 */
export default function JourneyInsightsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      {/* Insight Summary Skeleton */}
      <div className="mb-8 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 p-6">
        <Skeleton className="h-8 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-6 w-full max-w-xl" />
      </div>

      {/* Controls Skeleton */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-full max-w-md" />
      </div>

      {/* Funnel Diagram Skeleton */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Desktop: Horizontal Funnel */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            {[1, 2, 3, 4, 5].map((stage) => (
              <div key={stage} className="flex-1 space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-2/3 mx-auto" />
              </div>
            ))}
          </div>

          {/* Mobile: Vertical Funnel */}
          <div className="lg:hidden space-y-4">
            {[1, 2, 3, 4, 5].map((stage) => (
              <div key={stage} className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Journey Type Stats Skeleton */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((stat) => (
          <Card key={stat} className="p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-12" />
          </Card>
        ))}
      </div>
    </div>
  );
}
