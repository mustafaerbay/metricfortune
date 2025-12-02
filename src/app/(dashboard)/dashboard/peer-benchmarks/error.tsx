'use client';

/**
 * Error Boundary for Peer Benchmarks Page
 * Story 2.5: Peer Benchmarks Tab
 *
 * User-friendly error display with retry button
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console with context
    console.error('Peer Benchmarks Error:', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString()
    });
  }, [error]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Peer Benchmarks</h1>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Unable to load peer benchmarks
            </h2>
            <p className="text-sm text-red-800 mb-4">
              We encountered an error while loading your peer comparison data. This might be a
              temporary issue.
            </p>
            <Button
              onClick={reset}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
