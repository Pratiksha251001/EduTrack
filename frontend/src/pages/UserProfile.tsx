import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  Loader2,
  Shield,
  GraduationCap,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb, isSupabaseConfigured } from "../lib/supabase";
import {
  hasCustomPassword,
  markCustomPasswordSet,
  saveCredential,
  isDefaultPassword,
} from "../lib/authUtils";
import {
  cleanMobile,
  isValid10DigitMobile,
  getMobileValidationError,
  sanitizeMobileInput,
} from "../lib/validation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const UserProfile: React.FC = () => {
  const {
    user,
    role,
    isDemo,
    mustChangePassword,
    updateUserPassword,
    openLogoutConfirm,
  } = useAuth();
  const [, setDataVersion] = useState(0);
  useEffect(() => {
    const refreshData = () => setDataVersion((value) => value + 1);
    window.addEventListener("edutrack_data_updated", refreshData);
    window.addEventListener("storage", refreshData);
    return () => {
      window.removeEventListener("edutrack_data_updated", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  // Find linked student or teacher data if available
  const student = useMemo(() => {
    if (role !== "student") return null;
    return (
      localDb.students.find(
        (s) =>
          s.id === user?.student_id ||
          (user?.id && s.user_id === user.id) ||
          (user?.roll_number && s.roll_number === user.roll_number) ||
          (user?.email && s.email?.toLowerCase() === user.email.toLowerCase()),
      ) || null
    );
  }, [role, user]);

  const teacher = useMemo(() => {
    if (role === "student" || role === "admin") return null;
    return (
      localDb.teachers.find(
        (t) =>
          t.id === user?.teacher_id ||
          (user?.employee_id && t.employee_id === user.employee_id) ||
          (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()),
      ) || null
    );
  }, [role, user]);

  const departmentId =
    student?.department_id || teacher?.department_id || user?.department_id;

  const department = useMemo(() => {
    return localDb.departments.find((d) => d.id === departmentId) || null;
  }, [departmentId]);

  const userIdentifiers = useMemo(() => {
    if (!user) return [];
    return [
      user.id,
      user.email,
      user.teacher_id,
      user.student_id,
      user.employee_id,
      user.roll_number,
      student?.roll_number,
      student?.email,
      teacher?.employee_id,
      teacher?.email,
    ].filter(Boolean) as string[];
  }, [user, student, teacher]);

  const isCustomPwd =
    isSupabaseConfigured && !isDemo
      ? !mustChangePassword
      : hasCustomPassword(userIdentifiers);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  // Contact edit state
  const [mobileVal, setMobileVal] = useState(
    student?.student_mobile || teacher?.mobile || "",
  );
  const [parentNameVal, setParentNameVal] = useState(
    student?.parent_name || "",
  );
  const [parentMobileVal, setParentMobileVal] = useState(
    student?.parent_mobile || "",
  );
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    setMobileVal(student?.student_mobile || teacher?.mobile || "");
    setParentNameVal(student?.parent_name || "");
    setParentMobileVal(student?.parent_mobile || "");
  }, [student, teacher]);

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess(null);
    setContactError(null);
    if (mobileVal) {
      const err = getMobileValidationError(mobileVal, "Mobile Number", false);
      if (err) {
        setContactError(err);
        return;
      }
    }
    if (role === "student" && parentMobileVal) {
      const err = getMobileValidationError(
        parentMobileVal,
        "Parent Mobile Number",
        false,
      );
      if (err) {
        setContactError(err);
        return;
      }
    }
    setIsSavingContact(true);
    const cleaned = cleanMobile(mobileVal) || null;
    const cleanedParentMobile = cleanMobile(parentMobileVal) || null;
    const cleanedParentName = parentNameVal.trim() || null;
    try {
      if (student) {
        await localDb.update("students", student.id, {
          student_mobile: cleaned,
          parent_name: cleanedParentName,
          parent_mobile: cleanedParentMobile,
        });
        student.student_mobile = cleaned || undefined;
        student.parent_name = cleanedParentName || undefined;
        student.parent_mobile = cleanedParentMobile || undefined;
        setContactSuccess("Contact and parent details updated successfully.");
      } else if (teacher) {
        await localDb.update("teachers", teacher.id, { mobile: cleaned });
        teacher.mobile = cleaned || undefined;
        setContactSuccess("Mobile number updated successfully.");
      }
      setTimeout(() => setContactSuccess(null), 3500);
    } catch (err: any) {
      setContactError(err?.message || "Failed to update contact details.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    const clean = newPassword.trim();
    if (clean.length < 8) {
      setPwdError("Password must be at least 8 characters long.");
      return;
    }
    if (clean !== confirmPassword.trim()) {
      setPwdError("Passwords do not match. Please verify both fields.");
      return;
    }
    if (
      isDefaultPassword(clean, role, {
        employee_id: user?.employee_id || teacher?.employee_id,
        roll_number: user?.roll_number || student?.roll_number,
        email: user?.email,
        id: user?.id,
      })
    ) {
      setPwdError(
        "Please choose a unique personal password rather than a default password.",
      );
      return;
    }

    setPwdLoading(true);
    try {
      const result = await updateUserPassword(clean);
      if (!result.ok) {
        setPwdError(result.message || "Password could not be updated.");
        return;
      }
      markCustomPasswordSet(userIdentifiers);
      setPwdSuccess("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdSuccess(null), 4000);
    } catch (err: any) {
      setPwdError(err?.message || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const fullName =
    user?.full_name || teacher?.full_name || student?.full_name || "User";
  const email = user?.email || teacher?.email || student?.email || "—";
  const roleLabel = role
    ? role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "User";

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              My Profile
            </h1>
            <p className="text-xs text-muted-foreground">
              Account details and security settings
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="capitalize text-xs font-semibold px-2.5 py-1"
        >
          {roleLabel}
        </Badge>
      </div>

      {/* Main Profile Info Card */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold font-display text-xl shrink-0 shadow-xs">
            {role === "student" ? (
              <GraduationCap className="h-8 w-8" />
            ) : role === "admin" ? (
              <Shield className="h-8 w-8" />
            ) : (
              fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground truncate">
                {fullName}
              </h2>
              <Badge variant="secondary" className="text-[11px] capitalize">
                {roleLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{email}</span>
            </p>
            {department && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {department.name} ({department.code})
                </span>
              </p>
            )}
          </div>

          <div className="self-start sm:self-center shrink-0">
            {isCustomPwd ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Custom Password
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <AlertCircle className="h-3 w-3" /> Default Password
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Account Details & Contact Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <p className="text-[11px] text-muted-foreground font-medium">
                Full Name
              </p>
              <p className="font-semibold text-foreground mt-0.5">{fullName}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <p className="text-[11px] text-muted-foreground font-medium">
                Email Address
              </p>
              <p className="font-semibold text-foreground mt-0.5">{email}</p>
            </div>
            {(user?.employee_id || teacher?.employee_id) && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Employee ID
                </p>
                <p className="font-semibold font-mono text-foreground mt-0.5">
                  {user?.employee_id || teacher?.employee_id}
                </p>
              </div>
            )}
            {(user?.roll_number || student?.roll_number) && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Roll Number
                </p>
                <p className="font-semibold font-mono text-foreground mt-0.5">
                  {user?.roll_number || student?.roll_number}
                </p>
              </div>
            )}
            {student?.class_name && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Class
                </p>
                <p className="font-semibold text-foreground mt-0.5">
                  {student.class_name}
                </p>
              </div>
            )}
            {student?.semester && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Semester
                </p>
                <p className="font-semibold text-foreground mt-0.5">
                  Semester {student.semester}
                </p>
              </div>
            )}
            {department && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Department
                </p>
                <p className="font-semibold text-foreground mt-0.5">
                  {department.name}
                </p>
              </div>
            )}
          </div>

          {role === "student" && student && (
            <form
              onSubmit={handleUpdateContact}
              className="pt-3 border-t border-border/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  Contact & Parent Details
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Update student and parent contact info
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>Student Mobile</span>
                  </label>
                  <Input
                    value={mobileVal}
                    onChange={(e) =>
                      setMobileVal(sanitizeMobileInput(e.target.value))
                    }
                    maxLength={10}
                    placeholder="10-digit mobile"
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>Parent Name</span>
                  </label>
                  <Input
                    value={parentNameVal}
                    onChange={(e) => setParentNameVal(e.target.value)}
                    placeholder="Parent's Name"
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>Parent Mobile</span>
                  </label>
                  <Input
                    value={parentMobileVal}
                    onChange={(e) =>
                      setParentMobileVal(sanitizeMobileInput(e.target.value))
                    }
                    maxLength={10}
                    placeholder="10-digit mobile"
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                <div className="min-h-5">
                  {contactError && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {contactError}
                    </p>
                  )}
                  {contactSuccess && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {contactSuccess}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingContact}
                  className="h-8 text-xs font-medium self-end sm:self-auto"
                >
                  {isSavingContact ? "Saving..." : "Save Contact Details"}
                </Button>
              </div>
            </form>
          )}

          {role !== "student" && teacher && (
            <form
              onSubmit={handleUpdateContact}
              className="pt-2 border-t border-border/60"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2.5">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Mobile Number</span>
                  </label>
                  <Input
                    value={mobileVal}
                    onChange={(e) =>
                      setMobileVal(sanitizeMobileInput(e.target.value))
                    }
                    maxLength={10}
                    placeholder="Enter 10-digit mobile"
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingContact}
                  className="h-9 text-xs font-medium"
                >
                  {isSavingContact ? "Saving..." : "Save Mobile"}
                </Button>
              </div>
              {contactError && (
                <p className="text-xs text-destructive mt-2 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {contactError}
                </p>
              )}
              {contactSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {contactSuccess}
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="text-xs h-9 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Confirm Password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="text-xs h-9"
                />
              </div>
            </div>

            {pwdError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={pwdLoading || !newPassword || !confirmPassword}
              className="text-xs font-semibold h-9"
            >
              {pwdLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sign Out Card */}
      <Card className="p-4 border-destructive/20 bg-destructive/[0.02]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Active Session
            </p>
            <p className="text-[11px] text-muted-foreground">
              Sign out of EduTrack on this browser.
            </p>
          </div>
          <Button
            id="profile-logout-btn"
            variant="outline"
            size="sm"
            onClick={openLogoutConfirm}
            className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Log Out
          </Button>
        </div>
      </Card>
    </div>
  );
};
