import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { college } from "../lib/college";
import { EduTrackLogo } from "./EduTrackLogo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  Loader2,
  Lock,
} from "lucide-react";
import { isDefaultPassword } from "../lib/authUtils";

export const ForcePasswordChangeModal: React.FC = () => {
  const { user, role, mustChangePassword, updateUserPassword, openLogoutConfirm } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If user is admin or mustChangePassword is false, do not render
  if (!user || role === "admin" || !mustChangePassword) {
    return null;
  }

  const roleLabel =
    role === "hod"
      ? "Head of Department (HOD)"
      : role === "class_coordinator"
      ? "Class Coordinator"
      : role === "teacher"
      ? "Faculty Member"
      : "Student";

  // Requirement checks
  const isMinLength = newPassword.length >= 6;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isNotDefault =
    newPassword.length > 0 &&
    !isDefaultPassword(newPassword, role, {
      employee_id: user.employee_id,
      roll_number: user.roll_number,
      email: user.email,
      id: user.id,
    });

  const canSubmit = isMinLength && isMatch && isNotDefault && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMinLength) {
      setErrorMessage("Password must contain at least 6 characters.");
      return;
    }

    if (!isMatch) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }

    if (!isNotDefault) {
      setErrorMessage(
        "You cannot use a default institutional password (such as HOD@123, CC@123, Teacher@123, 123, or your roll number/employee ID). Please choose your own secure password."
      );
      return;
    }

    setLoading(true);
    const result = await updateUserPassword(newPassword);
    setLoading(false);

    if (!result.ok) {
      setErrorMessage(result.message || "Failed to update password.");
      return;
    }

    setSuccessMessage("Password set successfully! Unlocking your account...");
  };

  const handleSignOut = () => {
    openLogoutConfirm();
  };

  return (
    <div
      id="force-password-change-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="force-password-change-card"
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Institutional Badge */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <EduTrackLogo size="sm" variant="horizontal" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium text-amber-600 dark:text-amber-400">Security Requirement</span>
          </div>
        </div>

        {/* Header Title and Explanation */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Set Your Personal Password
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            You signed in using a default temporary password. To safeguard your account and institutional records, please set your own private password before accessing the system.
          </p>
        </div>

        {/* User Account Info Chip */}
        <div className="mb-6 rounded-xl border border-border/80 bg-muted/40 p-3.5 flex items-center justify-between text-xs">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
              Logged in as ({roleLabel})
            </p>
            <p className="font-semibold text-foreground text-sm truncate mt-0.5">
              {user.full_name}
            </p>
            <p className="text-muted-foreground text-[11px] truncate">
              {user.roll_number
                ? `Roll No: ${user.roll_number}`
                : user.employee_id
                ? `Employee ID: ${user.employee_id}`
                : user.email}
            </p>
          </div>
          <div className="ml-3 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Lock className="h-3 w-3" />
              {roleLabel}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              New Personal Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Choose a strong private password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                required
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Real-time Checklist */}
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-[11px] mb-1">
              Password Requirements:
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  isMinLength
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/50"
                }`}
              />
              <span className={isMinLength ? "text-foreground font-medium" : ""}>
                At least 6 characters long
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  isNotDefault
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/50"
                }`}
              />
              <span className={isNotDefault ? "text-foreground font-medium" : ""}>
                Different from default institutional passwords
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  isMatch
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/50"
                }`}
              />
              <span className={isMatch ? "text-foreground font-medium" : ""}>
                Both passwords match
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={!canSubmit}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Save Password & Enter System
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
              disabled={loading}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Cancel & Sign Out
            </Button>
          </div>
        </form>

        <div className="mt-5 text-center text-[11px] text-muted-foreground border-t border-border pt-3">
          {college.name} · Official EduTrack Security Safeguard
        </div>
      </div>
    </div>
  );
};
