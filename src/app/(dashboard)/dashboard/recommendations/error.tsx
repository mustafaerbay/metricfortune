"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function RecommendationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console with context
    console.error("Recommendations page error:", {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md border-2 border-red-200 bg-red-50">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Unable to load recommendations
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            We encountered an error while loading your recommendations. Please
            try again.
          </p>
          <Button onClick={reset} className="w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
