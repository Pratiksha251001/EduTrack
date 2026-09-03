import React, { useMemo } from "react";
import {
  LogOut,
  Shield,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { college } from "../lib/college";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface LogoutConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: () => void | Promise<void>;
  loading?: boolean;
}

export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  loading,
}) => {
  const auth = useAuth();
  const { user, role } = auth;

  const isOpen = open !== undefined ? open : auth.isLogoutConfirmOpen;
  const handleOpenChange =
    onOpenChange ||
    ((openVal: boolean) => {
      if (!openVal) auth.closeLogoutConfirm();
    });
  const handleConfirm = onConfirm || auth.confirmLogout;
  const isLoading = loading !== undefined ? loading : auth.isLoggingOut;

  // Retrieve department or academic details if relevant
  const department = useMemo(() => {
    if (!user) return null;
    const deptId =
      user.department_id ||
      localDb.students.find((s) => s.id === user.student_id)?.department_id ||
      localDb.teachers.find((t) => t.id === user.teacher_id)?.department_id;
    return localDb.departments.find((d) => d.id === deptId) || null;
  }, [user]);

  // Role metadata and visual styling
  const roleConfig = useMemo(() => {
    switch (role) {
      case "admin":
        return {
          title: "System Administrator",
          icon: Shield,
          badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
          sublabel: "Administrative Control Center",
        };
      case "hod":
        return {
          title: "Head of Department (HOD)",
          icon: Building2,
          badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
          sublabel: department?.name ? `Department of ${department.name}` : "Academic Department Head",
        };
      case "class_coordinator":
        return {
          title: "Class Coordinator",
          icon: Users,
          badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          sublabel: department?.name ? `${department.code} Academic Coordinator` : "Batch Coordinator",
        };
      case "teacher":
        return {
          title: "Faculty Teacher",
          icon: BookOpen,
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          sublabel: department?.name ? `Faculty · ${department.code}` : "Academic Faculty",
        };
      case "student":
        return {
          title: "Student Scholar",
          icon: GraduationCap,
          badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
          sublabel: user?.roll_number
            ? `Roll No: ${user.roll_number} · ${department?.code || "Enrolled"}`
            : department?.name || "Enrolled Student",
        };
      default:
        return {
          title: "Institutional User",
          icon: Shield,
          badgeClass: "bg-muted text-muted-foreground border-border",
          iconBg: "bg-muted text-muted-foreground",
          sublabel: "EduTrack Session",
        };
    }
  }, [role, department, user]);

  const RoleIcon = roleConfig.icon;

  // Name initials
  const initials = useMemo(() => {
    if (!user?.full_name) return "U";
    return user.full_name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.full_name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        id="logout-confirm-modal"
        className="max-w-md border-border bg-card p-6 shadow-2xl rounded-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="items-center text-center pb-2">
          {/* Pulsing red logout alert emblem */}
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/25 shadow-xs">
            <LogOut className="h-7 w-7 transition-transform group-hover:scale-110" />
          </div>
          <DialogTitle className="font-display text-xl font-bold text-foreground">
            Confirm Sign Out
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
            Are you sure you want to end your active session? You will need to enter your credentials to log in again.
          </p>
        </DialogHeader>

        {/* Current user session snippet card */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4 my-3.5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            {/* Initials avatar */}
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs border border-border/60 ${roleConfig.iconBg}`}>
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-foreground truncate">
                  {user?.full_name || "Active Session"}
                </p>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-semibold border ${roleConfig.badgeClass}`}
                >
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {roleConfig.title}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || "Signed-in User"}
              </p>
              <p className="text-[11px] text-muted-foreground/80 font-medium truncate mt-0.5">
                {roleConfig.sublabel}
              </p>
            </div>
          </div>
        </div>

        {/* Session notice */}
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="leading-snug text-[11.5px]">
            Your attendance records and system actions are safely synced. Signing out clears temporary credentials from this browser.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-5 sm:justify-end">
          <Button
            id="cancel-logout-btn"
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto font-medium"
          >
            Stay Logged In
          </Button>
          <Button
            id="confirm-logout-btn"
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing Out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-1.5" />
                Yes, Sign Out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
