import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  GraduationCap,
  Users,
  UserCog,
  Shield,
  Moon,
  Sun,
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  X,
  Sparkles,
  CheckCircle2,
  Zap,
  KeyRound,
  ShieldCheck,
  Search,
  Shuffle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { college, CURRENT_ACADEMIC_YEAR } from "../lib/college";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { UserRoleType } from "../lib/types";
import { localDb } from "../lib/supabase";
import { EduTrackLogo } from "../components/EduTrackLogo";
import { PasswordInput } from "../components/PasswordInput";

interface PortalCard {
  title: string;
  category: "admin" | "faculty" | "student";
  badge: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  buttonLabel: string;
  role: UserRoleType;
}

export const AccessHub: React.FC = () => {
  const {
    user,
    role,
    loading: authLoading,
    loginAsRandomDemo,
    loginAsDemo,
    registerAdmin,
    loginWithCredentials,
  } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRoleType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminMode, setAdminMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    "all" | "admin" | "faculty" | "student"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    const savedPath = localStorage.getItem("edutrack_last_authenticated_path");
    if (savedPath && savedPath.startsWith("/") && savedPath !== "/") {
      navigate(savedPath, { replace: true });
    }
  }, [authLoading, navigate, user]);

  const defaultAdminEmail =
    import.meta.env.VITE_DEFAULT_ADMIN_EMAIL?.trim() || "admin@edutrack.edu";
  const defaultAdminPassword =
    import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || "Admin@123";

  const portalCards: PortalCard[] = [
    {
      title: "Admin Portal",
      category: "admin",
      badge: "Institutional Governance",
      description:
        "Sign in to manage institutional settings and global oversight.",
      icon: Shield,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      buttonLabel: "Admin Dashboard",
      role: "admin",
    },
    {
      title: "HOD Portal",
      category: "admin",
      badge: "Department Head",
      description:
        "Sign in to manage your department and review compliance.",
      icon: Building2,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
      buttonLabel: "HOD Dashboard",
      role: "hod",
    },
    {
      title: "Teacher Portal",
      category: "faculty",
      badge: "Classroom Faculty",
      description:
        "Sign in to record attendance and send parent alerts.",
      icon: Users,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      buttonLabel: "Teacher Portal",
      role: "teacher",
    },
    {
      title: "Class Teacher Portal",
      category: "faculty",
      badge: "Class Coordinator",
      description:
        "Sign in to manage your class and student records.",
      icon: UserCog,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
      buttonLabel: "Coordinator Portal",
      role: "class_coordinator",
    },
    {
      title: "Student Portal",
      category: "student",
      badge: "Learner Self-Service",
      description:
        "Sign in to view your attendance and academic updates.",
      icon: GraduationCap,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      buttonLabel: "Student Portal",
      role: "student",
    },
  ];

  const handleCardClick = (card: PortalCard) => {
    if (card.role !== "admin") {
      navigate(`/login/${card.role}`);
      return;
    }

    setSelectedRole(card.role);
    const hasAdminAccount =
      Boolean(defaultAdminEmail) ||
      Boolean(
        localStorage.getItem("edutrack_admin_account") ||
        localStorage.getItem("smit_admin_account"),
      );
    setAdminMode(
      card.role === "admin" && !hasAdminAccount ? "register" : "login",
    );
    setShowLoginModal(true);
    setDepartmentId("");
    if (card.role === "admin" && !email) {
      setEmail(defaultAdminEmail);
    }
  };

  const handleRandomDemoLogin = async () => {
    setLoading(true);
    const chosenRole = await loginAsRandomDemo();
    setLoading(false);
    const dest = chosenRole === "teacher" ? "/teacher/dashboard" : "/dashboard";
    try {
      localStorage.setItem("edutrack_last_active_path", dest);
    } catch {}
    navigate(dest, { replace: true });
  };

  const handleQuickDemo = async (targetRole: UserRoleType) => {
    setLoading(true);
    await loginAsDemo(targetRole);
    setLoading(false);
    const dest = targetRole === "teacher" ? "/teacher/dashboard" : "/dashboard";
    try {
      localStorage.setItem("edutrack_last_active_path", dest);
    } catch {}
    navigate(dest, { replace: true });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (selectedRole === "admin" && adminMode === "register") {
      if (!fullName.trim() || password.length < 6) {
        alert("Enter your name and a password of at least 6 characters.");
        return;
      }
      setLoading(true);
      const result = await registerAdmin(fullName, email, password);
      setLoading(false);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      alert(
        "Admin registered successfully. Sign in with your registered credentials.",
      );
      setAdminMode("login");
      setPassword("");
      return;
    }

    setLoading(true);
    const result = await loginWithCredentials(
      selectedRole,
      email,
      password,
      departmentId || undefined,
    );
    setLoading(false);

    if (!result.ok) {
      alert(
        result.message || "Authentication failed. Please check credentials.",
      );
      return;
    }

    const dest = selectedRole === "teacher" ? "/teacher/dashboard" : "/dashboard";
    try {
      localStorage.setItem("edutrack_last_active_path", dest);
    } catch {}
    navigate(dest, { replace: true });
  };

  const closeModal = () => {
    setShowLoginModal(false);
    setSelectedRole(null);
    setEmail("");
    setPassword("");
    setFullName("");
    setAdminMode("login");
    setDepartmentId("");
  };

  const filteredCards = portalCards.filter((card) => {
    const matchesCategory =
      activeCategory === "all" || card.category === activeCategory;
    const matchesSearch =
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-[#f4fbf7] dark:bg-background text-foreground transition-colors duration-200 overflow-x-hidden">
      {/* Educational Illustration Background - High Contrast & Crisp */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
      >
        <img
          src="/edutrack-bg.svg"
          alt=""
          className="w-full h-full object-cover object-center opacity-85 dark:opacity-45"
        />
        {/* Subtle light mode contrast scrim so white cards stand out prominently */}
        <div className="absolute inset-0 bg-slate-900/[0.03] dark:bg-black/50" />
      </div>

      {/* Top Bar - 100% Fixed and Docked at Top (Never scrolls off screen) */}
      <header className="border-b border-emerald-500/25 dark:border-emerald-500/20 bg-white dark:bg-[#111827] fixed top-0 left-0 right-0 z-40 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.16)] dark:shadow-[0_4px_24px_-2px_rgba(52,211,153,0.22)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EduTrackLogo variant="horizontal" size="md" showTagline={false} />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-emerald-500/20 dark:border-emerald-500/30 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-foreground">
                Academic Portal Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Session {CURRENT_ACADEMIC_YEAR}</span>
            </span>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              title="Toggle color theme"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4 text-slate-700" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span>Light</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Luminous Emerald Ambient Accent Glow Line Below Fixed Top Bar */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-16 left-0 right-0 z-40 w-full h-0 overflow-visible"
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500/60 dark:via-emerald-400/75 to-transparent shadow-[0_2px_12px_rgba(16,185,129,0.4)]" />
      </div>

      {/* Main Container - Padded top so content starts below fixed bar */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16 space-y-8">
        {/* Active Session Quick Resume Banner if user is already signed in */}
        {user && role && (
          <div className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-[#111827] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Session Detected
                </p>
                <p className="text-sm sm:text-base font-bold text-foreground">
                  Signed in as <span className="text-emerald-600 dark:text-emerald-400">{user.full_name || user.email}</span> (
                  <span className="capitalize">{role.replace("_", " ")}</span> Portal)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full sm:w-auto text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-9 cursor-pointer"
                onClick={() => {
                  const saved = localStorage.getItem("edutrack_last_active_path");
                  const dest = saved && saved !== "/" && saved !== "/teacher/login"
                    ? saved
                    : (role === "teacher" ? "/teacher/dashboard" : "/dashboard");
                  navigate(dest, { replace: true });
                }}
              >
                Return to Active Page <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Hero Section - Elevated with Strong Light & Dark Mode Contrast */}
        <section className="relative overflow-hidden w-full text-center space-y-5 rounded-3xl border border-slate-300/85 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 sm:p-10 shadow-xl shadow-slate-900/[0.06] dark:shadow-none ring-1 ring-slate-900/[0.05] dark:ring-white/[0.05]">
          {/* Subtle ambient light aura */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[520px] h-36 bg-emerald-500/18 dark:bg-emerald-400/18 rounded-full blur-3xl pointer-events-none" />

          <div className="flex justify-center py-1">
            <EduTrackLogo variant="horizontal" size="xl" showTagline={false} />
          </div>

          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Academic Portal Hub
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Select your assigned institutional role below to enter your portal · Session {CURRENT_ACADEMIC_YEAR}
            </p>
          </div>

          {/* Interactive Category Filter Tabs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                activeCategory === "all"
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white shadow-xs ring-1 ring-slate-900/[0.04]"
              }`}
            >
              All Portals (5)
            </button>
            <button
              onClick={() => setActiveCategory("admin")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                activeCategory === "admin"
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white shadow-xs ring-1 ring-slate-900/[0.04]"
              }`}
            >
              Administration (2)
            </button>
            <button
              onClick={() => setActiveCategory("faculty")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                activeCategory === "faculty"
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-950 dark:hover:text-white shadow-xs ring-1 ring-slate-900/[0.04]"
              }`}
            >
              Faculty & Teachers (2)
            </button>
            <button
              onClick={() => setActiveCategory("student")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                activeCategory === "student"
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-950 dark:hover:text-white shadow-xs ring-1 ring-slate-900/[0.04]"
              }`}
            >
              Students (1)
            </button>
          </div>
        </section>

        {/* Quick 1-Click Demo Access - Elevated Card */}
        <section className="rounded-2xl border border-slate-300/85 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xl shadow-slate-900/[0.06] dark:shadow-none ring-1 ring-slate-900/[0.05] dark:ring-white/[0.05] text-left flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                Quick 1-Click Demo Access
              </h2>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                DIRECT PREVIEW
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Instantly view the actual post-login dashboard for any
              institutional role:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleQuickDemo("admin")}
              disabled={loading}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs ring-1 ring-slate-900/[0.04] cursor-pointer"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickDemo("hod")}
              disabled={loading}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs ring-1 ring-slate-900/[0.04] cursor-pointer"
            >
              HOD
            </button>
            <button
              onClick={() => handleQuickDemo("class_coordinator")}
              disabled={loading}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-xs cursor-pointer"
            >
              Class Coordinator
            </button>
            <button
              onClick={() => handleQuickDemo("teacher")}
              disabled={loading}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs ring-1 ring-slate-900/[0.04] cursor-pointer"
            >
              Teacher
            </button>
            <button
              onClick={() => handleQuickDemo("student")}
              disabled={loading}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs ring-1 ring-slate-900/[0.04] cursor-pointer"
            >
              Student
            </button>
          </div>
        </section>

        {/* Portal Cards Grid - High Contrast, Crisp Borders & Rich Elevation */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.role}
                onClick={() => handleCardClick(card)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-300/85 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-xl shadow-slate-900/[0.06] hover:shadow-2xl hover:shadow-emerald-950/15 ring-1 ring-slate-900/[0.05] dark:ring-white/[0.05] hover:border-emerald-500 dark:hover:border-emerald-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Top decorative accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500/30 via-emerald-500 to-emerald-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Card Header: Icon + Badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 ${card.iconColor} group-hover:scale-105 transition-transform duration-200 shadow-xs`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700"
                    >
                      {card.badge}
                    </Badge>
                  </div>

                  {/* Title & 1-Line Info */}
                  <h3 className="font-display text-lg font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-snug line-clamp-1">
                    {card.description}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1 font-bold group/btn shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(card);
                    }}
                  >
                    <span>Go to {card.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Footer */}
        <footer className="text-center pt-4 pb-8 border-t border-border/80 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/70">
            © {new Date().getFullYear()} EduTrack · Academic Portal Hub
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Session {CURRENT_ACADEMIC_YEAR} · Smart Attendance & Parent Alert System
          </p>
        </footer>
      </main>

      {/* Login & Registration Modal */}
      {showLoginModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-card-foreground shadow-2xl animate-in p-6 sm:p-7 overflow-hidden">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-6 relative z-10">
              <div className="mx-auto mb-3 flex items-center justify-center">
                <EduTrackLogo variant="icon" size="lg" className="w-16 h-16 sm:w-18 sm:h-18" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {portalCards.find((c) => c.role === selectedRole)?.title ||
                  "Sign In"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your authorized institutional credentials to continue
              </p>
            </div>

            {selectedRole === "admin" && (
              <div className="mb-5 relative z-10 flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setAdminMode("login")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                    adminMode === "login"
                      ? "bg-white dark:bg-slate-700 text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Admin Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAdminMode("register")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                    adminMode === "register"
                      ? "bg-white dark:bg-slate-700 text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  First-Time Setup
                </button>
              </div>
            )}

            {selectedRole === "admin" && adminMode === "login" && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex items-center justify-between gap-2">
                <div className="text-left">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                    Default .env Admin Credentials
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Email:{" "}
                    <span className="font-mono text-foreground font-medium">
                      {defaultAdminEmail}
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2.5 shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => {
                    setEmail(defaultAdminEmail);
                    setPassword(defaultAdminPassword);
                  }}
                >
                  Fill Default
                </Button>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
              {selectedRole === "admin" && adminMode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Administrator Full Name
                  </label>
                  <div className="relative">
                    <Input
                      required
                      placeholder="Enter administrator name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {selectedRole === "hod" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Assigned Department
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Auto-detected if unselected
                    </span>
                  </div>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">
                      Auto-detect or select department...
                    </option>
                    {localDb.departments
                      .filter((department) => department.status === "active")
                      .map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name} ({department.code})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {selectedRole === "student"
                    ? "Student Roll Number or Email"
                    : selectedRole === "hod"
                      ? "HOD Email or Employee ID"
                      : selectedRole === "teacher"
                        ? "Teacher Email or Employee ID"
                        : selectedRole === "class_coordinator"
                          ? "Coordinator Email or Employee ID"
                          : "Official Email Address"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    type="text"
                    placeholder={
                      selectedRole === "student"
                        ? "e.g. 101 or alex.h@student.edu"
                        : selectedRole === "hod"
                          ? "e.g. hod.cse@academic.edu or EMP-CSE-01"
                          : selectedRole === "teacher"
                            ? "e.g. teacher@academic.edu or EMP-CSE-02"
                            : selectedRole === "class_coordinator"
                              ? "e.g. cc@academic.edu or EMP-CSE-04"
                              : "admin@academic.edu"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Password
                </label>
                <PasswordInput
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
                {selectedRole === "student" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Default student password is your{" "}
                    <span className="font-semibold text-primary">
                      Roll Number
                    </span>{" "}
                    (e.g. 101 or 123)
                  </p>
                )}
                {selectedRole === "hod" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Default HOD password is{" "}
                    <span className="font-semibold text-primary">Hod@123</span>{" "}
                    or your Employee ID
                  </p>
                )}
                {selectedRole === "teacher" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Default teacher password is{" "}
                    <span className="font-semibold text-primary">
                      Teacher@123
                    </span>{" "}
                    or your Employee ID
                  </p>
                )}
                {selectedRole === "class_coordinator" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Default coordinator password is{" "}
                    <span className="font-semibold text-primary">Cc@123</span>{" "}
                    or your Employee ID
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/3 rounded-xl h-10 text-xs font-semibold border-border hover:bg-muted cursor-pointer"
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {selectedRole === "admin" && adminMode === "register"
                    ? "Create Admin Account"
                    : `Go to ${portalCards.find((c) => c.role === selectedRole)?.title || "Portal"}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
