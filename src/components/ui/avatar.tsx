import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = "", src, alt, fallback, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    return (
      <div
        className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#faf5ff] ${className}`}
        ref={ref}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#7c3aed] text-sm font-medium text-white">
            {fallback || "?"}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar };
