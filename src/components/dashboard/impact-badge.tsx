import { getImpactBadgeStyles } from "@/lib/recommendation-utils";

interface ImpactBadgeProps {
  level: "HIGH" | "MEDIUM" | "LOW";
  className?: string;
}

export function ImpactBadge({ level, className = "" }: ImpactBadgeProps) {
  const styles = getImpactBadgeStyles(level);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles.bg} ${styles.text} ${className}`}
      aria-label={`Impact level: ${styles.label}`}
    >
      {styles.label}
    </span>
  );
}
