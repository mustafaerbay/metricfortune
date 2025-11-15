'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * Error State for Journey Insights Page
 *
 * Shows user-friendly error message with retry button
 * Logs error to console with context
 * AC#1: Error handling for Journey Insights tab
 */
export default function JourneyInsightsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console with context
    console.error('[Journey Insights Error]', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-xl font-semibold text-red-900">
            Unable to Load Journey Insights
          </h2>
          <p className="mt-2 text-sm text-red-700">
            We encountered an error while loading your journey data. This could be due to a temporary issue.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-red-600 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <Button
            onClick={reset}
            className="mt-6"
            variant="default"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
