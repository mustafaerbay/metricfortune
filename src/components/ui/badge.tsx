import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "secondary";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";

    const variantStyles = {
      default: "bg-[#7c3aed] text-white",
      success: "bg-[#10b981] text-white",
      warning: "bg-[#fbbf24] text-[#1f2937]",
      error: "bg-[#ef4444] text-white",
      secondary: "bg-[#f97316] text-white",
    };

    return (
      <div
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
