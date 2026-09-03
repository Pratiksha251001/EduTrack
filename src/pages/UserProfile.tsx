import React, { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Lock,
  Save,
  Shield,
  ShieldAlert,
  UserCog,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { college } from "../lib/college";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { hasCustomPassword, isDefaultPassword } from "../lib/authUtils";

export const UserProfile: React.FC = () => {
  const { user, role, updateUserPassword } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Student specific data
  const student = useMemo(() => {
    if (role !== "student") return null;
    return (
      localDb.students.find(
        (s) =>
          s.id === user?.student_id ||
          (user?.roll_number && s.roll_number === user.roll_number) ||
          (user?.email && s.email?.toLowerCase() === user.email.toLowerCase())
      ) || null
    );
  }, [role, user]);

  // Teacher / HOD / CC specific data
  const teacher = useMemo(() => {
    if (role === "student" || role === "admin") return null;
    return (
      localDb.teachers.find(
        (t) =>
          t.id === user?.teacher_id ||
          (user?.employee_id && t.employee_id === user.employee_id) ||
          (user?.email && t.email?.toLowerCase() === user.email.toLowerCase())
      ) || null
    );
  }, [role, user]);

  // Department data
  const departmentId =
    student?.department_id ||
    teacher?.department_id ||
    user?.department_id;

  const department = useMemo(() => {
    return localDb.departments.find((d) => d.id === departmentId);
  }, [departmentId]);

  // Assigned subjects for teachers
  const assignedSubjects = useMemo(() => {
    if (!teacher) return [];
    const teacherSubIds = localDb.teacher_subjects
      .filter((ts) => ts.teacher_id === teacher.id)
      .map((ts) => ts.subject_id);
    return localDb.subjects.filter((s) => teacherSubIds.includes(s.id));
  }, [teacher]);

  // Coordinator specific data
  const coordinatorClass = useMemo(() => {
    if (role !== "class_coordinator" && !teacher?.is_class_coordinator) return null;
    const sem = teacher?.assigned_semester || 5;
    const assignedClass = localDb.academic_classes?.find(
      (c) => c.coordinator_teacher_id === teacher?.id
    );
    const count = localDb.students.filter(
      (s) => (!departmentId || s.department_id === departmentId) && s.semester === sem
    ).length;
    return {
      semester: sem,
      className: assignedClass?.name || `${department?.code || "CSE"} - Sem ${sem}`,
      studentCount: count,
    };
  }, [role, teacher, departmentId, department]);

  // Student attendance calculation
  const studentAttendance = useMemo(() => {
    if (!student) return null;
    const records = localDb.attendance.filter(
      (r) => r.student_id === student.id
    );
    if (records.length === 0) return { total: 0, present: 0, percent: 100 };
    const present = records.filter((r) => r.status === "present").length;
    const percent = Math.round((present / records.length) * 100);
    return { total: records.length, present, percent };
  }, [student]);

  // Password status
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
      student?.reg_number,
      student?.email,
      teacher?.employee_id,
      teacher?.email,
    ];
  }, [user, student, teacher]);

  const isCustomPwd = hasCustomPassword(userIdentifiers);

  // Form states
  const [studentForm, setStudentForm] = useState({
    email: student?.email || "",
    student_mobile: student?.student_mobile || "",
    address: student?.address || "",
  });

  const [teacherMobile, setTeacherMobile] = useState(teacher?.mobile || "");

  // Password form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  const [, setRerender] = useState(0);

  // Student profile update
  const handleSaveStudentProfile = async () => {
    if (!student) return;
    await localDb.update("students", student.id, studentForm);
    alert("Student profile updated successfully.");
    setRerender((v) => v + 1);
  };

  // Teacher contact update
  const handleSaveTeacherContact = async () => {
    if (!teacher) return;
    await localDb.update("teachers", teacher.id, { mobile: teacherMobile });
    alert("Faculty contact details updated successfully.");
    setRerender((v) => v + 1);
  };

  // Student photo upload
  const handleUploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !student) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await localDb.update("students", student.id, {
        photo_url: reader.result as string,
      });
      setRerender((v) => v + 1);
    };
    reader.readAsDataURL(file);
  };

  // Password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    const clean = newPassword.trim();
    if (clean.length < 6) {
      setPwdError("Password must be at least 6 characters long.");
      return;
    }
    if (clean !== confirmPassword.trim()) {
      setPwdError("New passwords do not match. Please verify both fields.");
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
        "You cannot use a default institutional password (such as HOD@123, CC@123, Teacher@123, 123, or your ID). Please choose your own private password."
      );
      return;
    }

    setPwdLoading(true);
    const res = await updateUserPassword(clean);
    setPwdLoading(false);

    if (!res.ok) {
      setPwdError(res.message || "Failed to update password.");
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPwdSuccess("Your personal password has been updated and saved securely.");
  };

  const roleTitle =
    role === "admin"
      ? "System Administrator"
      : role === "hod"
      ? "Head of Department (HOD)"
      : role === "class_coordinator"
      ? "Class Coordinator"
      : role === "teacher"
      ? "Faculty Member"
      : "Enrolled Student";

  return (
    <div id="user-profile-page" className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb / Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              My Profile & Credentials
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage personal account details, role assignments, and login security credentials.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="uppercase tracking-wider font-semibold text-xs py-1 px-3"
        >
          {role?.replace("_", " ")}
        </Badge>
      </div>

      {/* Profile Header Hero Card */}
      <Card className="p-6 border-border bg-gradient-to-r from-card via-card to-primary/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar or Photo */}
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl border-2 border-primary/20 bg-primary/10 flex items-center justify-center text-primary overflow-hidden shadow-xs">
              {role === "student" && student?.photo_url ? (
                <img
                  src={student.photo_url}
                  alt={student.full_name}
                  className="h-full w-full object-cover"
                />
              ) : role === "admin" ? (
                <Shield className="h-10 w-10" />
              ) : role === "hod" ? (
                <Building2 className="h-10 w-10" />
              ) : role === "class_coordinator" ? (
                <UserCog className="h-10 w-10" />
              ) : role === "teacher" ? (
                <Users className="h-10 w-10" />
              ) : (
                <GraduationCap className="h-10 w-10" />
              )}
            </div>

            {role === "student" && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                  title="Upload profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadPhoto}
                />
              </>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-display text-xl font-bold text-foreground truncate">
                {user?.full_name || student?.full_name || teacher?.full_name || "Authorized User"}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" />
                {roleTitle}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {user?.email || student?.email || teacher?.email || "No email listed"}
              </span>

              {department && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {department.name} ({department.code})
                </span>
              )}

              {(user?.employee_id || teacher?.employee_id) && (
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px]">
                  ID: {user?.employee_id || teacher?.employee_id}
                </span>
              )}

              {(user?.roll_number || student?.roll_number) && (
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px]">
                  Roll: {user?.roll_number || student?.roll_number}
                </span>
              )}
            </div>
          </div>

          {/* Password Status Banner */}
          <div className="shrink-0 sm:self-center">
            {isCustomPwd ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Personal Password Active
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4 animate-pulse" />
                Default Password Active
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Primary Column: Profile Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. ADMIN PROFILE VIEW */}
          {role === "admin" && (
            <Card className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Administrator Credentials & Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px] font-medium">Institution</p>
                    <p className="font-bold text-foreground text-sm mt-0.5">{college.name}</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">{college.tagline || "Technical Institute"}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px] font-medium">Governance Role</p>
                    <p className="font-bold text-foreground text-sm mt-0.5">Global System Administrator</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">Full Read/Write Institutional Access</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 p-4 space-y-2">
                  <h4 className="font-semibold text-foreground text-xs">System Permissions</h4>
                  <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                    <li>Management of Academic Departments and HOD assignments</li>
                    <li>Full Faculty Teacher and Staff Registry control</li>
                    <li>Global Student Database, Enrollment, and Audit logging</li>
                    <li>Institution-wide Parent SMS Notification gateway audit</li>
                    <li>University and Departmental Compliance PDF reports</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. HOD PROFILE VIEW */}
          {role === "hod" && (
            <Card className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Department Head (HOD) Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px]">Assigned Department</p>
                    <p className="font-bold text-foreground text-sm mt-0.5">
                      {department?.name || "Computer Science & Engineering"}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">Code: {department?.code || "CSE"}</p>
                  </div>

                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px]">Employee ID</p>
                    <p className="font-bold font-mono text-foreground text-sm mt-0.5">
                      {teacher?.employee_id || user?.employee_id || "EMP-HOD-01"}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">Status: Active Faculty</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Contact Phone / Mobile
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={teacherMobile}
                      onChange={(e) => setTeacherMobile(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                    />
                    <Button size="sm" onClick={handleSaveTeacherContact}>
                      <Save className="h-4 w-4 mr-1.5" /> Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. CLASS COORDINATOR PROFILE VIEW */}
          {role === "class_coordinator" && (
            <Card className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-lime-600 dark:text-lime-400" />
                  Class Coordinator Scope & Class Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px]">Assigned Semester</p>
                    <p className="font-bold text-foreground text-base mt-0.5">
                      Semester {coordinatorClass?.semester || 5}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px]">Designated Class</p>
                    <p className="font-bold text-foreground text-sm mt-0.5">
                      {coordinatorClass?.className || "CSE Batch"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px]">Students Managed</p>
                    <p className="font-bold text-foreground text-base mt-0.5">
                      {coordinatorClass?.studentCount || 0} Students
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Official Mobile Contact
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={teacherMobile}
                      onChange={(e) => setTeacherMobile(e.target.value)}
                      placeholder="+1 (555) 020-1122"
                    />
                    <Button size="sm" onClick={handleSaveTeacherContact}>
                      <Save className="h-4 w-4 mr-1.5" /> Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. TEACHER PROFILE VIEW */}
          {role === "teacher" && (
            <Card className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Faculty Teaching Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px]">Department</p>
                    <p className="font-bold text-foreground text-sm mt-0.5">
                      {department?.name || "Engineering"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3.5 bg-muted/30">
                    <p className="text-muted-foreground text-[11px]">Employee ID</p>
                    <p className="font-bold font-mono text-foreground text-sm mt-0.5">
                      {teacher?.employee_id || user?.employee_id || "EMP-102"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Contact Mobile
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={teacherMobile}
                      onChange={(e) => setTeacherMobile(e.target.value)}
                      placeholder="+1 (555) 014-9921"
                    />
                    <Button size="sm" onClick={handleSaveTeacherContact}>
                      <Save className="h-4 w-4 mr-1.5" /> Save
                    </Button>
                  </div>
                </div>

                {assignedSubjects.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-semibold text-foreground text-xs mb-2 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Assigned Subjects ({assignedSubjects.length})
                    </h4>
                    <div className="space-y-2">
                      {assignedSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-lg border border-border p-2.5 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold font-mono text-xs text-primary mr-2">
                              {sub.code}
                            </span>
                            <span className="font-medium text-foreground text-xs">{sub.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            Sem {sub.semester}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 5. STUDENT PROFILE VIEW */}
          {role === "student" && student && (
            <Card className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Academic & Personal Roster Record
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4 text-xs">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border p-3 bg-muted/30">
                    <p className="text-muted-foreground text-[10px]">Attendance Rate</p>
                    <p className="font-black text-foreground text-lg mt-0.5">
                      {studentAttendance?.percent ?? 100}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3 bg-muted/30">
                    <p className="text-muted-foreground text-[10px]">Enrolled Sem</p>
                    <p className="font-black text-foreground text-lg mt-0.5">
                      Sem {student.semester}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-3 bg-muted/30">
                    <p className="text-muted-foreground text-[10px]">Roll Number</p>
                    <p className="font-black font-mono text-foreground text-lg mt-0.5">
                      {student.roll_number}
                    </p>
                  </div>
                </div>

                {/* Readonly Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border border-border/80 p-3">
                    <span className="text-[11px] text-muted-foreground block">Registration Number</span>
                    <span className="font-semibold text-foreground font-mono">{student.reg_number || "—"}</span>
                  </div>
                  <div className="rounded-lg border border-border/80 p-3">
                    <span className="text-[11px] text-muted-foreground block">Gender</span>
                    <span className="font-semibold text-foreground capitalize">{student.gender || "—"}</span>
                  </div>
                  <div className="rounded-lg border border-border/80 p-3">
                    <span className="text-[11px] text-muted-foreground block">Parent / Guardian</span>
                    <span className="font-semibold text-foreground">{student.parent_name || "—"}</span>
                  </div>
                  <div className="rounded-lg border border-border/80 p-3">
                    <span className="text-[11px] text-muted-foreground block">Parent Registered SMS Mobile</span>
                    <span className="font-semibold text-foreground font-mono">{student.parent_mobile}</span>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="pt-2 border-t border-border space-y-3">
                  <h4 className="font-semibold text-foreground text-xs">Self-Editable Contact Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Student Mobile
                      </label>
                      <Input
                        value={studentForm.student_mobile}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, student_mobile: e.target.value })
                        }
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        value={studentForm.email}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, email: e.target.value })
                        }
                        placeholder="student@institution.edu"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Residential Address
                      </label>
                      <Input
                        value={studentForm.address}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, address: e.target.value })
                        }
                        placeholder="123 Campus Residence"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSaveStudentProfile}>
                    <Save className="h-4 w-4 mr-1.5" /> Save Contact Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right / Secondary Column: Security & Password Management */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-border">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Security & Password
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Update your login password. Your password must be at least 6 characters and cannot match standard institutional default passwords.
              </p>

              {/* Status Note */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Password Status:</span>
                  {isCustomPwd ? (
                    <Badge variant="success" className="text-[11px]">
                      Custom Password Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[11px]">
                      Default Password In Use
                    </Badge>
                  )}
                </div>
                {!isCustomPwd && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-medium">
                    Please set your own password to ensure account security.
                  </p>
                )}
              </div>

              {pwdError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{pwdError}</span>
                </div>
              )}

              {pwdSuccess && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    New Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Live validation checklist */}
                <div className="space-y-1 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        newPassword.length >= 6 ? "text-emerald-500" : "text-muted-foreground/40"
                      }`}
                    />
                    <span>At least 6 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        newPassword.length > 0 && newPassword === confirmPassword
                          ? "text-emerald-500"
                          : "text-muted-foreground/40"
                      }`}
                    />
                    <span>Passwords match</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={pwdLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                >
                  <Lock className="h-4 w-4 mr-1.5" />
                  {pwdLoading ? "Updating..." : "Save New Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
