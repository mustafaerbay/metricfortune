"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImpactBadge } from "@/components/dashboard/impact-badge";
import { ConfidenceMeter } from "@/components/dashboard/confidence-meter";
import {
  markRecommendationImplemented,
  planRecommendation,
  dismissRecommendation,
} from "@/actions/recommendations";
import type { Recommendation } from "@prisma/client";

interface RecommendationDetailProps {
  recommendation: Recommendation;
}

export function RecommendationDetail({
  recommendation,
}: RecommendationDetailProps) {
  const router = useRouter();
  const [isImplementModalOpen, setIsImplementModalOpen] = React.useState(false);
  const [implementDate, setImplementDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [implementNotes, setImplementNotes] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleMarkAsPlanned = async () => {
    setIsLoading(true);
    setError(null);

    const result = await planRecommendation(recommendation.id);

    if (result.success) {
      toast.success("Recommendation marked as planned");
      router.push("/dashboard/recommendations");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to mark as planned");
      setError(result.error || null);
      setIsLoading(false);
    }
  };

  const handleMarkAsImplemented = async () => {
    setIsLoading(true);
    setError(null);

    const result = await markRecommendationImplemented(
      recommendation.id,
      new Date(implementDate),
      implementNotes.trim() || undefined
    );

    if (result.success) {
      setIsImplementModalOpen(false);
      toast.success("Recommendation marked as implemented! Tracking results...");
      router.push("/dashboard/recommendations");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to mark as implemented");
      setError(result.error || null);
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!confirm("Are you sure you want to dismiss this recommendation?")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await dismissRecommendation(recommendation.id);

    if (result.success) {
      toast.success("Recommendation dismissed");
      router.push("/dashboard/recommendations");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to dismiss recommendation");
      setError(result.error || null);
      setIsLoading(false);
    }
  };

  const openImplementModal = () => {
    setImplementDate(new Date().toISOString().split("T")[0]);
    setImplementNotes("");
    setError(null);
    setIsImplementModalOpen(true);
  };

  return (
    <>
      <Card className="border-2 border-[#e9d5ff]">
        <CardContent className="p-6">
          {/* Header with Badges */}
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h1 className="mb-2 text-2xl font-bold text-[#1f2937] sm:text-3xl">
                {recommendation.title}
              </h1>
              <p className="text-sm text-[#6b7280]">
                Created {recommendation.createdAt.toLocaleDateString()}
              </p>
            </div>
            <ImpactBadge level={recommendation.impactLevel} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded-md border-2 border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 2-Column Layout on Desktop */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content - 2 columns on desktop */}
            <div className="space-y-6 lg:col-span-2">
              {/* Problem Statement */}
              <section>
                <h2 className="mb-3 text-xl font-semibold text-[#1f2937]">
                  Problem
                </h2>
                <p className="text-[#4b5563] leading-relaxed">
                  {recommendation.problemStatement}
                </p>
              </section>

              {/* Solution Section */}
              <section>
                <h3 className="mb-3 text-lg font-semibold text-[#1f2937]">
                  Solution
                </h3>
                <ol className="space-y-2">
                  {recommendation.actionSteps.map((step, index) => (
                    <li
                      key={index}
                      className="flex gap-3 text-[#4b5563]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="flex-1 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Proof Section */}
              <section>
                <h3 className="mb-3 text-lg font-semibold text-[#1f2937]">
                  Why This Works
                </h3>

                {/* Expected Impact */}
                <div className="mb-4">
                  <p className="mb-1 text-sm font-medium text-[#6b7280]">
                    Expected Impact
                  </p>
                  <p className="text-lg font-semibold text-[#1f2937]">
                    {recommendation.expectedImpact}
                  </p>
                </div>

                {/* Confidence Level */}
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-[#6b7280]">
                    Confidence Level
                  </p>
                  <ConfidenceMeter level={recommendation.confidenceLevel} />
                  <p className="mt-2 text-xs text-[#6b7280]">
                    {recommendation.confidenceLevel === "HIGH"
                      ? "Based on 200+ user sessions analyzed"
                      : recommendation.confidenceLevel === "MEDIUM"
                        ? "Based on 100+ user sessions analyzed"
                        : "Based on 50+ user sessions analyzed"}
                  </p>
                </div>

                {/* Peer Success Data */}
                {recommendation.peerSuccessData && (
                  <div className="rounded-lg border-2 border-[#d1fae5] bg-[#d1fae5]/30 p-4">
                    <p className="mb-1 text-sm font-medium text-[#065f46]">
                      Peer Success Data
                    </p>
                    <p className="text-sm text-[#047857]">
                      {recommendation.peerSuccessData}
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Journey Snippet Placeholder - 1 column on desktop */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 rounded-lg border-2 border-[#e9d5ff] bg-[#faf5ff] p-4">
                <h3 className="mb-2 text-sm font-semibold text-[#7c3aed]">
                  Journey Visualization
                </h3>
                <div className="flex h-48 items-center justify-center rounded-md bg-white/50">
                  <p className="text-center text-sm text-[#6b7280]">
                    Visual journey snippet
                    <br />
                    showing drop-off point
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
            <Button
              onClick={handleMarkAsPlanned}
              disabled={isLoading}
              className="w-full sm:w-auto"
              aria-label="Mark recommendation as planned"
            >
              Mark as Planned
            </Button>
            <Button
              onClick={openImplementModal}
              variant="outline"
              disabled={isLoading}
              className="w-full sm:w-auto"
              aria-label="Mark recommendation as implemented"
            >
              Mark as Implemented
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              disabled={isLoading}
              className="w-full sm:w-auto"
              aria-label="Dismiss recommendation"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Date Picker Modal */}
      <Dialog open={isImplementModalOpen} onOpenChange={setIsImplementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Implemented</DialogTitle>
            <DialogDescription>
              Record when you implemented this recommendation and add optional
              notes about the implementation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date Picker */}
            <div>
              <Label htmlFor="implement-date" className="mb-2 block">
                Implementation Date
              </Label>
              <Input
                id="implement-date"
                type="date"
                value={implementDate}
                onChange={(e) => setImplementDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Notes Field */}
            <div>
              <Label htmlFor="implement-notes" className="mb-2 block">
                Notes{" "}
                <span className="font-normal text-[#6b7280]">(optional)</span>
              </Label>
              <Textarea
                id="implement-notes"
                placeholder="Add notes about your implementation (e.g., which plugin you installed, changes you made)"
                value={implementNotes}
                onChange={(e) => setImplementNotes(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="mt-1 text-xs text-[#6b7280]">
                {implementNotes.length}/500 characters
              </p>
            </div>

            {/* Error in Modal */}
            {error && (
              <div className="rounded-md border-2 border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsImplementModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkAsImplemented} disabled={isLoading}>
              {isLoading ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
