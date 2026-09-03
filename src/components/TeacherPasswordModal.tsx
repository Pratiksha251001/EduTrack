import React, { useState } from "react";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  User,
  ShieldCheck,
} from "lucide-react";
import { Teacher } from "../lib/types";
import { saveCredential, getCredential, markCustomPasswordSet } from "../lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface TeacherPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
  onSuccess?: (message: string) => void;
}

export const TeacherPasswordModal: React.FC<TeacherPasswordModalProps> = ({
  open,
  onOpenChange,
  teacher,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!teacher) return null;

  const currentSavedPassword =
    getCredential(
      teacher.id,
      `teacher-user-${teacher.id}`,
      teacher.employee_id,
      teacher.email,
      `hod_${teacher.id}`
    ) || teacher.employee_id || "Teacher@123";

  const handleResetToEmpId = () => {
    const defaultPwd = teacher.employee_id || "Teacher@123";
    const accountId = `teacher-user-${teacher.id}`;
    const identifiers = [
      accountId,
      teacher.id,
      teacher.employee_id,
      teacher.email,
      `hod_${teacher.id}`,
    ];

    saveCredential(identifiers, defaultPwd);
    setSuccessMsg(`Password successfully reset to Employee ID: ${defaultPwd}`);
    setTimeout(() => {
      setSuccessMsg(null);
      onSuccess?.(`Password reset to Employee ID for ${teacher.full_name}`);
      onOpenChange(false);
    }, 1200);
  };

  const handleSavePassword = () => {
    const cleanPwd = newPassword.trim();
    if (!cleanPwd) {
      alert("Please enter a valid password.");
      return;
    }
    if (cleanPwd.length < 3) {
      alert("Password must be at least 3 characters long.");
      return;
    }

    setIsSaving(true);
    const accountId = `teacher-user-${teacher.id}`;
    const identifiers = [
      accountId,
      teacher.id,
      teacher.employee_id,
      teacher.email,
      `hod_${teacher.id}`,
    ];

    saveCredential(identifiers, cleanPwd);
    markCustomPasswordSet(identifiers);

    setIsSaving(false);
    setSuccessMsg(`Password updated to: ${cleanPwd}`);
    setTimeout(() => {
      setSuccessMsg(null);
      setNewPassword("");
      onSuccess?.(`Password updated for ${teacher.full_name}`);
      onOpenChange(false);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-5 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-display">
                Manage Faculty Password
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Set or reset portal login credentials for {teacher.full_name}
              </p>
            </div>
          </div>
        </DialogHeader>

        {successMsg ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
            <p className="text-sm font-semibold text-foreground">{successMsg}</p>
            <p className="text-xs text-muted-foreground">Updated successfully.</p>
          </div>
        ) : (
          <div className="py-3 space-y-4">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{teacher.full_name}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {teacher.employee_id}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span className="block text-foreground/70">Designation / Role:</span>
                  <span className="capitalize font-semibold text-foreground">
                    {teacher.designation || teacher.role}
                  </span>
                </div>
                <div>
                  <span className="block text-foreground/70">Current Password:</span>
                  <span className="font-mono font-bold text-primary">
                    {currentSavedPassword}
                  </span>
                </div>
              </div>
            </div>

            {/* Reset to Employee ID */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3">
              <div className="text-xs">
                <p className="font-semibold text-foreground">Default Employee ID Password</p>
                <p className="text-[11px] text-muted-foreground">
                  Reset password to Employee ID:{" "}
                  <span className="font-mono font-bold">{teacher.employee_id}</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetToEmpId}
                className="h-8 text-xs shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1 text-primary" />
                Reset to Emp ID
              </Button>
            </div>

            {/* Set New Custom Password */}
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-foreground block">
                Or Set a Custom Password for this faculty:
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (e.g. Faculty@123)"
                  className="h-9 text-xs pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Teacher can sign in with Employee ID (<code className="font-bold">{teacher.employee_id}</code>) or Email and this password.
              </p>
            </div>

            <DialogFooter className="pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePassword}
                disabled={isSaving || !newPassword.trim()}
              >
                {isSaving ? "Saving..." : "Save Password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
