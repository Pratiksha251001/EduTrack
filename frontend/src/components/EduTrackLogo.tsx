import React from "react";

interface EduTrackLogoProps {
  variant?: "full" | "horizontal" | "icon";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showTagline?: boolean;
  useImage?: boolean;
  colorMode?: "auto" | "light" | "onDark";
}

export const EduTrackLogo: React.FC<EduTrackLogoProps> = ({
  variant = "horizontal",
  size = "md",
  className = "",
  showTagline = false,
  colorMode = "auto",
}) => {
  const iconDimensions =
    {
      sm: "h-9 w-9",
      md: "h-11 w-11 sm:h-12 sm:w-12",
      lg: "h-14 w-14 sm:h-16 sm:w-16",
      xl: "h-20 w-20 sm:h-24 sm:w-24",
      "2xl": "h-28 w-28 sm:h-32 sm:w-32",
    }[size] || "h-11 w-11";

  const textSize =
    {
      sm: "text-lg",
      md: "text-xl sm:text-2xl",
      lg: "text-2xl sm:text-3xl",
      xl: "text-3xl sm:text-4xl",
      "2xl": "text-4xl sm:text-5xl",
    }[size] || "text-xl";

  // Clean EduTrack monogram emblem
  const Emblem = (
    <div
      className={`relative flex shrink-0 items-center justify-center ${iconDimensions}`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        role="img"
        aria-label="EduTrack"
      >
        <rect x="2" y="2" width="60" height="60" rx="16" fill="#064E3B" />
        <path
          d="M16 20.5C21.7 18.1 27 18.2 32 21.3V45.5C27.2 42.8 21.9 42.6 16 45V20.5Z"
          fill="#ECFDF5"
        />
        <path
          d="M48 20.5C42.3 18.1 37 18.2 32 21.3V45.5C36.8 42.8 42.1 42.6 48 45V20.5Z"
          fill="#A7F3D0"
        />
        <path
          d="M32 21.5V45.5"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M38.5 32.5L42 36L48.5 28.5"
          stroke="#10B981"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 16H46"
          stroke="#34D399"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );

  if (variant === "icon") {
    return <div className={className}>{Emblem}</div>;
  }

  const onDark = colorMode === "onDark";
  const eduColor = onDark ? "text-white" : "text-slate-950 dark:text-white";
  const trackColor = "text-emerald-600 dark:text-emerald-400";
  const secondaryColor = onDark
    ? "text-white/70"
    : "text-slate-500 dark:text-slate-400";

  const Wordmark = (
    <div className="flex flex-col text-left">
      <div
        className={`flex items-center font-display font-black leading-none tracking-tight ${textSize}`}
      >
        <span className={eduColor}>Edu</span>
        <span className={trackColor}>Track</span>
      </div>
      <p
        className={`mt-1 text-[10px] font-bold uppercase leading-none tracking-[0.16em] sm:text-xs ${secondaryColor}`}
      >
        {showTagline ? "Smart academic operations" : "Academic system"}
      </p>
    </div>
  );

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {Emblem}
        <div className="mt-3">{Wordmark}</div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {Emblem}
      {Wordmark}
    </div>
  );
};
