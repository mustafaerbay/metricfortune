/**
 * Check if a recommendation is new (created within last 7 days)
 */
export function isNewRecommendation(createdAt: Date): boolean {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return createdAt >= sevenDaysAgo;
}

/**
 * Get confidence percentage from confidence level
 */
export function getConfidencePercentage(
  level: "HIGH" | "MEDIUM" | "LOW"
): number {
  switch (level) {
    case "HIGH":
      return 85; // 75%+
    case "MEDIUM":
      return 65; // 50-74%
    case "LOW":
      return 40; // <50%
    default:
      return 0;
  }
}

/**
 * Get impact badge color classes
 */
export function getImpactBadgeStyles(level: "HIGH" | "MEDIUM" | "LOW") {
  switch (level) {
    case "HIGH":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "High Impact",
      };
    case "MEDIUM":
      return {
        bg: "bg-amber-100",
        text: "text-amber-800",
        label: "Medium Impact",
      };
    case "LOW":
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        label: "Low Impact",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        label: "Unknown",
      };
  }
}
