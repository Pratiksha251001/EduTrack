import React, { useState } from "react";
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
import { college } from "../lib/college";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { UserRoleType } from "../lib/types";
import { localDb } from "../lib/supabase";
import { EduTrackLogo } from "../components/EduTrackLogo";

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
  const { loginAsRandomDemo, registerAdmin, loginWithCredentials } = useAuth();
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
        "System configuration, department management, approvals, SMS audit logs, and global college oversight.",
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
        "Oversee department teachers, assign class coordinators, manage course curriculum, and review compliance.",
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
        "Quick morning roll call, track present/absent students, trigger automatic parent alerts, and subject logs.",
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
        "Upload student spreadsheets (Excel/CSV), manage batch profiles, and monitor attendance trends.",
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
        "View attendance percentage, track low-attendance threshold warnings, subject breakdowns, and update profile.",
      icon: GraduationCap,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      buttonLabel: "Student Portal",
      role: "student",
    },
  ];

  const handleCardClick = (card: PortalCard) => {
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
    await loginAsRandomDemo();
    setLoading(false);
    navigate("/dashboard", { replace: true });
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

    if (selectedRole === "teacher") {
      navigate("/teacher/dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
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
    <div className="min-h-screen bg-background bg-grid-green-sm text-foreground transition-colors duration-200">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EduTrackLogo variant="horizontal" size="sm" showTagline={false} />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground/90">
                {college.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Session 2025–26</span>
            </span>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
              title="Toggle color theme"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4 text-slate-700" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <section className="w-full text-center space-y-4 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          <div className="flex justify-center mb-2">
            <EduTrackLogo variant="full" size="lg" showTagline={true} />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Academic Portal Hub
          </h1>

          <p className="text-sm sm:text-base text-foreground/80 dark:text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Welcome to the centralized attendance and academic administration
            network. Select your assigned institutional role below to sign in.
          </p>

          {/* Interactive Category Filter Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-xs ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                  : "bg-card/90 border border-border text-foreground/90 hover:bg-secondary hover:text-foreground"
              }`}
            >
              All Portals (5)
            </button>
            <button
              onClick={() => setActiveCategory("admin")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-xs ${
                activeCategory === "admin"
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                  : "bg-card/90 border border-border text-foreground/90 hover:bg-secondary hover:text-foreground"
              }`}
            >
              Administration (2)
            </button>
            <button
              onClick={() => setActiveCategory("faculty")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-xs ${
                activeCategory === "faculty"
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                  : "bg-card/90 border border-border text-foreground/90 hover:bg-secondary hover:text-foreground"
              }`}
            >
              Faculty & Teachers (2)
            </button>
            <button
              onClick={() => setActiveCategory("student")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-xs ${
                activeCategory === "student"
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                  : "bg-card/90 border border-border text-foreground/90 hover:bg-secondary hover:text-foreground"
              }`}
            >
              Students (1)
            </button>
          </div>
        </section>

        {/* Instant Demo & Study Mode Callout */}
        <section className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-5 sm:p-6 shadow-sm text-left sm:flex sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 mb-4 sm:mb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                Study Demo Mode · Interactive Walkthrough
              </h2>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                NO LOGIN REQUIRED
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Explore how EduTrack works with a 1-click random demo dashboard
              loaded with dummy faculty and student profiles, live attendance
              logs, and automated notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={handleRandomDemoLogin}
              disabled={loading}
              className="gap-2 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95 px-5 py-2.5 text-sm"
            >
              <Shuffle className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Launch Random Demo Dashboard</span>
            </Button>
          </div>
        </section>

        {/* Portal Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.role}
                onClick={() => handleCardClick(card)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 shadow-sm hover:shadow-xl hover:border-primary/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Top decorative accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Card Header: Icon + Badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 ${card.iconBg} ${card.iconColor} group-hover:scale-105 transition-transform duration-200 shadow-xs`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 bg-secondary text-secondary-foreground border border-border/70"
                    >
                      {card.badge}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display text-lg font-extrabold text-foreground group-hover:text-primary transition-colors mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {card.description}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-border/70 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1 font-bold group/btn shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(card);
                    }}
                  >
                    <span>Sign In</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        {/* System Capabilities Banner */}
        <section className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 sm:p-7 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">
                  Instant Morning Roll Call
                </h4>
                <p className="text-xs text-foreground/80 dark:text-muted-foreground mt-1 leading-relaxed">
                  Teachers take attendance in under 60 seconds with bulk
                  selection and absent toggling.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">
                  Automated Parent SMS Alerts
                </h4>
                <p className="text-xs text-foreground/80 dark:text-muted-foreground mt-1 leading-relaxed">
                  Parents receive immediate notifications upon subject absence
                  with full delivery tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">
                  Audit-Ready Attendance Reports
                </h4>
                <p className="text-xs text-foreground/80 dark:text-muted-foreground mt-1 leading-relaxed">
                  Automated 75% defaulter warnings and 1-click university
                  compliant PDF generation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-4 pb-8 border-t border-border/80 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/70">
            © {new Date().getFullYear()} EduTrack · Official Academic Management
            System
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Engineered for high-reliability academic tracking and parent
            communication.
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
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-2xl animate-in p-6 sm:p-7">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                {(() => {
                  const roleInfo = portalCards.find(
                    (c) => c.role === selectedRole,
                  );
                  if (!roleInfo) return null;
                  const Icon = roleInfo.icon;
                  return <Icon className="h-6 w-6" />;
                })()}
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
              <div className="mb-5 flex rounded-lg border border-border bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setAdminMode("login")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                    adminMode === "login"
                      ? "bg-card text-foreground shadow-xs"
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
                      ? "bg-card text-foreground shadow-xs"
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

            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                        ? "e.g. 101 or alex.h@student.edutrack.edu"
                        : selectedRole === "hod"
                          ? "e.g. hod.cse@edutrack.edu or EMP-CSE-01"
                          : selectedRole === "teacher"
                            ? "e.g. teacher@edutrack.edu or EMP-CSE-02"
                            : selectedRole === "class_coordinator"
                              ? "e.g. cc@edutrack.edu or EMP-CSE-04"
                              : "admin@edutrack.com"
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
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
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

              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {selectedRole === "admin" && adminMode === "register"
                  ? "Create Admin Account"
                  : "Continue to Portal"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
