import React, { useMemo, useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Trash2,
  Phone,
  MessageSquare,
  ClipboardCheck,
  AlertTriangle,
  Users,
  Send,
  ExternalLink,
  Percent,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { saveCredential } from "../lib/authUtils";
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
import { ParentAlertModal } from "../components/ParentAlertModal";
import { StudentDetailsModal } from "../components/StudentDetailsModal";
import {
  sanitizeMobileInput,
  getMobileValidationError,
  isValid10DigitMobile,
  cleanMobile,
  isValidEmail,
  getRollNumberValidationError,
  getNameValidationError,
} from "../lib/validation";

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

  const [students, setStudents] = useState(() =>
    localDb.students.filter(
      (item) => !departmentId || item.department_id === departmentId,
    ),
  );
  const [search, setSearch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string>("__all");
  const [open, setOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState(
    () => localDb.attendance,
  );
  const [smsLogs, setSmsLogs] = useState(() => localDb.getSmsLogs());

  // Parent Alert Modal State
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedStudentForAlert, setSelectedStudentForAlert] = useState<
    any | null
  >(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

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

  // Calculate attendance & SMS stats per student
  const studentStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { total: number; present: number; rate: number; smsCount: number }
    >();

    // Group attendance by student
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

    // Group SMS logs by student
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

    // Compute rates
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
    return students.filter((student) => {
      if (
        selectedSemester !== "__all" &&
        String(student.semester) !== selectedSemester
      ) {
        return false;
      }
      const query = search.toLowerCase();
      return (
        !query ||
        student.full_name.toLowerCase().includes(query) ||
        student.roll_number.toLowerCase().includes(query) ||
        (student.parent_name &&
          student.parent_name.toLowerCase().includes(query)) ||
        (student.parent_mobile && student.parent_mobile.includes(query))
      );
    });
  }, [students, search, selectedSemester]);

  const save = async () => {
    const errs: string[] = [];
    const rollErr = getRollNumberValidationError(form.roll_number);
    if (rollErr) errs.push(rollErr);

    if (
      localDb.students.some(
        (student) =>
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
      const accountId = `student-user-${student.id}`;
      await localDb.insert("users", [
        {
          id: accountId,
          full_name: student.full_name,
          email:
            student.email ||
            `${student.roll_number.toLowerCase()}@student.edutrack.edu`,
          role: "student",
          department_id: departmentId,
          student_id: student.id,
          status: "active",
        },
      ]);
      const effectivePwd = form.password.trim() || student.roll_number || "123";
      saveCredential(
        [accountId, student.id, student.roll_number, student.email],
        effectivePwd,
      );
    }

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
    setOpen(false);
    refresh();
  };

  const remove = async (student: (typeof students)[number]) => {
    if (!confirm(`Delete ${student.full_name}?`)) return;
    await localDb.delete("students", student.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
              HOD PORTAL · {department?.code || "DEPARTMENT"}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              All Classes Student Directory
            </span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Department Students & Attendance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete overview of all students across semesters in{" "}
            {department?.name || "your department"}, including attendance
            tracking and parent communication logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/sms-logs">
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-1.5 h-4 w-4 text-primary" />
              Department SMS Logs
            </Button>
          </Link>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Add Student
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
            <span className="text-xs text-muted-foreground">
              across all classes
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Average Attendance
            </span>
            <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {departmentMetrics.avgRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              overall department rate
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Defaulter Warnings
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {departmentMetrics.defaulterCount}
            </span>
            <span className="text-xs text-muted-foreground">
              &lt; 75% attendance
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Parent SMS Alerts
            </span>
            <MessageSquare className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {departmentMetrics.deptSmsCount}
            </span>
            <span className="text-xs text-muted-foreground">
              alerts dispatched
            </span>
          </div>
        </Card>
      </div>

      {/* Add Student Card */}
      {open && (
        <Card className="border-primary/30 bg-primary/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Add New Student</h2>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Roll Number *"
              value={form.roll_number}
              onChange={(event) =>
                setForm({ ...form, roll_number: event.target.value })
              }
            />
            <Input
              placeholder="PRN Number *"
              value={form.prn_number}
              onChange={(event) =>
                setForm({ ...form, prn_number: event.target.value })
              }
            />
            <Input
              placeholder="Full Name *"
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
            />
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
            <Input
              placeholder="Parent / Guardian Name"
              value={form.parent_name}
              onChange={(event) =>
                setForm({ ...form, parent_name: event.target.value })
              }
            />
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Parent Mobile (10 Digits) *</span>
                <span
                  className={`font-mono ${form.parent_mobile.length === 10 ? "text-emerald-500 font-bold" : ""}`}
                >
                  {form.parent_mobile.length}/10
                </span>
              </div>
              <Input
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 9876543210"
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
            <Input
              type="email"
              placeholder="Student Email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
            <div className="space-y-1 sm:col-span-2">
              <Input
                type="password"
                placeholder="Login Password (default: Roll Number)"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Students can log in with their Roll Number and password (default
                is their Roll Number).
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save Student</Button>
          </div>
        </Card>
      )}

      <StudentDetailsModal
        student={selectedStudent}
        open={!!selectedStudent}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
        departmentName={department?.name}
      />

      {/* Filter and Students Grid */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by Roll No, Student or Parent..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Class / Sem:
            </span>
            <Select
              className="w-44 text-xs"
              value={selectedSemester}
              onChange={(event) => setSelectedSemester(event.target.value)}
              options={[
                { value: "__all", label: "All Classes / Semesters" },
                ...[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
                  value: String(sem),
                  label: `Semester ${sem}`,
                })),
              ]}
            />
          </div>
        </div>

        {/* Student Cards List */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              No students found matching the selected filters.
            </div>
          ) : (
            filtered.map((student) => {
              const stat = studentStatsMap.get(student.id) || {
                total: 0,
                present: 0,
                rate: 100,
                smsCount: 0,
              };
              const isDefaulter = stat.total > 0 && stat.rate < 75;

              return (
                <div
                  key={student.id}
                  className="flex flex-col justify-between rounded-xl border border-border p-4 bg-card hover:border-primary/40 transition-colors shadow-2xs"
                >
                  <div>
                    {/* Top Row: Roll, Sem, Attendance Rate */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(student)}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            {student.roll_number}
                          </button>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Sem {student.semester}
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm text-foreground truncate mt-0.5">
                          {student.full_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          PRN: {student.prn_number || "-"}
                        </p>
                      </div>

                      <Badge
                        variant={isDefaulter ? "destructive" : "success"}
                        className="shrink-0 text-xs font-bold"
                      >
                        {stat.rate}%
                      </Badge>
                    </div>

                    {/* Attendance summary pill */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5">
                      <span>Attendance Record:</span>
                      <span className="font-medium text-foreground">
                        {stat.present} / {stat.total} Sessions
                      </span>
                    </div>

                    {/* Parent contact info */}
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Parent:</span>
                        <span className="text-foreground font-medium truncate max-w-[140px]">
                          {student.parent_name || "Not listed"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Mobile:</span>
                        <span className="font-mono text-foreground font-medium">
                          {student.parent_mobile || "Missing"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MessageSquare className="h-3 w-3 text-primary" />
                      <span>{stat.smsCount} SMS sent</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {student.parent_mobile && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] font-semibold"
                          onClick={() => {
                            setSelectedStudentForAlert(student);
                            setAlertModalOpen(true);
                          }}
                        >
                          <Send className="mr-1 h-3 w-3 text-primary" />
                          Alert
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(student)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Parent Alert Modal for HOD */}
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
    </div>
  );
};
