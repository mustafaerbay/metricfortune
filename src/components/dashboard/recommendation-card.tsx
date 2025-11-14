"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImpactBadge } from "./impact-badge";
import { ConfidenceMeter } from "./confidence-meter";
import { isNewRecommendation } from "@/lib/recommendation-utils";
import { Lightbulb, CheckCircle } from "lucide-react";

interface RecommendationCardProps {
  recommendation: {
    id: string;
    title: string;
    problemStatement: string;
    impactLevel: "HIGH" | "MEDIUM" | "LOW";
    confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
    peerSuccessData: string | null;
    createdAt: Date;
  };
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const isNew = isNewRecommendation(recommendation.createdAt);

  return (
    <Link
      href={`/dashboard/recommendations/${recommendation.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 rounded-lg"
      aria-label={`Recommendation: ${recommendation.title}, ${recommendation.impactLevel} Impact${isNew ? ", New" : ""}`}
    >
      <Card className="relative h-full min-w-[360px] overflow-hidden border-2 border-[#e9d5ff] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#7c3aed] hover:shadow-lg">
        <CardContent className="p-6">
          {/* NEW Badge - Top Left */}
          {isNew && (
            <Badge className="absolute left-4 top-4 animate-pulse bg-[#7c3aed] text-white">
              NEW
            </Badge>
          )}

          {/* Impact Badge - Top Right */}
          <div className="absolute right-4 top-4">
            <ImpactBadge level={recommendation.impactLevel} />
          </div>

          {/* Icon/Emoji Area */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]">
            <Lightbulb className="h-8 w-8 text-white" />
          </div>

          {/* Title */}
          <h3 className="mb-2 mt-8 line-clamp-2 text-xl font-bold text-[#1f2937] group-hover:text-[#7c3aed]">
            {recommendation.title}
          </h3>

          {/* Problem Statement Summary */}
          <p className="mb-4 line-clamp-3 text-sm text-[#6b7280]">
            {recommendation.problemStatement}
          </p>

          {/* Confidence Meter */}
          <div className="mb-4">
            <ConfidenceMeter level={recommendation.confidenceLevel} />
          </div>

          {/* Peer Proof Footer */}
          {recommendation.peerSuccessData && (
            <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              <p className="text-xs text-[#6b7280]">
                {recommendation.peerSuccessData}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
