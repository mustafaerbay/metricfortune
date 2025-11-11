import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  badge?: string;
  percentile?: number;
}

export function StatsCard({
  label,
  value,
  trend,
  trendValue,
  badge,
  percentile,
}: StatsCardProps) {
  const TrendIcon =
    trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-[#10b981]"
      : trend === "down"
      ? "text-[#ef4444]"
      : "text-[#6b7280]";

  return (
    <Card className="h-[80px] border-[#e9d5ff] p-3">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium text-[#6b7280]">{label}</span>
          {badge && (
            <Badge variant="default" className="h-5 px-1.5 text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#1f2937]">{value}</span>
            {percentile !== undefined && (
              <span className="text-xs text-[#6b7280]">
                (Top {percentile}%)
              </span>
            )}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-0.5 ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
