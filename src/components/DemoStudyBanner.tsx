import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { localDb } from "../lib/supabase";
import {
  Shuffle,
  User,
  Shield,
  Building2,
  UserCog,
  Users,
  GraduationCap,
  RotateCcw,
  LogOut,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Check,
} from "lucide-react";
import { UserRoleType } from "../types";

const ROLE_CONFIG: Record<
  UserRoleType,
  { label: string; shortLabel: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  admin: {
    label: "Admin",
    shortLabel: "Admin",
    icon: Shield,
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  },
  hod: {
    label: "Head of Dept (HOD)",
    shortLabel: "HOD",
    icon: Building2,
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  },
  class_coordinator: {
    label: "Class Coordinator",
    shortLabel: "Coordinator",
    icon: UserCog,
    color: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  },
  teacher: {
    label: "Faculty / Teacher",
    shortLabel: "Teacher",
    icon: Users,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  student: {
    label: "Student",
    shortLabel: "Student",
    icon: GraduationCap,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
};

export const DemoStudyBanner: React.FC = () => {
  const { isDemo, role, user, loginAsDemo, loginAsRandomDemo, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isDemo || !user || !role) {
    return null;
  }

  const currentRoleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const CurrentIcon = currentRoleCfg.icon;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSwitchRole = async (targetRole: UserRoleType) => {
    if (targetRole === role && location.pathname === "/dashboard") return;
    setIsSwitching(true);
    try {
      await loginAsDemo(targetRole);
      showFeedback(`Switched to dummy ${ROLE_CONFIG[targetRole].label} profile`);
      if (location.pathname !== "/profile") {
        navigate("/dashboard");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleRandomDashboard = async () => {
    setIsSwitching(true);
    try {
      const nextRole = await loginAsRandomDemo();
      showFeedback(`Switched to random demo: ${ROLE_CONFIG[nextRole].label} Dashboard`);
      navigate("/dashboard");
    } finally {
      setIsSwitching(false);
    }
  };

  const handleResetData = () => {
    localDb.restoreDemoData();
    showFeedback("Preloaded demo records restored successfully!");
  };

  const handleViewProfile = () => {
    navigate("/profile");
  };

  const handleExitDemo = async () => {
    await signOut();
    navigate("/");
  };

  if (isCollapsed) {
    return (
      <aside
        aria-label="Demo Mode Controls"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 p-1.5 pl-3 shadow-xl backdrop-blur-md transition-all hover:scale-105"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-500" />
          <span>Demo Mode:</span>
          <span className="font-bold text-foreground">{currentRoleCfg.shortLabel}</span>
        </span>
        <button
          onClick={handleRandomDashboard}
          title="Switch to random demo role"
          disabled={isSwitching}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Shuffle className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Expand Demo Bar"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Demo Study Controls"
      className="sticky top-0 z-40 w-full border-b border-amber-200/60 bg-gradient-to-r from-amber-500/10 via-background to-indigo-500/10 px-3 py-2 text-xs backdrop-blur-md dark:border-amber-800/40"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5">
        {/* Left: Indicator & Current Persona */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2 py-1 font-bold text-amber-900 dark:text-amber-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Study Demo Mode</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 py-1 text-muted-foreground">
            <span>Viewing as:</span>
            <CurrentIcon className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold text-foreground">{user.full_name}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {currentRoleCfg.shortLabel}
            </span>
          </div>

          {feedback && (
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <Check className="h-3 w-3" /> {feedback}
            </span>
          )}
        </div>

        {/* Center/Right: Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Random Dashboard Shuffle Button */}
          <button
            onClick={handleRandomDashboard}
            disabled={isSwitching}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            title="Randomly switch to another role's dashboard"
          >
            <Shuffle className={`h-3.5 w-3.5 ${isSwitching ? "animate-spin" : ""}`} />
            <span>Random Demo Dashboard</span>
          </button>

          {/* Quick Role Switchers */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 p-0.5">
            {(Object.keys(ROLE_CONFIG) as UserRoleType[]).map((r) => {
              const cfg = ROLE_CONFIG[r];
              const isActive = role === r;
              return (
                <button
                  key={r}
                  onClick={() => handleSwitchRole(r)}
                  disabled={isSwitching}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                    isActive
                      ? "bg-foreground text-background font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {cfg.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Dummy Profile Button */}
          <button
            onClick={handleViewProfile}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              location.pathname === "/profile"
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-border/80 bg-background/80 text-foreground hover:bg-muted"
            }`}
            title="Inspect Dummy User Profile"
          >
            <User className="h-3.5 w-3.5" />
            <span>Dummy Profile</span>
          </button>

          {/* Reset Mock Data */}
          <button
            onClick={handleResetData}
            className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Restore default mock records for testing"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden md:inline">Reset Data</span>
          </button>

          {/* Exit Demo */}
          <button
            onClick={handleExitDemo}
            className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
            title="Exit demo and log out"
          >
            <LogOut className="h-3 w-3" />
            <span>Exit</span>
          </button>

          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Minimize demo bar"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
