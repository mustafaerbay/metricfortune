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
    console.error("Recommendation detail error:", {
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
      <Card className="border-2 border-red-200">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#1f2937]">
              Unable to Load Recommendation Details
            </h2>
            <p className="mb-6 max-w-md text-[#6b7280]">
              We encountered an error while loading this recommendation. This
              might be a temporary issue.
            </p>
            <div className="flex gap-3">
              <Button onClick={reset} variant="default">
                Try Again
              </Button>
              <Link href="/dashboard/recommendations">
                <Button variant="outline">Back to Recommendations</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
