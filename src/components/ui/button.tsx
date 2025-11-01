import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variantStyles = {
      default: "bg-[#7c3aed] text-white hover:bg-[#6d28d9] focus-visible:ring-[#7c3aed]",
      outline:
        "border-2 border-[#7c3aed] bg-white text-[#7c3aed] hover:bg-[#faf5ff] focus-visible:ring-[#7c3aed]",
      ghost: "text-[#7c3aed] hover:bg-[#faf5ff] focus-visible:ring-[#7c3aed]",
      destructive:
        "bg-[#ef4444] text-white hover:bg-[#dc2626] focus-visible:ring-[#ef4444]",
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-9 px-3 text-xs",
      lg: "h-11 px-8 text-base",
    };

    return (
      <button
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
