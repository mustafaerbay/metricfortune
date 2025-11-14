"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RecommendationCard } from "./recommendation-card";
import { ChevronDown, FilterX, TrendingUp } from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  problemStatement: string;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  status: "NEW" | "PLANNED" | "IMPLEMENTED" | "DISMISSED";
  peerSuccessData: string | null;
  createdAt: Date;
}

interface RecommendationsListProps {
  recommendations: Recommendation[];
  currentFilters: {
    status?: string;
    impact?: string;
  };
}

export function RecommendationsList({
  recommendations,
  currentFilters,
}: RecommendationsListProps) {
  const router = useRouter();

  // Count active filters
  const activeFilterCount = [
    currentFilters.status,
    currentFilters.impact,
  ].filter(Boolean).length;

  // Update URL with new filter params
  const updateFilter = (key: "status" | "impact", value: string | null) => {
    const params = new URLSearchParams();

    // Preserve existing filters
    if (key === "status") {
      if (value) params.set("status", value);
      if (currentFilters.impact) params.set("impact", currentFilters.impact);
    } else {
      if (currentFilters.status) params.set("status", currentFilters.status);
      if (value) params.set("impact", value);
    }

    const queryString = params.toString();
    router.push(
      `/dashboard/recommendations${queryString ? `?${queryString}` : ""}`
    );
  };

  // Clear all filters
  const clearFilters = () => {
    router.push("/dashboard/recommendations");
  };

  // Check if all recommendations are dismissed
  const allDismissed =
    recommendations.length > 0 &&
    recommendations.every((rec) => rec.status === "DISMISSED");

  // Empty state: No recommendations at all
  if (recommendations.length === 0 && activeFilterCount === 0) {
    return (
      <Card className="border-2 border-dashed border-[#e9d5ff] bg-[#faf5ff]">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7c3aed]">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-[#1f2937]">
            Analyzing your data
          </h2>
          <p className="text-sm text-[#6b7280]">
            Recommendations coming soon. Check back in 24 hours for personalized
            insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Empty state: All recommendations dismissed
  if (allDismissed && activeFilterCount === 0) {
    return (
      <Card className="border-2 border-dashed border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h2 className="mb-2 text-xl font-bold text-[#1f2937]">
            Great work!
          </h2>
          <p className="text-sm text-[#6b7280]">
            You&apos;ve addressed all recommendations. Check back next week for
            new insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Empty state: No results from filters
  if (recommendations.length === 0 && activeFilterCount > 0) {
    return (
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 bg-white/80 pb-4 backdrop-blur-sm">
          {/* Status Filter */}
          <DropdownMenu
            trigger={
              <Button
                variant="outline"
                className="gap-2 border-[#e9d5ff] hover:border-[#7c3aed]"
              >
                Status: {currentFilters.status || "All"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
            align="start"
          >
            <DropdownMenuItem onClick={() => updateFilter("status", null)}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter("status", "NEW")}>
              New
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter("status", "PLANNED")}>
              Planned
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter("status", "IMPLEMENTED")}>
              Implemented
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter("status", "DISMISSED")}>
              Dismissed
            </DropdownMenuItem>
          </DropdownMenu>

          {/* Impact Filter */}
          <DropdownMenu
            trigger={
              <Button
                variant="outline"
                className="gap-2 border-[#e9d5ff] hover:border-[#7c3aed]"
              >
                Impact: {currentFilters.impact || "All"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
            align="start"
          >
            <DropdownMenuItem onClick={() => updateFilter("impact", null)}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter("impact", "HIGH")}>
              High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter("impact", "MEDIUM")}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateFilter("impact", "LOW")}>
              Low
            </DropdownMenuItem>
          </DropdownMenu>

          {/* Active Filter Count & Clear Button */}
          {activeFilterCount > 0 && (
            <>
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}{" "}
                active
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2 text-[#7c3aed] hover:text-[#6d28d9]"
              >
                <FilterX className="h-4 w-4" />
                Clear filters
              </Button>
            </>
          )}
        </div>

        {/* No Results */}
        <Card className="border-2 border-dashed border-[#e9d5ff] bg-[#faf5ff]">
          <CardContent className="p-8 text-center">
            <h2 className="mb-2 text-xl font-bold text-[#1f2937]">
              No recommendations match your filters
            </h2>
            <p className="mb-4 text-sm text-[#6b7280]">
              Try adjusting or clearing your filters to see more recommendations.
            </p>
            <Button onClick={clearFilters}>Clear filters</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main view: Display recommendations with filters
  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 bg-white/80 pb-4 backdrop-blur-sm">
        {/* Status Filter */}
        <DropdownMenu
          trigger={
            <Button
              variant="outline"
              className="gap-2 border-[#e9d5ff] hover:border-[#7c3aed]"
            >
              Status: {currentFilters.status || "All"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          }
          align="start"
        >
          <DropdownMenuItem onClick={() => updateFilter("status", null)}>
            All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter("status", "NEW")}>
            New
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter("status", "PLANNED")}>
            Planned
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter("status", "IMPLEMENTED")}>
            Implemented
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter("status", "DISMISSED")}>
            Dismissed
          </DropdownMenuItem>
        </DropdownMenu>

        {/* Impact Filter */}
        <DropdownMenu
          trigger={
            <Button
              variant="outline"
              className="gap-2 border-[#e9d5ff] hover:border-[#7c3aed]"
            >
              Impact: {currentFilters.impact || "All"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          }
          align="start"
        >
          <DropdownMenuItem onClick={() => updateFilter("impact", null)}>
            All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter("impact", "HIGH")}>
            High
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter("impact", "MEDIUM")}>
            Medium
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateFilter("impact", "LOW")}>
            Low
          </DropdownMenuItem>
        </DropdownMenu>

        {/* Active Filter Count & Clear Button */}
        {activeFilterCount > 0 && (
          <>
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2 text-[#7c3aed] hover:text-[#6d28d9]"
            >
              <FilterX className="h-4 w-4" />
              Clear filters
            </Button>
          </>
        )}
      </div>

      {/* Recommendation Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((recommendation, index) => (
          <div
            key={recommendation.id}
            className="animate-fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: "backwards",
            }}
          >
            <RecommendationCard recommendation={recommendation} />
          </div>
        ))}
      </div>
    </div>
  );
}
