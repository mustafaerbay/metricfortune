import { getConfidencePercentage } from "@/lib/recommendation-utils";

interface ConfidenceMeterProps {
  level: "HIGH" | "MEDIUM" | "LOW";
  className?: string;
}

export function ConfidenceMeter({
  level,
  className = "",
}: ConfidenceMeterProps) {
  const percentage = getConfidencePercentage(level);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-gray-600">Confidence</span>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-purple-600 transition-all"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Confidence level: ${level}`}
        />
      </div>
      <span className="text-xs font-medium text-gray-700">{percentage}%</span>
    </div>
  );
}
