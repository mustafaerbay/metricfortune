import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecommendationsLoading() {
  return (
    <div className="space-y-6">
      {/* Filter Bar Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="ml-auto h-10 w-24" />
      </div>

      {/* Card Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="min-w-[360px] overflow-hidden">
            <CardContent className="p-6">
              {/* Icon and Badges */}
              <div className="mb-4 flex items-start justify-between">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-6 w-20" />
              </div>

              {/* Title */}
              <Skeleton className="mb-2 h-6 w-full" />
              <Skeleton className="mb-4 h-6 w-3/4" />

              {/* Description */}
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-2/3" />

              {/* Peer Proof Footer */}
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
