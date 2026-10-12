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
  AlertCircle,
} from "lucide-react";
import { Student } from "../lib/types";
import { localDb } from "../lib/supabase";
import { saveCredential, getCredential, markCustomPasswordSet } from "../lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface StudentPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  // If batch mode:
  isBatch?: boolean;
  studentsList?: Student[];
  semesterName?: string;
  onSuccess?: (message: string) => void;
}

export const StudentPasswordModal: React.FC<StudentPasswordModalProps> = ({
  open,
  onOpenChange,
  student,
  isBatch = false,
  studentsList = [],
  semesterName,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [batchOption, setBatchOption] = useState<"enrollment" | "custom">("enrollment");
  const [batchCustomPassword, setBatchCustomPassword] = useState("Student@123");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // For single student: check current saved password or default
  const currentSavedPassword = student
    ? getCredential(
        student.id,
        `student-user-${student.id}`,
        student.roll_number,
        student.reg_number,
        student.email
      ) || student.roll_number
    : null;

  const handleResetToEnrollment = () => {
    if (!student) return;
    const defaultPwd = student.roll_number || "123";
    const accountId = `student-user-${student.id}`;
    const identifiers = [
      accountId,
      student.id,
      student.roll_number,
      student.reg_number,
      student.email,
    ];

    saveCredential(identifiers, defaultPwd);
    setSuccessMsg(`Password successfully reset to student enrollment number: ${defaultPwd}`);
    setTimeout(() => {
      setSuccessMsg(null);
      onSuccess?.(`Password reset to enrollment number for ${student.full_name}`);
      onOpenChange(false);
    }, 1200);
  };

  const handleSaveSinglePassword = () => {
    if (!student) return;
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
    const accountId = `student-user-${student.id}`;
    const identifiers = [
      accountId,
      student.id,
      student.roll_number,
      student.reg_number,
      student.email,
    ];

    saveCredential(identifiers, cleanPwd);
    markCustomPasswordSet(identifiers);

    setIsSaving(false);
    setSuccessMsg(`Password updated to: ${cleanPwd}`);
    setTimeout(() => {
      setSuccessMsg(null);
      setNewPassword("");
      onSuccess?.(`Password updated for ${student.full_name}`);
      onOpenChange(false);
    }, 1200);
  };

  const handleExecuteBatchPassword = () => {
    if (studentsList.length === 0) return;
    setIsSaving(true);

    let updatedCount = 0;
    studentsList.forEach((s) => {
      const accountId = `student-user-${s.id}`;
      const identifiers = [
        accountId,
        s.id,
        s.roll_number,
        s.reg_number,
        s.email,
      ];

      const pwd =
        batchOption === "enrollment"
          ? (s.roll_number || "123")
          : (batchCustomPassword.trim() || s.roll_number || "123");

      saveCredential(identifiers, pwd);
      if (batchOption === "custom") {
        markCustomPasswordSet(identifiers);
      }
      updatedCount++;
    });

    setIsSaving(false);
    const msg =
      batchOption === "enrollment"
        ? `Reset passwords for ${updatedCount} students to their individual Enrollment Numbers.`
        : `Updated passwords for ${updatedCount} students to custom password '${batchCustomPassword.trim()}'.`;

    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
      onSuccess?.(msg);
      onOpenChange(false);
    }, 1400);
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
                {isBatch ? "Batch Student Password Manager" : "Set Student Password"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isBatch
                  ? `Configure login credentials for ${studentsList.length} students ${semesterName ? `(${semesterName})` : ""}`
                  : `Manage portal login credentials for ${student?.full_name || "Student"}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {successMsg ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
            <p className="text-sm font-semibold text-foreground">{successMsg}</p>
            <p className="text-xs text-muted-foreground">Changes saved instantly.</p>
          </div>
        ) : isBatch ? (
          /* BATCH PASSWORD MODE */
          <div className="py-3 space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Target: {studentsList.length} Students
              </span>
              <p className="text-muted-foreground">
                Choose whether each student should have their unique Enrollment Number as their password, or if you want to set a specific custom password for all students.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  batchOption === "enrollment"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="batchPwdOption"
                  checked={batchOption === "enrollment"}
                  onChange={() => setBatchOption("enrollment")}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    Reset each student's password to their Enrollment Number (Roll No)
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Example: Student with roll number <code className="font-mono font-bold">21CS101</code> will have password <code className="font-mono font-bold">21CS101</code>.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  batchOption === "custom"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="batchPwdOption"
                  checked={batchOption === "custom"}
                  onChange={() => setBatchOption("custom")}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    Set a uniform custom password for all {studentsList.length} students
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                    Enter the common password you want to assign to everyone:
                  </p>
                  {batchOption === "custom" && (
                    <Input
                      type="text"
                      value={batchCustomPassword}
                      onChange={(e) => setBatchCustomPassword(e.target.value)}
                      placeholder="e.g. Student@123"
                      className="h-8 text-xs font-mono"
                    />
                  )}
                </div>
              </label>
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
                onClick={handleExecuteBatchPassword}
                disabled={isSaving || (batchOption === "custom" && !batchCustomPassword.trim())}
              >
                {isSaving ? "Updating Passwords..." : `Apply to ${studentsList.length} Students`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* SINGLE STUDENT PASSWORD MODE */
          student && (
            <div className="py-3 space-y-4">
              {/* Student Summary Card */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{student.full_name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Sem {student.semester}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <span className="block text-foreground/70">Enrollment / Roll No:</span>
                    <span className="font-mono font-bold text-primary">{student.roll_number}</span>
                  </div>
                  <div>
                    <span className="block text-foreground/70">Active Password:</span>
                    <span className="font-mono font-bold text-foreground">
                      {currentSavedPassword || student.roll_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Reset Option */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Use Enrollment Number as Password</p>
                  <p className="text-[11px] text-muted-foreground">
                    Reset password to roll number: <span className="font-mono font-bold">{student.roll_number}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetToEnrollment}
                  className="h-8 text-xs shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1 text-primary" />
                  Reset to Roll No
                </Button>
              </div>

              {/* Set New Custom Password */}
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-foreground block">
                  Or Set a Custom Password for this student:
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (e.g. Pass@123)"
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
                  The student can log in with their Roll Number (<code className="font-bold">{student.roll_number}</code>) and this new password.
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
                  onClick={handleSaveSinglePassword}
                  disabled={isSaving || !newPassword.trim()}
                >
                  {isSaving ? "Saving..." : "Save New Password"}
                </Button>
              </DialogFooter>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};
