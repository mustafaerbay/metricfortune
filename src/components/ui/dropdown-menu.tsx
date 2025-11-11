"use client";

import * as React from "react";

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = "end",
}) => {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-2 w-56 rounded-md border border-[#d1d5db] bg-white py-1 shadow-lg ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className = "", destructive = false, ...props }, ref) => {
  return (
    <button
      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[#faf5ff] focus:bg-[#faf5ff] focus:outline-none ${
        destructive ? "text-[#ef4444]" : "text-[#1f2937]"
      } ${className}`}
      ref={ref}
      {...props}
    />
  );
});

DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => {
  return (
    <div
      className={`my-1 h-px bg-[#d1d5db] ${className}`}
      {...props}
    />
  );
};

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator };
