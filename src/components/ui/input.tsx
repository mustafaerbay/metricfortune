import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-md border-2 border-[#d1d5db] bg-white px-3 py-2 text-base text-[#1f2937] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:ring-offset-2 focus:border-[#7c3aed] disabled:cursor-not-allowed disabled:bg-[#f9fafb] disabled:text-[#6b7280] disabled:opacity-60 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
