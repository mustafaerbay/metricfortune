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
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>

          {/* Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Problem Section */}
              <div>
                <Skeleton className="mb-3 h-6 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
              </div>

              {/* Solution Section */}
              <div>
                <Skeleton className="mb-3 h-5 w-20" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-10/12" />
                </div>
              </div>

              {/* Proof Section */}
              <div>
                <Skeleton className="mb-3 h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-8 w-full" />
              </div>
            </div>

            {/* Journey Snippet */}
            <div className="lg:col-span-1">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
            <Skeleton className="h-10 w-full sm:w-36" />
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
