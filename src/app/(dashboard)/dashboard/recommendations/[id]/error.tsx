"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function RecommendationDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console with context
    console.error("Recommendation detail page error:", {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/recommendations">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Recommendations
        </Button>
      </Link>

      {/* Error Card */}
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-2 border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Unable to load recommendation details
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              We encountered an error while loading this recommendation. Please
              try again or return to the recommendations list.
            </p>
            <div className="flex gap-3">
              <Button onClick={reset} variant="outline" className="flex-1">
                Retry
              </Button>
              <Link href="/dashboard/recommendations" className="flex-1">
                <Button className="w-full">Back to List</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
