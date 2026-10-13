import React, { useId } from "react";

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
  useImage = false,
  colorMode = "auto",
}) => {
  const uid = useId().replace(/:/g, "");
  const bgGradId = `bg-grad-${uid}`;
  const borderGradId = `border-grad-${uid}`;
  const innerGlowId = `inner-glow-${uid}`;
  const screenGradId = `screen-grad-${uid}`;
  const capGradId = `cap-grad-${uid}`;
  const tasselGradId = `tassel-grad-${uid}`;
  const swooshGradId = `swoosh-grad-${uid}`;
  const checkGradId = `check-grad-${uid}`;
  const alertGradId = `alert-grad-${uid}`;

  // Dimension mappings - Significantly enlarged and clearer
  const iconDimensions = {
    sm: "w-10 h-10",
    md: "w-12 h-12 sm:w-14 sm:h-14",
    lg: "w-16 h-16 sm:w-20 sm:h-20",
    xl: "w-24 h-24 sm:w-28 sm:h-28",
    "2xl": "w-32 h-32 sm:w-40 sm:h-40",
  }[size] || "w-12 h-12";

  const textSize = {
    sm: "text-lg",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-3xl sm:text-4xl",
    "2xl": "text-4xl sm:text-5xl",
  }[size] || "text-xl";

  // Vector Logo Emblem - Ultra Crisp, High Contrast, Perfectly Proportioned
  const Emblem = (
    <div className={`relative flex items-center justify-center shrink-0 ${iconDimensions} ${className}`}>
      {useImage ? (
        <img
          src="/logo.svg"
          alt="EduTrack Logo"
          className="w-full h-full object-contain rounded-2xl shadow-sm drop-shadow-md"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/logo.png";
          }}
        />
      ) : (
        <svg
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md transition-transform duration-200"
        >
          <defs>
            {/* Background Rich Gradient */}
            <linearGradient id={bgGradId} x1="40" y1="40" x2="472" y2="472" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="45%" stopColor="#047857" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>

            {/* Glowing Border Gradient */}
            <linearGradient id={borderGradId} x1="40" y1="40" x2="472" y2="472" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.5" />
            </linearGradient>

            {/* Inner Radial Glow */}
            <radialGradient id={innerGlowId} cx="256" cy="275" r="210" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Phone Screen Gradient (Deep Emerald with Bright Inner Glow) */}
            <linearGradient id={screenGradId} x1="166" y1="162" x2="346" y2="430" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#022c22" />
              <stop offset="55%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Cap Mortarboard Gradient */}
            <linearGradient id={capGradId} x1="126" y1="70" x2="386" y2="146" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="45%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Golden Tassel Gradient */}
            <linearGradient id={tasselGradId} x1="355" y1="170" x2="368" y2="202" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Dynamic Orbit Swoosh Gradient */}
            <linearGradient id={swooshGradId} x1="80" y1="200" x2="445" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="35%" stopColor="#34d399" />
              <stop offset="80%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
            </linearGradient>

            {/* Verified Attendance Check Circle Gradient */}
            <linearGradient id={checkGradId} x1="220" y1="304" x2="292" y2="376" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Parent Alert Bubble Gradient */}
            <linearGradient id={alertGradId} x1="362" y1="138" x2="484" y2="235" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Outer Rounded Squircle Base */}
          <rect
            x="24"
            y="24"
            width="464"
            height="464"
            rx="112"
            fill={`url(#${bgGradId})`}
            stroke={`url(#${borderGradId})`}
            strokeWidth="6"
          />

          {/* Ambient Glow Behind Centerpiece */}
          <circle cx="256" cy="275" r="180" fill={`url(#${innerGlowId})`} />

          {/* Background Attendance Grid Rings */}
          <circle cx="256" cy="285" r="190" stroke="white" strokeOpacity="0.07" strokeWidth="2.5" strokeDasharray="8 8" />
          <circle cx="256" cy="285" r="140" stroke="white" strokeOpacity="0.1" strokeWidth="2" />

          {/* Dynamic Circular Orbit / Swoosh (Behind phone part) */}
          <path
            d="M 98 318 C 72 216, 154 152, 280 172 C 398 192, 448 280, 400 370 C 352 448, 206 452, 128 394 C 98 370, 90 342, 98 318"
            fill="none"
            stroke={`url(#${swooshGradId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="290 20"
            opacity="0.95"
          />

          {/* Orbiting Satellite Pulse (Live Attendance Sync Node) */}
          <circle cx="418" cy="275" r="14" fill="#38bdf8" fillOpacity="0.3" />
          <circle cx="418" cy="275" r="8" fill="#38bdf8" />
          <circle cx="418" cy="275" r="3.5" fill="white" />

          {/* Smartphone Outer Body - Crisp Metallic Casing */}
          <rect
            x="154"
            y="144"
            width="204"
            height="304"
            rx="36"
            fill="#0f172a"
            stroke="#34d399"
            strokeWidth="3.5"
          />

          {/* Smartphone Screen Display */}
          <rect
            x="166"
            y="162"
            width="180"
            height="268"
            rx="26"
            fill={`url(#${screenGradId})`}
          />

          {/* Top Speaker Grille & Camera */}
          <rect x="224" y="152" width="64" height="5" rx="2.5" fill="#334155" />
          <circle cx="208" cy="154.5" r="3" fill="#34d399" />

          {/* Student Profile Figure (Upper Phone Display) */}
          {/* Student Head */}
          <circle cx="256" cy="216" r="24" fill="white" />
          {/* Student Body / Academic Gown */}
          <path
            d="M 218 272 C 218 240, 240 238, 256 238 C 272 238, 294 240, 294 272 Z"
            fill="white"
          />
          {/* Academic Collar & Tie */}
          <path d="M 251 239 L 256 252 L 261 239 Z" fill="#047857" />
          <path d="M 256 252 L 258 266 L 256 270 L 254 266 Z" fill="#047857" />

          {/* Live Attendance Metric Bar Lines */}
          <line x1="210" y1="284" x2="302" y2="284" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7" />

          {/* Verified Attendance Checkmark Badge */}
          {/* Outer glow ring */}
          <circle cx="256" cy="340" r="44" fill="#10b981" fillOpacity="0.25" />
          {/* Inner badge circle */}
          <circle cx="256" cy="340" r="36" fill={`url(#${checkGradId})`} stroke="#a7f3d0" strokeWidth="3.5" />
          {/* Crisp, Bold Checkmark */}
          <path
            d="M 238 340 L 251 353 L 275 328"
            fill="none"
            stroke="white"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Live Data Bars on Screen */}
          <line x1="218" y1="394" x2="294" y2="394" stroke="#a7f3d0" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="232" y1="404" x2="280" y2="404" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8" />

          {/* Academic Graduation Cap (Mortarboard) - Perched Atop Smartphone */}
          {/* Cap Skull Base */}
          <path
            d="M 198 132 C 198 158, 314 158, 314 132 Z"
            fill="#0f172a"
          />
          <path
            d="M 210 135 C 210 152, 302 152, 302 135 Z"
            fill="#1e293b"
          />

          {/* 3D Mortarboard Rim */}
          <path
            d="M 126 110 L 256 138 L 386 110 L 386 118 L 256 146 L 126 118 Z"
            fill="#020617"
          />

          {/* Main Diamond Mortarboard */}
          <path
            d="M 256 70 L 386 110 L 256 138 L 126 110 Z"
            fill={`url(#${capGradId})`}
            stroke="#475569"
            strokeWidth="3"
          />

          {/* Gold Button / Cap Stud */}
          <ellipse cx="256" cy="104" rx="9" ry="6" fill="#f59e0b" />
          <ellipse cx="256" cy="103" rx="5.5" ry="3.5" fill="#fef3c7" />

          {/* Golden Tassel with Flowing Ribbon */}
          <path
            d="M 256 104 C 300 106, 348 112, 356 132 C 360 142, 358 156, 359 170"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Tassel Clamp Band */}
          <rect x="355" y="169" width="9" height="4.5" rx="2" fill="#b45309" />
          {/* Tassel Brush Fringe */}
          <path
            d="M 355 173 L 364 173 L 368 198 L 351 198 Z"
            fill={`url(#${tasselGradId})`}
          />

          {/* Parent Notification Alert Bubble (Top Right) */}
          <g>
            {/* Speech Bubble Base */}
            <path
              d="M 362 164 C 362 148, 376 138, 394 138 L 452 138 C 470 138, 484 148, 484 164 L 484 192 C 470 208, 452 218, 452 218 L 398 218 L 374 235 L 379 218 C 367 218, 362 208, 362 192 Z"
              fill={`url(#${alertGradId})`}
              stroke="white"
              strokeWidth="2.5"
            />

            {/* Notification Bell Icon */}
            <path
              d="M 426 166 C 426 160, 421 155, 415 155 C 409 155, 404 160, 404 166 C 404 178, 397 181, 397 185 L 433 185 C 433 181, 426 178, 426 166 Z"
              fill="white"
            />
            <circle cx="415" cy="190" r="3" fill="white" />
            <path d="M 412 151 L 418 151" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

            {/* Red Alert Ping Badge Dot */}
            <circle cx="438" cy="156" r="6" fill="#ef4444" stroke="white" strokeWidth="2" />

            {/* Broadcast Sound Wave */}
            <path
              d="M 440 170 C 444 174, 444 179, 440 183"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
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
    ? "text-emerald-400"
    : "text-emerald-600 dark:text-emerald-400";
  const taglineColor = isDarkTarget
    ? "text-white/80"
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

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-1.5 my-2.5 w-36">
          <span className={`h-[2px] flex-1 rounded-full ${isDarkTarget ? "bg-white/20" : "bg-emerald-500/30"}`} />
          <span className={`h-1.5 w-1.5 rounded-full ${isDarkTarget ? "bg-emerald-400" : "bg-emerald-600 dark:bg-emerald-400"}`} />
          <span className={`h-[2px] flex-1 rounded-full ${isDarkTarget ? "bg-white/20" : "bg-emerald-500/30"}`} />
        </div>

        {/* Tagline */}
        {showTagline && (
          <p className={`text-xs font-semibold tracking-tight max-w-[300px] ${taglineColor}`}>
            <span>Smart Attendance</span>{" "}
            <span className={isDarkTarget ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"}>·</span>{" "}
            <span>Parent Alerts</span>{" "}
            <span className={isDarkTarget ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"}>·</span>{" "}
            <span>Auditing</span>
          </p>
        )}
      </div>
    );
  }

  // Default "horizontal" layout for navigation, app shell, cards
  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
      {Emblem}
      <div className="flex flex-col text-left">
        <div className={`font-display font-black tracking-tight ${textSize} leading-tight flex items-center gap-0.5`}>
          <span className={eduColor}>Edu</span>
          <span className={trackColor}>Track</span>
        </div>
        {showTagline ? (
          <p className={`text-xs font-medium leading-tight ${taglineColor}`}>
            Smart Attendance & Parent Alerts
          </p>
        ) : (
          <p className={`text-xs font-semibold leading-tight tracking-wide uppercase ${taglineColor}`}>
            Academic System
          </p>
        )}
      </div>
    </div>
  );
};
