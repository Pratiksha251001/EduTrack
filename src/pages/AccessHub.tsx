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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { college } from "../lib/college";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { UserRoleType } from "../lib/types";
import { localDb } from "../lib/supabase";

interface PortalCard {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  buttonLabel: string;
  role: UserRoleType;
  demoEnabled?: boolean;
}

export const AccessHub: React.FC = () => {
  const { loginAsDemo, registerAdmin, loginWithCredentials } = useAuth();
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

  const portalCards: PortalCard[] = [
    {
      title: "Admin Login",
      description:
        "Administrator access for system configuration, departments creation, approvals, and full platform management.",
      icon: Shield,
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
      buttonLabel: "Admin Dashboard",
      role: "admin",
      demoEnabled: false,
    },
    {
      title: "HOD Login",
      description:
        "Head of Department access to manage teachers, assign class coordinators, and oversee department operations.",
      icon: Building2,
      iconBg: "bg-teal-500/15",
      iconColor: "text-teal-400",
      buttonLabel: "HOD Dashboard",
      role: "hod",
      demoEnabled: false,
    },
    {
      title: "Teacher Login",
      description:
        "Faculty access to mark attendance, manage assigned subjects, and view class performance reports.",
      icon: Users,
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
      buttonLabel: "Teacher Portal",
      role: "teacher",
      demoEnabled: true,
    },
    {
      title: "Class Teacher Login",
      description:
        "Class coordinator access to add students via Excel/CSV, manage student profiles, and view class attendance.",
      icon: UserCog,
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      buttonLabel: "CC Dashboard",
      role: "class_coordinator",
      demoEnabled: true,
    },
    {
      title: "Student Login",
      description:
        "Student self-service portal to view and edit personal information, check attendance records, and view reports.",
      icon: GraduationCap,
      iconBg: "bg-fuchsia-500/15",
      iconColor: "text-fuchsia-400",
      buttonLabel: "Student Portal",
      role: "student",
      demoEnabled: false,
    },
  ];

  const handleCardClick = (card: PortalCard) => {
    setSelectedRole(card.role);
    setAdminMode(
      card.role === "admin" && !localStorage.getItem("smit_admin_account")
        ? "register"
        : "login",
    );
    setShowLoginModal(true);
    setDepartmentId("");
  };

  const handleDemoLogin = async (role: UserRoleType) => {
    setLoading(true);
    await loginAsDemo(role);
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
    if (selectedRole === "admin") {
      setLoading(true);
      const result = await loginWithCredentials("admin", email, password);
      setLoading(false);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      navigate("/dashboard", { replace: true });
      return;
    }
    if (selectedRole === "hod") {
      if (!departmentId) {
        alert("Select your assigned department.");
        return;
      }
      setLoading(true);
      const result = await loginWithCredentials(
        "hod",
        email,
        password,
        departmentId,
      );
      setLoading(false);
      if (!result.ok) {
        alert(result.message);
        return;
      }
      navigate("/dashboard", { replace: true });
      return;
    }
    if (selectedRole === "student" && password !== "123") {
      alert("Student default password is the enrollment number: 123");
      return;
    }
    setLoading(true);
    await loginAsDemo(selectedRole);
    setLoading(false);
    navigate(selectedRole === "student" ? "/profile" : "/dashboard", {
      replace: true,
    });
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

  return (
    <div className="access-hub min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 backdrop-blur-sm hover:bg-white/10 transition-colors"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-3 sm:py-6">
        <div className="rounded-xl border border-white/10 bg-[#182338]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-white/5">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-black text-lg">E</span>
              </div>
              <span className="font-display text-xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                {college.shortName || "EduTrack"}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              EduTrack Portal Hub
            </h1>
            <p className="mt-1.5 text-sm text-white/50">
              Select your destination to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {portalCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-lg border border-white/10 bg-white/[0.025] p-4 text-center hover:border-white/20 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
                  onClick={() => handleCardClick(card)}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor} group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-white text-xs mb-1.5">
                        {card.title}
                      </h3>
                      <p className="text-[10px] text-white/50 leading-relaxed mb-3 min-h-[30px]">
                        {card.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0e1728] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-white/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (card.demoEnabled) {
                              handleDemoLogin(card.role);
                            } else {
                              handleCardClick(card);
                            }
                          }}
                        >
                          {card.buttonLabel}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 pb-6 pt-2 border-t border-white/5">
            <p className="text-center text-[11px] text-white/30">
              © {new Date().getFullYear()} {college.name} — Secure Access
              Portal. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {showLoginModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#141d33] shadow-2xl animate-in">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-7">
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 border border-emerald-400/20">
                  {(() => {
                    const roleInfo = portalCards.find(
                      (c) => c.role === selectedRole,
                    );
                    if (!roleInfo) return null;
                    const Icon = roleInfo.icon;
                    return <Icon className={`h-7 w-7 ${roleInfo.iconColor}`} />;
                  })()}
                </div>
                <h2 className="font-display text-xl font-bold text-white">
                  {portalCards.find((c) => c.role === selectedRole)?.title ||
                    "Sign In"}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Enter your credentials to continue
                </p>
              </div>

              {selectedRole === "admin" && (
                <div className="mb-5 flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
                  <button
                    type="button"
                    onClick={() => setAdminMode("login")}
                    className={`flex-1 rounded-md py-2 text-xs font-semibold ${adminMode === "login" ? "bg-emerald-500 text-white" : "text-white/50"}`}
                  >
                    Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminMode("register")}
                    className={`flex-1 rounded-md py-2 text-xs font-semibold ${adminMode === "register" ? "bg-emerald-500 text-white" : "text-white/50"}`}
                  >
                    First-time Registration
                  </button>
                </div>
              )}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {selectedRole === "admin" && adminMode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/60">
                      Full Name
                    </label>
                    <Input
                      required
                      placeholder="Institution Administrator"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                )}
                {selectedRole === "hod" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Assigned Department
                    </label>
                    <select
                      required
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground"
                    >
                      <option value="">Select department...</option>
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
                  <label className="text-xs font-semibold text-white/60">
                    {selectedRole === "student"
                      ? "Student Email / Enrollment"
                      : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      required
                      type={selectedRole === "student" ? "text" : "email"}
                      placeholder={
                        selectedRole === "student"
                          ? "alex.h@student.edutrack.edu"
                          : "you@edutrack.edu"
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:ring-emerald-400/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:ring-emerald-400/20"
                    />
                    {selectedRole === "student" && (
                      <p className="mt-1 text-[11px] text-emerald-300/80">
                        Default password: your enrollment number. Demo
                        enrollment: 123.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold shadow-lg shadow-emerald-500/20"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {selectedRole === "admin" && adminMode === "register"
                    ? "Create Admin Account"
                    : "Sign In"}
                </Button>
              </form>

              {portalCards.find((c) => c.role === selectedRole)
                ?.demoEnabled && (
                <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Quick Demo Access
                  </div>
                  <p className="text-[11px] text-white/40 mb-3">
                    Skip the form and try the dashboard instantly with demo
                    credentials.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full bg-white/10 text-white hover:bg-white/15 border-0"
                    onClick={() => handleDemoLogin(selectedRole)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Launch Demo{" "}
                    {portalCards
                      .find((c) => c.role === selectedRole)
                      ?.title.replace(" Login", "")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
