'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessCelebrationProps {
  recommendationId: string;
  metric: string;
  improvement: number;
}

/**
 * Success celebration component for positive implementation results
 * Shows once per recommendation per session, dismissible via localStorage
 */
export function SuccessCelebration({
  recommendationId,
  metric,
  improvement,
}: SuccessCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if celebration was already shown for this recommendation
    const storageKey = `celebration-${recommendationId}`;
    const wasShown = localStorage.getItem(storageKey);

    if (!wasShown) {
      // Show celebration after a brief delay
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [recommendationId]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      // Remember dismissal in localStorage for cross-session persistence
      localStorage.setItem(`celebration-${recommendationId}`, 'true');
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-labelledby="celebration-title"
      aria-describedby="celebration-description"
    >
      {/* Celebration Card */}
      <div
        className={`relative max-w-md rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white p-8 shadow-2xl transition-all duration-500 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 rounded-full p-0 hover:bg-purple-100"
          onClick={handleDismiss}
          aria-label="Close celebration"
        >
          <X className="h-4 w-4 text-gray-600" />
        </Button>

        {/* Sparkle Animation */}
        <div className="mb-4 flex justify-center">
          <div className="relative">
            {/* Main Icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>

            {/* Animated Sparkles */}
            <Sparkles className="absolute -right-2 -top-2 h-6 w-6 animate-pulse text-yellow-400" />
            <Sparkles className="absolute -bottom-1 -left-2 h-5 w-5 animate-pulse text-purple-400" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>

        {/* Title */}
        <h2
          id="celebration-title"
          className="mb-2 text-center text-2xl font-bold text-purple-900"
        >
          🎉 Great Work!
        </h2>

        {/* Success Message */}
        <p
          id="celebration-description"
          className="mb-6 text-center text-base text-gray-700"
        >
          Your changes improved <span className="font-semibold text-purple-700">{metric}</span> by{' '}
          <span className="text-xl font-bold text-green-600">
            {improvement.toFixed(1)}%
          </span>
          !
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleDismiss}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            Awesome!
          </Button>

          {/* Optional: Share button (placeholder for future social sharing) */}
          <Button
            variant="outline"
            className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
            disabled
            title="Share feature coming soon"
          >
            Share Success
          </Button>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Keep up the excellent work! 🚀
        </p>
      </div>
    </div>
  );
}
