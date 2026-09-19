import React, { useState, useMemo, useEffect } from "react";
import { FileSpreadsheet, FileText, Calendar, Filter } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import {
  college,
  ENGINEERING_YEARS,
  getEngineeringYearFromSemester,
} from "../lib/college";
import { exportAttendancePdf } from "../lib/pdfExport";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { DatePicker } from "../components/ui/date-picker";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";

export const Reports: React.FC = () => {
  const { user, role } = useAuth();
  const allStudents = localDb.students;
  const allSubjects = localDb.subjects;
  const allDepartments = localDb.departments;
  const attendance = localDb.attendance;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(todayStr);

  // Initialize selectedDept based on role
  const defaultDept =
    role === "admin" ? "__all" : user?.department_id || "__all";
  const [selectedDept, setSelectedDept] = useState<string>(defaultDept);
  const [selectedSubject, setSelectedSubject] = useState<string>("__all");
  const [selectedYear, setSelectedYear] = useState<string>("__all");
  const [selectedClass, setSelectedClass] = useState<string>("__all");

  useEffect(() => {
    if (role !== "admin" && user?.department_id) {
      setSelectedDept(user.department_id);
    }
  }, [role, user?.department_id]);

  const selectedClassRecord = useMemo(
    () =>
      localDb.academic_classes.find(
        (academicClass) => academicClass.id === selectedClass,
      ),
    [selectedClass],
  );

  // Scoped subjects based on role
  const subjects = useMemo(() => {
    const applyAcademicFilters = (subjectList: typeof allSubjects) =>
      subjectList.filter((subject) => {
        const subjectYear =
          subject.year || getEngineeringYearFromSemester(subject.semester);
        if (selectedDept !== "__all" && subject.department_id !== selectedDept)
          return false;
        if (selectedYear !== "__all" && String(subjectYear) !== selectedYear)
          return false;
        if (
          selectedClassRecord &&
          subject.semester !== selectedClassRecord.semester
        )
          return false;
        return true;
      });

    if (role === "admin") return applyAcademicFilters(allSubjects);
    if (role === "hod") {
      return applyAcademicFilters(
        allSubjects.filter(
          (s) => !user?.department_id || s.department_id === user.department_id,
        ),
      );
    }
    if (role === "class_coordinator") {
      const teacherRec = localDb.teachers.find(
        (t) =>
          t.id === user?.teacher_id ||
          (user?.email &&
            t.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.employee_id && t.employee_id === user.employee_id) ||
          (t.is_class_coordinator && t.department_id === user?.department_id),
      );
      const coordSem =
        teacherRec?.assigned_semester || user?.assigned_semester || 5;
      const deptId = user?.department_id || teacherRec?.department_id;
      return applyAcademicFilters(
        allSubjects.filter(
          (s) =>
            (!deptId || s.department_id === deptId) && s.semester === coordSem,
        ),
      );
    }
    if (role === "teacher") {
      const teacherId = user?.teacher_id || user?.id;
      const mySubjectIds = new Set(
        localDb.teacher_subjects
          .filter((ts) => ts.teacher_id === teacherId)
          .map((ts) => ts.subject_id),
      );
      allSubjects.forEach((s) => {
        if ((s as any).teacher_id === teacherId) {
          mySubjectIds.add(s.id);
        }
      });
      if (mySubjectIds.size > 0) {
        return applyAcademicFilters(
          allSubjects.filter((s) => mySubjectIds.has(s.id)),
        );
      }
      return applyAcademicFilters(
        allSubjects.filter(
          (s) => !user?.department_id || s.department_id === user.department_id,
        ),
      );
    }
    if (role === "student") {
      const studentId = user?.student_id;
      const studentSubjectIds = new Set(
        attendance
          .filter((record) => record.student_id === studentId)
          .map((record) => record.subject_id),
      );
      return applyAcademicFilters(
        allSubjects.filter((subject) => studentSubjectIds.has(subject.id)),
      );
    }
    return applyAcademicFilters(allSubjects);
  }, [
    allSubjects,
    attendance,
    role,
    user,
    selectedDept,
    selectedYear,
    selectedClassRecord,
  ]);

  // Scoped students based on role
  const students = useMemo(() => {
    if (role === "admin") return allStudents;
    if (role === "hod") {
      return allStudents.filter(
        (st) => !user?.department_id || st.department_id === user.department_id,
      );
    }
    if (role === "class_coordinator") {
      const teacherRec = localDb.teachers.find(
        (t) =>
          t.id === user?.teacher_id ||
          (user?.email &&
            t.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.employee_id && t.employee_id === user.employee_id) ||
          (t.is_class_coordinator && t.department_id === user?.department_id),
      );
      const coordSem =
        teacherRec?.assigned_semester || user?.assigned_semester || 5;
      const deptId = user?.department_id || teacherRec?.department_id;
      return allStudents.filter(
        (st) =>
          (!deptId || st.department_id === deptId) && st.semester === coordSem,
      );
    }
    if (role === "teacher") {
      // Students in semesters of the teacher's assigned subjects
      const teacherSemesters = new Set(subjects.map((s) => s.semester));
      return allStudents.filter(
        (st) =>
          (!user?.department_id || st.department_id === user.department_id) &&
          teacherSemesters.has(st.semester),
      );
    }
    if (role === "student") {
      const ownStudent = allStudents.find(
        (student) =>
          student.id === user?.student_id ||
          (user?.email &&
            student.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.roll_number && student.roll_number === user.roll_number),
      );
      return ownStudent ? [ownStudent] : [];
    }
    return allStudents;
  }, [allStudents, subjects, role, user]);

  const departments = useMemo(() => {
    if (role === "admin") return allDepartments;
    if (user?.department_id) {
      return allDepartments.filter((d) => d.id === user.department_id);
    }
    return allDepartments;
  }, [allDepartments, role, user]);

  const classes = useMemo(() => {
    const existingClasses = localDb.academic_classes.filter(
      (academicClass) =>
        (selectedDept === "__all" ||
          academicClass.department_id === selectedDept) &&
        (selectedYear === "__all" ||
          String(
            academicClass.year ||
              getEngineeringYearFromSemester(academicClass.semester),
          ) === selectedYear),
    );
    const batchOptions =
      selectedYear !== "__all" && Number(selectedYear) >= 2
        ? [
            {
              id: "batch-A",
              name: "Batch A",
              department_id: selectedDept,
              year: Number(selectedYear),
              semester: 0,
              status: "active" as const,
              created_at: "",
            },
            {
              id: "batch-B",
              name: "Batch B",
              department_id: selectedDept,
              year: Number(selectedYear),
              semester: 0,
              status: "active" as const,
              created_at: "",
            },
          ]
        : [];
    return [...existingClasses, ...batchOptions];
  }, [selectedDept, selectedYear]);

  const availableYears = useMemo(() => {
    return ENGINEERING_YEARS;
  }, []);

  useEffect(() => {
    if (
      selectedClass !== "__all" &&
      !classes.some((academicClass) => academicClass.id === selectedClass)
    ) {
      setSelectedClass("__all");
    }
    if (
      selectedSubject !== "__all" &&
      !subjects.some((subject) => subject.id === selectedSubject)
    ) {
      setSelectedSubject("__all");
    }
  }, [classes, subjects, selectedClass, selectedSubject]);

  const reportRows = useMemo(() => {
    const list: Array<{
      roll: string;
      reg: string;
      name: string;
      subject: string;
      total: number;
      present: number;
      absent: number;
      percentage: number;
    }> = [];

    const filteredSubjects = subjects.filter(
      (s) => selectedSubject === "__all" || s.id === selectedSubject,
    );

    students.forEach((st) => {
      if (selectedDept !== "__all" && st.department_id !== selectedDept) return;
      const studentYear =
        st.year || getEngineeringYearFromSemester(st.semester);
      if (selectedYear !== "__all" && String(studentYear) !== selectedYear)
        return;
      if (selectedClass !== "__all") {
        const selectedBatch = selectedClass.replace("batch-", "");
        const matchesBatch =
          selectedClass.startsWith("batch-") &&
          new RegExp(`(?:^|[-\\s])${selectedBatch}$`, "i").test(
            st.class_name || "",
          );
        if (
          st.class_id !== selectedClass &&
          st.class_name !== selectedClassRecord?.name &&
          !matchesBatch
        )
          return;
      }

      filteredSubjects.forEach((sub) => {
        if (st.semester !== sub.semester) return;
        if (sub.department_id && sub.department_id !== st.department_id) return;

        const records = attendance.filter(
          (a) =>
            a.student_id === st.id &&
            a.subject_id === sub.id &&
            a.date >= startDate &&
            a.date <= endDate,
        );

        if (records.length > 0) {
          const total = records.length;
          const present = records.filter((r) => r.status === "present").length;
          const absent = total - present;
          const percentage = Math.round((present / total) * 100);

          list.push({
            roll: st.roll_number,
            reg: st.reg_number || "—",
            name: st.full_name,
            subject: `${sub.code} · ${sub.name}`,
            total,
            present,
            absent,
            percentage,
          });
        }
      });
    });

    return list;
  }, [
    students,
    subjects,
    attendance,
    startDate,
    endDate,
    selectedDept,
    selectedSubject,
    selectedYear,
    selectedClass,
  ]);

  const exportCsv = () => {
    const csvContent =
      "Roll No,Reg No,Student Name,Subject,Total Classes,Present,Absent,Percentage\n" +
      reportRows
        .map(
          (r) =>
            `"${r.roll}","${r.reg}","${r.name}","${r.subject}",${r.total},${r.present},${r.absent},${r.percentage}%`,
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance-${selectedYear === "__all" ? "all-years" : `year-${selectedYear}`}-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = () => {
    exportAttendancePdf({
      rows: reportRows,
      periodLabel: `${startDate} to ${endDate}`,
      scopeLabel: `${selectedDept === "__all" ? "All Departments" : departments.find((d) => d.id === selectedDept)?.name || "Filtered"} · ${selectedYear === "__all" ? "All Years" : `${["FY", "SY", "TY", "LY"][Number(selectedYear) - 1]} (${ENGINEERING_YEARS.find((y) => String(y.year) === selectedYear)?.code || selectedYear})`}${selectedClass === "__all" ? "" : ` · ${selectedClass}`}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-2xl font-bold">
              Attendance Reports & Sign-off
            </h2>
            <Badge
              variant="outline"
              className="text-xs border-primary/30 bg-primary/10 text-primary"
            >
              {role === "admin" && "College-Wide Reports"}
              {role === "hod" &&
                `Department Scope (${user?.department_id || "All Classes"})`}
              {role === "class_coordinator" &&
                `Class Coordinator Scope (Sem ${user?.assigned_semester || 5})`}
              {role === "teacher" && "Assigned Classes & Subjects"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Aggregate student attendance across date intervals with audit-ready
            PDF & CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={reportRows.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            onClick={handlePdfExport}
            disabled={reportRows.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" /> Download Official PDF
          </Button>
        </div>
      </div>

      <div className="surface-panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" /> Filter Date Range
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-7 px-2.5"
              onClick={() => {
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-7 px-2.5"
              onClick={() => {
                const past7 = new Date(Date.now() - 7 * 86400000)
                  .toISOString()
                  .split("T")[0];
                setStartDate(past7);
                setEndDate(todayStr);
              }}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-7 px-2.5"
              onClick={() => {
                const d = new Date();
                const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
                  .toISOString()
                  .split("T")[0];
                setStartDate(firstDay);
                setEndDate(todayStr);
              }}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-7 px-2.5"
              onClick={() => {
                setStartDate(thirtyDaysAgo);
                setEndDate(todayStr);
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              From Date
            </label>
            <DatePicker
              value={startDate}
              max={endDate}
              onChange={(val) => setStartDate(val || thirtyDaysAgo)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              To Date
            </label>
            <DatePicker
              value={endDate}
              min={startDate}
              max={todayStr}
              onChange={(val) => setEndDate(val || todayStr)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Department
            </label>
            <Select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedYear("__all");
                setSelectedClass("__all");
                setSelectedSubject("__all");
              }}
              options={[
                { value: "__all", label: "All Departments" },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Academic Year
            </label>
            <Select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedClass("__all");
                setSelectedSubject("__all");
              }}
              options={[
                { value: "__all", label: "All Years" },
                ...availableYears.map((year) => ({
                  value: String(year.year),
                  label: `${["FY", "SY", "TY", "LY"][year.year - 1]} · ${year.code} (${year.name})`,
                })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Class / Section
            </label>
            <Select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSubject("__all");
              }}
              options={[
                { value: "__all", label: "All Classes" },
                ...classes.map((academicClass) => ({
                  value: academicClass.id,
                  label: academicClass.name,
                })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Subject
            </label>
            <Select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              options={[
                { value: "__all", label: "All Subjects" },
                ...subjects.map((s) => ({
                  value: s.id,
                  label: `${s.code} - ${s.name}`,
                })),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="surface-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll No</TableHead>
              <TableHead>Reg No</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">Percentage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  No attendance records found for the selected filter
                  parameters.
                </TableCell>
              </TableRow>
            ) : (
              reportRows.map((r) => (
                <TableRow key={`${r.roll}-${r.subject}`}>
                  <TableCell className="font-mono text-xs font-bold">
                    {r.roll}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.reg}
                  </TableCell>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.subject}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    {r.present}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    {r.absent}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      r.percentage < college.minAttendance
                        ? "text-destructive"
                        : "text-emerald-600"
                    }`}
                  >
                    {r.percentage}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
