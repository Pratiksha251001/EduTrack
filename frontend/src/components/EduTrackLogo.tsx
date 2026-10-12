import React from "react";

interface EduTrackLogoProps {
  variant?: "full" | "horizontal" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
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
  useImage = false,
  colorMode = "auto",
}) => {
  // Dimension mappings
  const iconDimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  }[size];

  const textSize = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  }[size];

  // Vector Logo Emblem
  const Emblem = (
    <div className={`relative flex items-center justify-center shrink-0 ${iconDimensions} ${className}`}>
      {useImage ? (
        <img
          src="/logo.png"
          alt="EduTrack Logo"
          className="w-full h-full object-contain rounded-xl shadow-sm"
          referrerPolicy="no-referrer"
        />
      ) : (
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm transition-transform duration-200"
        >
          {/* Outer Rounded Container with subtle border */}
          <rect
            x="4"
            y="4"
            width="112"
            height="112"
            rx="28"
            fill="url(#edutrack-bg-grad)"
            stroke="url(#edutrack-border-grad)"
            strokeWidth="2.5"
          />

          {/* Decorative subtle pulse rings */}
          <circle cx="60" cy="60" r="44" stroke="white" strokeOpacity="0.08" strokeWidth="2" strokeDasharray="4 4" />

          {/* Open Book Base */}
          <path
            d="M 60 76 C 47 70 34 72 26 77 L 26 50 C 34 46 47 44 60 50 Z"
            fill="white"
            fillOpacity="0.18"
          />
          <path
            d="M 60 76 C 73 70 86 72 94 77 L 94 50 C 86 46 73 44 60 50 Z"
            fill="white"
            fillOpacity="0.28"
          />
          {/* Book Spine */}
          <line x1="60" y1="48" x2="60" y2="78" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6" />

          {/* Clipboard / Sheet in center */}
          <rect
            x="42"
            y="30"
            width="36"
            height="46"
            rx="6"
            fill="white"
            className="drop-shadow-md"
          />
          {/* Clip Top */}
          <rect x="51" y="26" width="18" height="8" rx="3" fill="#047857" />
          <circle cx="60" cy="30" r="2" fill="white" />

          {/* Attendance Checkmark on Sheet */}
          <path
            d="M 48 50 L 56 58 L 73 39"
            stroke="#059669"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Mini progress / attendance bars below check */}
          <line x1="49" y1="65" x2="71" y2="65" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="49" y1="70" x2="63" y2="70" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

          {/* Live Notification Indicator Pulse on top right */}
          <circle cx="92" cy="28" r="9" fill="#10b981" stroke="white" strokeWidth="2.5" />
          <circle cx="92" cy="28" r="3.5" fill="white" />

          {/* Gradients */}
          <defs>
            <linearGradient id="edutrack-bg-grad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
              <stop stopColor="#065f46" />
              <stop offset="0.5" stopColor="#047857" />
              <stop offset="1" stopColor="#0f766e" />
            </linearGradient>
            <linearGradient id="edutrack-border-grad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="1" stopColor="#5eead4" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );

  if (variant === "icon") {
    return Emblem;
  }

  // Determine text coloring based on colorMode
  const isDarkTarget = colorMode === "onDark";
  const eduColor = isDarkTarget
    ? "text-white"
    : "text-foreground group-hover:text-primary transition-colors";
  const trackColor = isDarkTarget
    ? "text-[#4ade80]"
    : "text-primary";
  const taglineColor = isDarkTarget
    ? "text-white/70"
    : "text-muted-foreground";

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {/* Emblem */}
        <div className="mb-3 hover:scale-105 transition-transform duration-200">
          {Emblem}
        </div>

        {/* Brand Name */}
        <div className={`font-display font-black tracking-tight ${textSize} leading-none flex items-center justify-center gap-0.5`}>
          <span className={eduColor}>Edu</span>
          <span className={trackColor}>Track</span>
        </div>

        {/* Decorative subtle divider */}
        <div className="flex items-center justify-center gap-1.5 my-2 w-32">
          <span className={`h-[2px] flex-1 rounded-full ${isDarkTarget ? "bg-white/20" : "bg-primary/30"}`} />
          <span className={`h-1.5 w-1.5 rounded-full ${isDarkTarget ? "bg-[#4ade80]" : "bg-primary"}`} />
          <span className={`h-[2px] flex-1 rounded-full ${isDarkTarget ? "bg-white/20" : "bg-primary/30"}`} />
        </div>

        {/* Tagline */}
        {showTagline && (
          <p className={`text-xs font-semibold tracking-tight max-w-[280px] ${taglineColor}`}>
            <span>Smart Attendance</span>{" "}
            <span className={isDarkTarget ? "text-[#4ade80]" : "text-primary"}>·</span>{" "}
            <span>Parent Alerts</span>{" "}
            <span className={isDarkTarget ? "text-[#4ade80]" : "text-primary"}>·</span>{" "}
            <span>Auditing</span>
          </p>
        )}
      </div>
    );
  }

  // Default "horizontal" layout for navigation, app shell, cards
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {Emblem}
      <div className="flex flex-col text-left">
        <div className={`font-display font-black tracking-tight ${textSize} leading-tight flex items-center gap-0.5`}>
          <span className={eduColor}>Edu</span>
          <span className={trackColor}>Track</span>
        </div>
        {showTagline ? (
          <p className={`text-[10px] font-medium leading-tight ${taglineColor}`}>
            Attendance & Parent Alerts
          </p>
        ) : (
          <p className={`text-[11px] font-medium leading-tight ${taglineColor}`}>
            Academic System
          </p>
        )}
      </div>
    </div>
  );
};

