"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md border-2 border-[#ef4444]">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ef4444]">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-[#1f2937]">
            Something went wrong
          </h2>
          <p className="mb-6 text-sm text-[#6b7280]">
            We encountered an error loading your dashboard. Please try again.
          </p>
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
