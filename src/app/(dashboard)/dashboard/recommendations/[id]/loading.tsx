import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecommendationDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back Button Skeleton */}
      <Skeleton className="h-10 w-48" />

      {/* Main Card Skeleton */}
      <Card className="border-2 border-[#e9d5ff]">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="mb-2 h-10 w-3/4" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>

          {/* Problem Statement */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-6 w-48" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Confidence */}
          <div className="mb-6">
            <Skeleton className="mb-3 h-6 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>

          {/* Expected Impact */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-6 w-40" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Action Steps */}
          <div className="mb-6">
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
