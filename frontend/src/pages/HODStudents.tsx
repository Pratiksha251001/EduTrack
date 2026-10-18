import React, { useMemo, useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  MessageSquare,
  AlertTriangle,
  Users,
  Send,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Percent,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import {
  provisionManagedAccount,
  resetManagedAccountPassword,
} from "../lib/accountService";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { ParentAlertModal } from "../components/ParentAlertModal";
import { StudentDetailsModal } from "../components/StudentDetailsModal";
import { StudentImportModal } from "../components/StudentImportModal";
import {
  sanitizeMobileInput,
  getMobileValidationError,
  isValid10DigitMobile,
  cleanMobile,
  isValidEmail,
  getRollNumberValidationError,
  getNameValidationError,
} from "../lib/validation";
import { Student } from "../lib/types";

export const HODStudents: React.FC = () => {
  const { user } = useAuth();
  const teachers = localDb.teachers;
  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const departmentId = user?.department_id || linkedTeacher?.department_id;
  const department = localDb.departments.find(
    (item) => item.id === departmentId,
  );

  const [students, setStudents] = useState<Student[]>(() =>
    localDb.students.filter(
      (item) => !departmentId || item.department_id === departmentId,
    ),
  );
  const [search, setSearch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string>("__all");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all"); // "all" | "defaulters" | "regular"
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState(
    () => localDb.attendance,
  );
  const [smsLogs, setSmsLogs] = useState(() => localDb.getSmsLogs());

  // Modals state
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedStudentForAlert, setSelectedStudentForAlert] =
    useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const refresh = () => {
    setStudents(
      localDb.students.filter(
        (item) => !departmentId || item.department_id === departmentId,
      ),
    );
    setAttendanceRecords([...localDb.attendance]);
    setSmsLogs(localDb.getSmsLogs());
  };

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener("edutrack_data_updated", handleUpdate);
    window.addEventListener("edutrack_sms_logs_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_data_updated", handleUpdate);
      window.removeEventListener("edutrack_sms_logs_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [departmentId]);

  const [form, setForm] = useState({
    roll_number: "",
    prn_number: "",
    full_name: "",
    semester: "1",
    parent_name: "",
    parent_mobile: "",
    email: "",
    password: "",
  });

  const openAddModal = () => {
    setEditingStudent(null);
    setForm({
      roll_number: "",
      prn_number: "",
      full_name: "",
      semester: "1",
      parent_name: "",
      parent_mobile: "",
      email: "",
      password: "",
    });
    setOpen(true);
  };

  const openEditModal = (st: Student) => {
    setEditingStudent(st);
    setForm({
      roll_number: st.roll_number || "",
      prn_number: st.prn_number || "",
      full_name: st.full_name || "",
      semester: String(st.semester || 1),
      parent_name: st.parent_name || "",
      parent_mobile: st.parent_mobile || "",
      email: st.email || "",
      password: "",
    });
    setOpen(true);
  };

  // Calculate attendance & SMS stats per student
  const studentStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { total: number; present: number; rate: number; smsCount: number }
    >();

    attendanceRecords.forEach((att) => {
      const existing = map.get(att.student_id) || {
        total: 0,
        present: 0,
        rate: 0,
        smsCount: 0,
      };
      existing.total += 1;
      if (att.status === "present") {
        existing.present += 1;
      }
      map.set(att.student_id, existing);
    });

    smsLogs.forEach((log) => {
      if (log.student_id) {
        const existing = map.get(log.student_id) || {
          total: 0,
          present: 0,
          rate: 0,
          smsCount: 0,
        };
        existing.smsCount += 1;
        map.set(log.student_id, existing);
      }
    });

    map.forEach((value) => {
      value.rate =
        value.total > 0 ? Math.round((value.present / value.total) * 100) : 100;
    });

    return map;
  }, [attendanceRecords, smsLogs]);

  // Overall department metrics
  const departmentMetrics = useMemo(() => {
    const totalCount = students.length;
    let totalClasses = 0;
    let totalPresent = 0;
    let defaulterCount = 0;

    students.forEach((st) => {
      const stat = studentStatsMap.get(st.id);
      if (stat && stat.total > 0) {
        totalClasses += stat.total;
        totalPresent += stat.present;
        if (stat.rate < 75) {
          defaulterCount += 1;
        }
      }
    });

    const avgRate =
      totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 100;
    const deptSmsCount = smsLogs.filter((l) => {
      const st = students.find((s) => s.id === l.student_id);
      return Boolean(st);
    }).length;

    return { totalCount, avgRate, defaulterCount, deptSmsCount };
  }, [students, studentStatsMap, smsLogs]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return students;
    return students.filter((student) => {
      return (
        student.full_name.toLowerCase().includes(query) ||
        student.roll_number.toLowerCase().includes(query) ||
        (student.prn_number &&
          student.prn_number.toLowerCase().includes(query)) ||
        (student.parent_name &&
          student.parent_name.toLowerCase().includes(query)) ||
        (student.parent_mobile && student.parent_mobile.includes(query)) ||
        (student.class_name && student.class_name.toLowerCase().includes(query))
      );
    });
  }, [students, search]);

  const save = async () => {
    const errs: string[] = [];
    const rollErr = getRollNumberValidationError(form.roll_number);
    if (rollErr) errs.push(rollErr);

    if (
      localDb.students.some(
        (student) =>
          student.id !== editingStudent?.id &&
          student.roll_number.toLowerCase() ===
            form.roll_number.trim().toLowerCase(),
      )
    ) {
      errs.push("This roll number already exists in institutional records.");
    }

    const nameErr = getNameValidationError(form.full_name);
    if (nameErr) errs.push(nameErr);

    const mobileErr = getMobileValidationError(
      form.parent_mobile,
      "Parent Mobile",
      true,
    );
    if (mobileErr) errs.push(mobileErr);

    if (form.email && !isValidEmail(form.email)) {
      errs.push("Please provide a valid email address.");
    }

    if (!departmentId) {
      errs.push("Department assignment is required.");
    }

    if (errs.length > 0) {
      alert(errs.join("\n"));
      return;
    }

    if (editingStudent) {
      // Update existing student
      await localDb.update("students", editingStudent.id, {
        roll_number: form.roll_number.trim(),
        prn_number: form.prn_number.trim(),
        full_name: form.full_name.trim(),
        semester: Number(form.semester),
        parent_name: form.parent_name.trim() || null,
        parent_mobile: cleanMobile(form.parent_mobile),
        email: form.email.trim() || null,
      });

      // Update user account if present
      const account = localDb.users.find(
        (u) => u.student_id === editingStudent.id,
      );
      if (account) {
        await localDb.update("users", account.id, {
          full_name: form.full_name.trim(),
          email:
            form.email.trim() ||
            account.email ||
            `${form.roll_number.toLowerCase()}@student.edutrack.edu`,
        });
      }

      if (form.password.trim()) {
        await resetManagedAccountPassword({
          studentId: editingStudent.id,
          password: form.password.trim(),
        });
      }
    } else {
      // Insert new student
      const inserted = await localDb.insert("students", [
        {
          roll_number: form.roll_number.trim(),
          prn_number: form.prn_number.trim(),
          full_name: form.full_name.trim(),
          semester: Number(form.semester),
          parent_name: form.parent_name.trim() || null,
          parent_mobile: cleanMobile(form.parent_mobile),
          email: form.email.trim() || null,
          department_id: departmentId,
          status: "active",
        },
      ]);

      const student = inserted[0];
      if (student) {
        if (!student.email) {
          await localDb.delete("students", student.id);
          throw new Error(
            "A valid student email is required for a persistent login account.",
          );
        }
        const effectivePwd =
          form.password.trim() || student.roll_number || "123";
        try {
          await provisionManagedAccount({
            email: student.email,
            password: effectivePwd,
            fullName: student.full_name,
            role: "student",
            departmentId,
            studentId: student.id,
          });
        } catch (error) {
          await localDb.delete("students", student.id);
          throw error;
        }
      }
    }

    setOpen(false);
    setEditingStudent(null);
    refresh();
  };

  const remove = async (student: Student) => {
    if (
      !confirm(`Delete student ${student.full_name} (${student.roll_number})?`)
    )
      return;
    await localDb.delete("students", student.id);
    refresh();
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      alert("No student records available to export.");
      return;
    }

    const headers = [
      "Roll Number",
      "Full Name",
      "Semester",
      "Parent Name",
      "Parent Mobile",
      "Student Email",
      "Total Sessions",
      "Present Sessions",
      "Attendance %",
      "Defaulter Status",
      "SMS Alerts Sent",
    ];

    const csvRows = filtered.map((s) => {
      const stat = studentStatsMap.get(s.id) || {
        total: 0,
        present: 0,
        rate: 100,
        smsCount: 0,
      };
      const isDefaulter = stat.total > 0 && stat.rate < 75;

      return [
        `"${s.roll_number}"`,
        `"${s.full_name}"`,
        s.semester,
        `"${s.parent_name || ""}"`,
        `"${s.parent_mobile || ""}"`,
        `"${s.email || ""}"`,
        stat.total,
        stat.present,
        `${stat.rate}%`,
        isDefaulter ? "Defaulter (<75%)" : "Normal (>=75%)",
        stat.smsCount,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const deptLabel = department?.code || "Department";
    link.href = url;
    link.setAttribute(
      "download",
      `${deptLabel}_Students_Roster_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with strictly related actions (No unrelated SMS log buttons) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
              HOD PORTAL · {department?.code || "DEPARTMENT"}
            </Badge>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Department Students & Attendance
          </h1>
        </div>

        {/* Action Buttons: strictly student-related (Import, Export, Add) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="gap-1.5 border-border hover:border-primary/50 text-xs h-9"
            title="Import students in bulk via Excel or CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Import Excel / CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 border-border hover:border-primary/50 text-xs h-9"
            title="Export student roster to CSV"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={openAddModal}
            className="gap-1.5 text-xs h-9"
          >
            <Plus className="h-4 w-4" />
            <span>Add Student</span>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Total Students
            </span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {departmentMetrics.totalCount}
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Average Attendance
            </span>
            <Percent className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {departmentMetrics.avgRate}%
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Defaulters (&lt;75%)
            </span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                departmentMetrics.defaulterCount > 0
                  ? "text-destructive"
                  : "text-foreground"
              }`}
            >
              {departmentMetrics.defaulterCount}
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Parent SMS Alerts
            </span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {departmentMetrics.deptSmsCount}
            </span>
          </div>
        </Card>
      </div>

      {/* Add / Edit Student Dialog */}
      {open && (
        <Card className="border-primary/30 bg-primary/[0.03] p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {editingStudent ? "Edit Student Details" : "Add New Student"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setEditingStudent(null);
              }}
            >
              ✕
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Roll Number *
              </label>
              <Input
                placeholder="e.g. 21CS101"
                value={form.roll_number}
                onChange={(event) =>
                  setForm({ ...form, roll_number: event.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Full Name *
              </label>
              <Input
                placeholder="Student Full Name"
                value={form.full_name}
                onChange={(event) =>
                  setForm({ ...form, full_name: event.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Semester *
              </label>
              <Select
                value={form.semester}
                onChange={(event) =>
                  setForm({ ...form, semester: event.target.value })
                }
                options={[1, 2, 3, 4, 5, 6, 7, 8].map((value) => ({
                  value: String(value),
                  label: `Semester ${value}`,
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Parent / Guardian Name
              </label>
              <Input
                placeholder="Father / Mother Name"
                value={form.parent_name}
                onChange={(event) =>
                  setForm({ ...form, parent_name: event.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <label className="font-semibold text-muted-foreground">
                  Parent Mobile (10 Digits) *
                </label>
                <span
                  className={`font-mono text-[10px] ${
                    form.parent_mobile.length === 10
                      ? "text-emerald-600 font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {form.parent_mobile.length}/10
                </span>
              </div>
              <Input
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="9876543210 (10 digits)"
                value={form.parent_mobile}
                onChange={(event) =>
                  setForm({
                    ...form,
                    parent_mobile: sanitizeMobileInput(event.target.value),
                  })
                }
                className={
                  form.parent_mobile &&
                  !isValid10DigitMobile(form.parent_mobile)
                    ? "border-destructive"
                    : ""
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Student Email (Optional)
              </label>
              <Input
                type="email"
                placeholder="student@college.edu"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Login Password
              </label>
              <Input
                type="password"
                placeholder={
                  editingStudent
                    ? "Leave blank to keep current password"
                    : "Default: Student's Roll Number"
                }
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setEditingStudent(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={save}>
              {editingStudent ? "Update Student" : "Save Student"}
            </Button>
          </div>
        </Card>
      )}

      {/* Search Bar */}
      <div className="surface-panel p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-xs"
              placeholder="Search by Roll No, Name, Parent, or Mobile..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Total Students:{" "}
            <strong className="text-foreground">{filtered.length}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERMANENT TABULAR VIEW FOR STUDENTS */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader className="bg-muted/70 border-b border-border">
              <TableRow>
                <TableHead className="w-12 text-center font-bold">#</TableHead>
                <TableHead className="min-w-[120px] font-bold">
                  Roll Number
                </TableHead>
                <TableHead className="min-w-[200px] font-bold">
                  Student Name
                </TableHead>
                <TableHead className="min-w-[110px] font-bold">
                  Class / Sem
                </TableHead>
                <TableHead className="min-w-[180px] font-bold">
                  Guardian Contact
                </TableHead>
                <TableHead className="min-w-[160px] font-bold">
                  Email / Login
                </TableHead>
                <TableHead className="min-w-[160px] font-bold">
                  Attendance Record
                </TableHead>
                <TableHead className="min-w-[90px] text-center font-bold">
                  SMS Sent
                </TableHead>
                <TableHead className="min-w-[130px] text-right font-bold pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-14 text-center text-muted-foreground"
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        No students found matching your criteria
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add students manually or import via Excel (.xlsx) / CSV
                        file to populate the department directory.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setImportModalOpen(true)}
                          className="gap-1.5"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                          Import Students
                        </Button>
                        <Button
                          size="sm"
                          onClick={openAddModal}
                          className="gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          Add Student Manually
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((student, idx) => {
                  const stat = studentStatsMap.get(student.id) || {
                    total: 0,
                    present: 0,
                    rate: 100,
                    smsCount: 0,
                  };
                  const isDefaulter = stat.total > 0 && stat.rate < 75;

                  return (
                    <TableRow
                      key={student.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* # Index */}
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      {/* Roll Number */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="font-mono font-bold text-xs text-primary hover:underline flex items-center gap-1"
                          title="Click to view student full academic profile"
                        >
                          <span>{student.roll_number}</span>
                        </button>
                      </TableCell>

                      {/* Student Name */}
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {student.full_name}
                          </p>
                        </div>
                      </TableCell>

                      {/* Semester & Class */}
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold"
                          >
                            Sem {student.semester}
                          </Badge>
                          {student.class_name && (
                            <span className="text-[10px] text-muted-foreground">
                              Class {student.class_name}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Guardian Contact */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground truncate max-w-[160px]">
                            {student.parent_name || "Guardian"}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {student.parent_mobile || (
                              <span className="text-destructive font-bold">
                                Missing
                              </span>
                            )}
                          </p>
                        </div>
                      </TableCell>

                      {/* Email / Login */}
                      <TableCell>
                        <div className="space-y-0.5 max-w-[150px]">
                          <p
                            className="truncate text-muted-foreground text-[11px]"
                            title={student.email || ""}
                          >
                            {student.email || "—"}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Account Active
                          </span>
                        </div>
                      </TableCell>

                      {/* Attendance Record */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                stat.total === 0
                                  ? "secondary"
                                  : isDefaulter
                                    ? "destructive"
                                    : "success"
                              }
                              className="font-bold text-xs px-2 py-0.5"
                            >
                              {stat.rate}%
                            </Badge>
                            {isDefaulter && (
                              <Badge
                                variant="destructive"
                                className="text-[9px] px-1 py-0 uppercase tracking-wider font-extrabold"
                              >
                                Defaulter
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {stat.present} of {stat.total} sessions attended
                          </p>
                        </div>
                      </TableCell>

                      {/* SMS Sent */}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          {stat.smsCount}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Profile */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedStudent(student)}
                            title="View student profile & attendance report"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Send Parent SMS Alert */}
                          {student.parent_mobile && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/10"
                              onClick={() => {
                                setSelectedStudentForAlert(student);
                                setAlertModalOpen(true);
                              }}
                              title="Send Parent SMS Alert"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Edit Student */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(student)}
                            title="Edit student"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete Student */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(student)}
                            title="Delete student"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Student Details Profile Modal */}
      <StudentDetailsModal
        student={selectedStudent}
        open={!!selectedStudent}
        onOpenChange={(isOpen) => !isOpen && setSelectedStudent(null)}
        departmentName={department?.name}
      />

      {/* Parent Alert SMS Modal */}
      {selectedStudentForAlert && (
        <ParentAlertModal
          open={alertModalOpen}
          onOpenChange={setAlertModalOpen}
          studentId={selectedStudentForAlert.id}
          studentName={selectedStudentForAlert.full_name}
          parentMobile={selectedStudentForAlert.parent_mobile}
          parentName={selectedStudentForAlert.parent_name || "Parent"}
          date={new Date().toISOString().split("T")[0]}
          onSuccess={() => {
            setAlertModalOpen(false);
            refresh();
          }}
        />
      )}

      {/* Bulk Excel/CSV Import Modal for Students */}
      <StudentImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        departmentId={departmentId}
        onImportComplete={(count) => {
          refresh();
        }}
      />
    </div>
  );
};
