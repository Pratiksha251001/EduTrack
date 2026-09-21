import React, { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle2,
  Users,
  Percent,
  Download,
  BookOpen,
  GraduationCap,
  Building,
  UserCheck,
  ShieldAlert,
  Bell,
  Send,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import {
  college,
  ENGINEERING_YEARS,
  getEngineeringYearFromSemester,
  getEngineeringYearCode,
  getParentWhatsAppUrl,
} from "../lib/college";
import {
  exportAttendancePdf,
  exportAttendanceExcel,
  exportAttendanceCsv,
  AttendanceReportRow,
} from "../lib/reportExportUtils";
import { MonthlyLowAttendanceAlertModal } from "../components/MonthlyLowAttendanceAlertModal";
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

type ReportViewMode = "consolidated" | "defaulters" | "student_summary";

export const Reports: React.FC = () => {
  const { user, role } = useAuth();
  const allStudents = localDb.students;
  const allSubjects = localDb.subjects;
  const allDepartments = localDb.departments;
  const allAcademicClasses = localDb.academic_classes;
  const attendance = localDb.attendance;

  // Resolve Linked Teacher / Faculty Record
  const linkedTeacher = useMemo(() => {
    return (
      localDb.teachers.find(
        (t) =>
          t.id === user?.teacher_id ||
          (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.employee_id && t.employee_id === user.employee_id) ||
          t.user_id === user?.id
      ) || null
    );
  }, [user]);

  const teacherId = linkedTeacher?.id || user?.teacher_id || user?.id;

  // Coordinator assigned info
  const coordAssignment = useMemo(() => {
    if (role !== "class_coordinator") return null;
    return (
      localDb.class_coordinator_assignments.find(
        (a) => a.teacher_id === linkedTeacher?.id || a.teacher_id === user?.teacher_id
      ) || null
    );
  }, [role, linkedTeacher, user]);

  const coordYear =
    coordAssignment?.year ||
    linkedTeacher?.assigned_year ||
    (linkedTeacher?.assigned_semester
      ? getEngineeringYearFromSemester(linkedTeacher.assigned_semester)
      : user?.assigned_semester
      ? getEngineeringYearFromSemester(user.assigned_semester)
      : 2);

  const coordSem =
    coordAssignment?.semester ||
    linkedTeacher?.assigned_semester ||
    user?.assigned_semester ||
    3;

  // Teacher assigned subject IDs & teaching classes
  const teacherAssignedSubjectIds = useMemo(() => {
    const ids = new Set<string>();
    localDb.teacher_subjects
      .filter((ts) => ts.teacher_id === teacherId || ts.teacher_id === user?.id)
      .forEach((ts) => ids.add(ts.subject_id));
    allSubjects.forEach((s) => {
      if ((s as any).teacher_id === teacherId || (s as any).teacher_id === user?.id) {
        ids.add(s.id);
      }
    });
    return ids;
  }, [teacherId, user, allSubjects]);

  const teacherAssignedClassNames = useMemo(() => {
    const names = new Set<string>();
    localDb.teacher_subjects
      .filter((ts) => ts.teacher_id === teacherId || ts.teacher_id === user?.id)
      .forEach((ts) => {
        if (ts.class_name) names.add(ts.class_name);
      });
    return Array.from(names);
  }, [teacherId, user]);

  // Date range state
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(todayStr);

  // Filter states
  const initialDept =
    role === "admin"
      ? "__all"
      : user?.department_id || linkedTeacher?.department_id || "dept-1";

  const initialYear =
    role === "class_coordinator" ? String(coordYear) : "__all";

  const initialClass =
    role === "class_coordinator" && coordAssignment?.class_name
      ? coordAssignment.class_name
      : "__all";

  const [selectedDept, setSelectedDept] = useState<string>(initialDept);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedSubject, setSelectedSubject] = useState<string>("__all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<ReportViewMode>("consolidated");
  const [monthlyAlertModalOpen, setMonthlyAlertModalOpen] = useState<boolean>(false);
  const [alertToast, setAlertToast] = useState<string | null>(null);

  // Keep department synced for department-bound roles
  useEffect(() => {
    if (role !== "admin") {
      const boundDept = user?.department_id || linkedTeacher?.department_id;
      if (boundDept) setSelectedDept(boundDept);
    }
  }, [role, user?.department_id, linkedTeacher?.department_id]);

  // Departments list permitted for role
  const departments = useMemo(() => {
    if (role === "admin") return allDepartments;
    const boundDept = user?.department_id || linkedTeacher?.department_id;
    if (boundDept) {
      return allDepartments.filter((d) => d.id === boundDept);
    }
    return allDepartments;
  }, [allDepartments, role, user, linkedTeacher]);

  // Subjects permitted for role and academic filters
  const permittedSubjects = useMemo(() => {
    let list = allSubjects;

    if (role === "admin") {
      list = allSubjects;
    } else if (role === "hod") {
      const boundDept = user?.department_id || linkedTeacher?.department_id;
      list = allSubjects.filter((s) => !boundDept || s.department_id === boundDept);
    } else if (role === "class_coordinator") {
      const boundDept = user?.department_id || linkedTeacher?.department_id;
      list = allSubjects.filter((s) => {
        const matchesDept = !boundDept || s.department_id === boundDept;
        const matchesSem = s.semester === coordSem || s.year === coordYear;
        return matchesDept && matchesSem;
      });
    } else if (role === "teacher") {
      if (teacherAssignedSubjectIds.size > 0) {
        list = allSubjects.filter((s) => teacherAssignedSubjectIds.has(s.id));
      } else {
        const boundDept = user?.department_id || linkedTeacher?.department_id;
        list = allSubjects.filter((s) => !boundDept || s.department_id === boundDept);
      }
    } else if (role === "student") {
      const ownStudentId = user?.student_id;
      const ownSubjectIds = new Set(
        attendance.filter((a) => a.student_id === ownStudentId).map((a) => a.subject_id)
      );
      list = allSubjects.filter((s) => ownSubjectIds.has(s.id));
    }

    // Apply Year and Department filter if selected
    return list.filter((s) => {
      const sYear = s.year || getEngineeringYearFromSemester(s.semester);
      if (selectedDept !== "__all" && s.department_id && s.department_id !== selectedDept)
        return false;
      if (selectedYear !== "__all" && String(sYear) !== selectedYear) return false;
      return true;
    });
  }, [
    allSubjects,
    role,
    user,
    linkedTeacher,
    coordSem,
    coordYear,
    teacherAssignedSubjectIds,
    attendance,
    selectedDept,
    selectedYear,
  ]);

  // Academic classes permitted for role
  const permittedClasses = useMemo(() => {
    if (role === "teacher" && teacherAssignedClassNames.length > 0) {
      const teacherClassItems = teacherAssignedClassNames.map((name) => ({
        id: name,
        name: name,
        department_id: selectedDept,
        year: Number(selectedYear) || 2,
        semester: 0,
      }));
      // Also include academic classes matching teacher subjects
      const matchAcademic = allAcademicClasses.filter(
        (c) =>
          teacherAssignedClassNames.includes(c.name) ||
          c.department_id === selectedDept
      );
      const combined = [...teacherClassItems];
      matchAcademic.forEach((c) => {
        if (!combined.some((item) => item.name === c.name)) combined.push(c);
      });
      return combined;
    }

    const filtered = allAcademicClasses.filter((c) => {
      if (selectedDept !== "__all" && c.department_id !== selectedDept) return false;
      const classYear = c.year || getEngineeringYearFromSemester(c.semester);
      if (selectedYear !== "__all" && String(classYear) !== selectedYear) return false;
      return true;
    });

    // Provide standard batch/division options if missing
    if (selectedYear !== "__all" && filtered.length === 0) {
      const yrCode = getEngineeringYearCode(Number(selectedYear));
      return [
        {
          id: `${yrCode}-Div-A`,
          name: `${yrCode} Division A`,
          department_id: selectedDept,
          year: Number(selectedYear),
          semester: 0,
        },
        {
          id: `${yrCode}-Div-B`,
          name: `${yrCode} Division B`,
          department_id: selectedDept,
          year: Number(selectedYear),
          semester: 0,
        },
      ];
    }

    return filtered;
  }, [
    role,
    teacherAssignedClassNames,
    allAcademicClasses,
    selectedDept,
    selectedYear,
  ]);

  // Students scoped for role
  const permittedStudents = useMemo(() => {
    if (role === "student") {
      const own = allStudents.find(
        (st) =>
          st.id === user?.student_id ||
          (user?.email && st.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.roll_number && st.roll_number === user.roll_number)
      );
      return own ? [own] : [];
    }

    let list = allStudents;

    // Department filtering
    if (selectedDept !== "__all") {
      list = list.filter((st) => st.department_id === selectedDept);
    } else if (role !== "admin") {
      const boundDept = user?.department_id || linkedTeacher?.department_id;
      if (boundDept) list = list.filter((st) => st.department_id === boundDept);
    }

    // Role-specific cohort scoping
    if (role === "class_coordinator") {
      list = list.filter((st) => {
        const stYear = st.year || getEngineeringYearFromSemester(st.semester);
        const matchesYear = stYear === coordYear;
        const matchesSem = st.semester === coordSem;
        return matchesYear || matchesSem;
      });
    } else if (role === "teacher") {
      const teacherSemesters = new Set(permittedSubjects.map((s) => s.semester));
      list = list.filter((st) => {
        const matchesSem = teacherSemesters.has(st.semester);
        const matchesClass =
          teacherAssignedClassNames.length === 0 ||
          (st.class_name && teacherAssignedClassNames.includes(st.class_name));
        return matchesSem || matchesClass;
      });
    }

    // Engineering Year Filter
    if (selectedYear !== "__all") {
      list = list.filter((st) => {
        const stYear = st.year || getEngineeringYearFromSemester(st.semester);
        return String(stYear) === selectedYear;
      });
    }

    // Class / Division Filter
    if (selectedClass !== "__all") {
      list = list.filter((st) => {
        if (st.class_id === selectedClass) return true;
        if (st.class_name?.toLowerCase() === selectedClass.toLowerCase()) return true;
        if (selectedClass.includes("Div-A") && st.class_name?.includes("A")) return true;
        if (selectedClass.includes("Div-B") && st.class_name?.includes("B")) return true;
        return false;
      });
    }

    return list;
  }, [
    role,
    user,
    allStudents,
    selectedDept,
    linkedTeacher,
    coordYear,
    coordSem,
    permittedSubjects,
    teacherAssignedClassNames,
    selectedYear,
    selectedClass,
  ]);

  // Keep selection valid when filters change
  useEffect(() => {
    if (
      selectedSubject !== "__all" &&
      !permittedSubjects.some((s) => s.id === selectedSubject)
    ) {
      setSelectedSubject("__all");
    }
  }, [permittedSubjects, selectedSubject]);

  useEffect(() => {
    if (
      selectedClass !== "__all" &&
      !permittedClasses.some((c) => c.id === selectedClass || c.name === selectedClass)
    ) {
      setSelectedClass("__all");
    }
  }, [permittedClasses, selectedClass]);

  // Generate Report Rows
  const reportRows: AttendanceReportRow[] = useMemo(() => {
    const list: AttendanceReportRow[] = [];

    const activeSubjects = permittedSubjects.filter(
      (s) => selectedSubject === "__all" || s.id === selectedSubject
    );

    permittedStudents.forEach((st) => {
      activeSubjects.forEach((sub) => {
        // Only evaluate if student and subject share semester or department
        if (st.semester && sub.semester && st.semester !== sub.semester) return;
        if (sub.department_id && st.department_id && sub.department_id !== st.department_id)
          return;

        const records = attendance.filter(
          (a) =>
            a.student_id === st.id &&
            a.subject_id === sub.id &&
            a.date >= startDate &&
            a.date <= endDate
        );

        if (records.length > 0) {
          const total = records.length;
          const present = records.filter((r) => r.status === "present").length;
          const absent = total - present;
          const percentage = Math.round((present / total) * 100);

          list.push({
            roll: st.roll_number,
            reg: st.reg_number || (st as any).prn_number || "—",
            name: st.full_name,
            className: st.class_name || "—",
            subject: `${sub.code} · ${sub.name}`,
            total,
            present,
            absent,
            percentage,
            parentName: st.parent_name || undefined,
            parentMobile: st.parent_mobile || undefined,
          });
        }
      });
    });

    return list;
  }, [permittedStudents, permittedSubjects, selectedSubject, attendance, startDate, endDate]);

  // Student Consolidated Summary: 1 row per student aggregating all subjects
  const studentSummaryRows: AttendanceReportRow[] = useMemo(() => {
    const studentMap = new Map<
      string,
      {
        roll: string;
        reg: string;
        name: string;
        className: string;
        total: number;
        present: number;
        absent: number;
        parentName?: string;
        parentMobile?: string;
      }
    >();

    reportRows.forEach((r) => {
      const key = r.roll;
      const existing = studentMap.get(key);
      if (!existing) {
        studentMap.set(key, {
          roll: r.roll,
          reg: r.reg,
          name: r.name,
          className: r.className || "—",
          total: r.total,
          present: r.present,
          absent: r.absent,
          parentName: r.parentName,
          parentMobile: r.parentMobile,
        });
      } else {
        existing.total += r.total;
        existing.present += r.present;
        existing.absent += r.absent;
      }
    });

    return Array.from(studentMap.values()).map((s) => ({
      roll: s.roll,
      reg: s.reg,
      name: s.name,
      className: s.className,
      subject: "Consolidated (All Subjects)",
      total: s.total,
      present: s.present,
      absent: s.absent,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      parentName: s.parentName,
      parentMobile: s.parentMobile,
    }));
  }, [reportRows]);

  // Defaulters List: records with attendance < 75%
  const defaulterRows: AttendanceReportRow[] = useMemo(() => {
    return reportRows.filter((r) => r.percentage < college.minAttendance);
  }, [reportRows]);

  // Active dataset according to selected view mode
  const activeDataset = useMemo(() => {
    if (viewMode === "defaulters") return defaulterRows;
    if (viewMode === "student_summary") return studentSummaryRows;
    return reportRows;
  }, [viewMode, defaulterRows, studentSummaryRows, reportRows]);

  // Filtered dataset by search query
  const displayedRows = useMemo(() => {
    if (!searchQuery.trim()) return activeDataset;
    const q = searchQuery.toLowerCase().trim();
    return activeDataset.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.roll.toLowerCase().includes(q) ||
        (r.reg && r.reg.toLowerCase().includes(q)) ||
        r.subject.toLowerCase().includes(q) ||
        (r.className && r.className.toLowerCase().includes(q))
    );
  }, [activeDataset, searchQuery]);

  // Statistical aggregates
  const stats = useMemo(() => {
    const totalRecords = reportRows.length;
    const uniqueStudents = new Set(reportRows.map((r) => r.roll)).size;
    const defaultersCount = new Set(defaulterRows.map((r) => r.roll)).size;
    const eligibleCount = Math.max(0, uniqueStudents - defaultersCount);
    const avgAttendance =
      totalRecords > 0
        ? Math.round(
            reportRows.reduce((acc, r) => acc + r.percentage, 0) / totalRecords
          )
        : 0;

    return {
      totalRecords,
      uniqueStudents,
      defaultersCount,
      eligibleCount,
      avgAttendance,
    };
  }, [reportRows, defaulterRows]);

  // Department and scope label strings
  const currentDeptLabel =
    selectedDept === "__all"
      ? "All Departments"
      : departments.find((d) => d.id === selectedDept)?.name || "Department";

  const currentYearLabel =
    selectedYear === "__all"
      ? "All Engineering Years"
      : `${getEngineeringYearCode(Number(selectedYear))} (${ENGINEERING_YEARS.find((y) => String(y.year) === selectedYear)?.name || `Year ${selectedYear}`})`;

  const currentClassLabel =
    selectedClass === "__all"
      ? "All Classes / Divisions"
      : permittedClasses.find((c) => c.id === selectedClass || c.name === selectedClass)?.name ||
        selectedClass;

  const currentSubjectLabel =
    selectedSubject === "__all"
      ? "All Curriculum Subjects"
      : permittedSubjects.find((s) => s.id === selectedSubject)?.name || selectedSubject;

  const roleScopeLabel =
    role === "admin"
      ? "Institutional Administrator (College-Wide)"
      : role === "hod"
      ? `HOD · ${currentDeptLabel}`
      : role === "class_coordinator"
      ? `Class Coordinator · Sem ${coordSem} (${currentClassLabel})`
      : role === "teacher"
      ? `Subject Faculty · ${linkedTeacher?.full_name || user?.full_name}`
      : "Student Personal Access";

  // Export handlers
  const handleDownloadPdf = () => {
    exportAttendancePdf({
      rows: displayedRows,
      periodLabel: `${startDate} to ${endDate}`,
      scopeLabel: `${currentDeptLabel} · ${currentYearLabel} · ${currentClassLabel}`,
      departmentLabel: currentDeptLabel,
      yearLabel: currentYearLabel,
      classLabel: currentClassLabel,
      subjectLabel: currentSubjectLabel,
      roleLabel: roleScopeLabel,
      isDefaulterReport: viewMode === "defaulters",
      reportTitle:
        viewMode === "defaulters"
          ? "ACADEMIC DEFAULTER AUDIT REPORT (< 75% ATTENDANCE)"
          : viewMode === "student_summary"
          ? "CONSOLIDATED STUDENT ATTENDANCE AUDIT REGISTER"
          : "OFFICIAL SUBJECT ATTENDANCE REGISTER & RECORD",
      fileName: `${viewMode === "defaulters" ? "Defaulters" : "Attendance"}_Report_${currentDeptLabel.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.pdf`,
    });
  };

  const handleDownloadExcel = () => {
    exportAttendanceExcel({
      rows: displayedRows,
      periodLabel: `${startDate} to ${endDate}`,
      scopeLabel: `${currentDeptLabel} · ${currentYearLabel} · ${currentClassLabel}`,
      departmentLabel: currentDeptLabel,
      yearLabel: currentYearLabel,
      classLabel: currentClassLabel,
      subjectLabel: currentSubjectLabel,
      roleLabel: roleScopeLabel,
      isDefaulterReport: viewMode === "defaulters",
      fileName: `${viewMode === "defaulters" ? "Defaulters" : "Attendance"}_Report_${currentDeptLabel.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.xlsx`,
    });
  };

  const handleDownloadCsv = () => {
    exportAttendanceCsv({
      rows: displayedRows,
      isDefaulterReport: viewMode === "defaulters",
      yearLabel: currentYearLabel,
      startDate,
      endDate,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Access Role Scope Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Official Attendance Reports & Audit Sign-Off
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-0.5 border-primary/30 bg-primary/10 text-primary"
            >
              {role === "admin" && "Institutional Admin (College-Wide)"}
              {role === "hod" && `Head of Department (${currentDeptLabel})`}
              {role === "class_coordinator" &&
                `Class Coordinator (${currentYearLabel} · ${currentClassLabel})`}
              {role === "teacher" &&
                `Subject Teacher (${linkedTeacher?.full_name || user?.full_name})`}
              {role === "student" && "Student Record"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate and export university-compliant attendance registers, defaulter audit
            sheets (&lt; {college.minAttendance}%), and multi-tier signature sign-offs.
          </p>
        </div>

        {/* Global Export & Alert Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            size="sm"
            onClick={() => setMonthlyAlertModalOpen(true)}
            className="text-xs h-9 shadow-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Bell className="mr-1.5 h-3.5 w-3.5" />
            Alert Defaulter Parents (Monthly)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={displayedRows.length === 0}
            className="text-xs h-9"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            disabled={displayedRows.length === 0}
            className="text-xs h-9 font-medium"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
            Excel (.xlsx)
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={displayedRows.length === 0}
            className={`text-xs h-9 shadow-xs font-semibold ${
              viewMode === "defaulters"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            {viewMode === "defaulters"
              ? "Download Defaulters PDF"
              : "Download Official PDF"}
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Students Evaluated</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {stats.uniqueStudents}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {stats.totalRecords} lecture allocations
          </span>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
            <span className="text-xs font-medium">Defaulters (&lt; {college.minAttendance}%)</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats.defaultersCount}
            </div>
            {stats.defaultersCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMonthlyAlertModalOpen(true)}
                className="text-[10px] h-6 px-2 border-rose-500/30 text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 font-bold"
              >
                <Bell className="h-3 w-3 mr-1" />
                Alert Parents
              </Button>
            )}
          </div>
          <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80 block mt-1">
            Exam detention risk / alert needed
          </span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-medium">Eligible Students (&ge; {college.minAttendance}%)</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.eligibleCount}
          </div>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
            Satisfies university attendance norm
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Cohort Average</span>
            <Percent className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {stats.avgAttendance}%
          </div>
          <span className="text-[11px] text-muted-foreground">
            Overall aggregate across records
          </span>
        </div>
      </div>

      {/* Primary Filtering Panel */}
      <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Date Filter Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Academic Attendance Date Range:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
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
                const past14 = new Date(Date.now() - 14 * 86400000)
                  .toISOString()
                  .split("T")[0];
                setStartDate(past14);
                setEndDate(todayStr);
              }}
            >
              Last 14 Days
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
            <Button
              variant="secondary"
              size="sm"
              className="text-[11px] h-7 px-2.5 font-semibold text-primary"
              onClick={() => {
                // Set to start of academic term (6 months ago)
                const sixMonthsAgo = new Date(Date.now() - 180 * 86400000)
                  .toISOString()
                  .split("T")[0];
                setStartDate(sixMonthsAgo);
                setEndDate(todayStr);
              }}
            >
              All Time / Semester
            </Button>
          </div>
        </div>

        {/* Form Controls Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              From Date
            </label>
            <DatePicker
              value={startDate}
              max={endDate}
              onChange={(val) => setStartDate(val || thirtyDaysAgo)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              To Date
            </label>
            <DatePicker
              value={endDate}
              min={startDate}
              max={todayStr}
              onChange={(val) => setEndDate(val || todayStr)}
            />
          </div>

          {/* Department Filter (Admin can choose all, others locked to department) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Department</span>
              {role !== "admin" && (
                <span className="text-[10px] text-primary">Scoped</span>
              )}
            </label>
            <Select
              value={selectedDept}
              disabled={role !== "admin"}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedYear("__all");
                setSelectedClass("__all");
                setSelectedSubject("__all");
              }}
              options={[
                ...(role === "admin"
                  ? [{ value: "__all", label: "All Departments" }]
                  : []),
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </div>

          {/* Engineering Year Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Academic Year</span>
              {role === "class_coordinator" && (
                <span className="text-[10px] text-primary">Year {coordYear}</span>
              )}
            </label>
            <Select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedClass("__all");
                setSelectedSubject("__all");
              }}
              options={[
                { value: "__all", label: "All Years (FE · SE · TE · BE)" },
                ...ENGINEERING_YEARS.map((y) => ({
                  value: String(y.year),
                  label: `${["FY", "SY", "TY", "LY"][y.year - 1]} · ${y.code} (${y.name})`,
                })),
              ]}
            />
          </div>

          {/* Class / Division Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Class / Division</span>
              {role === "teacher" && (
                <span className="text-[10px] text-primary">My Classes</span>
              )}
            </label>
            <Select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSubject("__all");
              }}
              options={[
                { value: "__all", label: "All Classes / Divisions" },
                ...permittedClasses.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
          </div>

          {/* Subject Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Subject</span>
              {role === "teacher" && (
                <span className="text-[10px] text-primary">Assigned</span>
              )}
            </label>
            <Select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              options={[
                {
                  value: "__all",
                  label:
                    role === "teacher"
                      ? "All My Assigned Subjects"
                      : "All Curriculum Subjects",
                },
                ...permittedSubjects.map((s) => ({
                  value: s.id,
                  label: `${s.code} - ${s.name}`,
                })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("consolidated")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "consolidated"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Subject-wise Register</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {reportRows.length}
            </Badge>
          </button>

          <button
            onClick={() => setViewMode("defaulters")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "defaulters"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Defaulters List (&lt; {college.minAttendance}%)</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1 py-0 h-4 ${
                viewMode === "defaulters"
                  ? "border-white/30 text-white"
                  : "border-rose-500/30 text-rose-600 dark:text-rose-400"
              }`}
            >
              {defaulterRows.length}
            </Badge>
          </button>

          <button
            onClick={() => setViewMode("student_summary")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "student_summary"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Student Consolidated</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {studentSummaryRows.length}
            </Badge>
          </button>
        </div>

        {/* Real-Time Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, roll, subject..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {viewMode === "defaulters" && (
          <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <span className="font-semibold block sm:inline">
                  Official Attendance Shortfall Alert (&lt; {college.minAttendance}%):{" "}
                </span>
                <span>
                  Students below required university minimum. Send automated SMS alerts to parents or download official warning notices.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setMonthlyAlertModalOpen(true)}
                className="text-xs h-7 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                <Bell className="mr-1 h-3 w-3" />
                Alert Parents for Month
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPdf}
                className="text-xs h-7 border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20"
              >
                Download Defaulter Notice PDF
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-20 font-bold">Roll No</TableHead>
                <TableHead className="w-24">Reg / PRN</TableHead>
                <TableHead className="min-w-40 font-bold">Student Name</TableHead>
                <TableHead className="w-28">Class / Div</TableHead>
                <TableHead className="min-w-44">Subject</TableHead>
                <TableHead className="text-right w-16">Total</TableHead>
                <TableHead className="text-right w-16 text-emerald-600 font-bold">
                  Present
                </TableHead>
                <TableHead className="text-right w-16 text-rose-600 font-bold">
                  Absent
                </TableHead>
                <TableHead className="text-right w-24 font-bold">
                  Attendance %
                </TableHead>
                {viewMode === "defaulters" && (
                  <>
                    <TableHead className="min-w-32">Parent Contact</TableHead>
                    <TableHead className="w-24 text-right">Alert Action</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={viewMode === "defaulters" ? 11 : 9}
                    className="py-14 text-center text-muted-foreground"
                  >
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">
                        No attendance records found for this period
                      </p>
                      <p className="text-xs text-muted-foreground">
                        No sessions matched between {startDate} and {endDate} with the
                        selected filters. Try switching the date preset to &quot;Last 14
                        Days&quot; or &quot;All Time / Semester&quot;.
                      </p>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            const sixMonths = new Date(Date.now() - 180 * 86400000)
                              .toISOString()
                              .split("T")[0];
                            setStartDate(sixMonths);
                            setEndDate(todayStr);
                          }}
                        >
                          View All Semester Records
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedRows.map((r, idx) => {
                  const isDefaulter = r.percentage < college.minAttendance;
                  return (
                    <TableRow
                      key={`${r.roll}-${r.subject}-${idx}`}
                      className={
                        isDefaulter && viewMode !== "defaulters"
                          ? "bg-rose-500/5 hover:bg-rose-500/10"
                          : ""
                      }
                    >
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {r.roll}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {r.reg}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {r.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {r.className || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {r.subject}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {r.total}
                      </TableCell>
                      <TableCell className="text-right text-xs text-emerald-600 font-semibold">
                        {r.present}
                      </TableCell>
                      <TableCell className="text-right text-xs text-rose-600 font-semibold">
                        {r.absent}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={isDefaulter ? "destructive" : "secondary"}
                          className={`text-xs font-bold px-2 py-0.5 ${
                            isDefaulter
                              ? "bg-rose-600 text-white"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {r.percentage}%
                        </Badge>
                      </TableCell>
                      {viewMode === "defaulters" && (
                        <>
                          <TableCell className="text-xs">
                            {r.parentMobile ? (
                              <div className="flex items-center justify-between gap-1.5">
                                <div>
                                  <span className="font-mono text-foreground font-semibold">
                                    {r.parentMobile}
                                  </span>
                                  {r.parentName && (
                                    <span className="block text-[10px] text-muted-foreground">
                                      ({r.parentName})
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={getParentWhatsAppUrl(
                                    r.parentMobile,
                                    `Dear Parent, Your ward ${r.name} (Roll: ${r.roll}) has secured only ${r.percentage}% attendance. This is below the mandatory 75% university requirement. Please ensure regular attendance to avoid examination detention. - ${college.name}`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/15 shrink-0"
                                  title="Send WhatsApp Direct Message"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">
                                No mobile
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMonthlyAlertModalOpen(true)}
                              className="text-[10px] h-6 px-2 border-rose-500/30 text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 font-semibold"
                            >
                              <Bell className="h-2.5 w-2.5 mr-1" />
                              Alert
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer Summary Bar */}
        {displayedRows.length > 0 && (
          <div className="p-3 bg-muted/40 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{displayedRows.length}</span>{" "}
              records across {currentYearLabel} · {currentDeptLabel}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                &ge; {college.minAttendance}%: {stats.eligibleCount} Eligible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                &lt; {college.minAttendance}%: {stats.defaultersCount} Defaulters
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Low Attendance Parent Alert Modal (< 75%) */}
      <MonthlyLowAttendanceAlertModal
        open={monthlyAlertModalOpen}
        onOpenChange={setMonthlyAlertModalOpen}
        filteredStudents={permittedStudents}
        filteredSubjects={permittedSubjects}
        roleScopeLabel={roleScopeLabel}
        onAlertsSent={(count) => {
          setAlertToast(
            `Successfully dispatched monthly low attendance SMS alerts to ${count} parent(s)!`
          );
          setTimeout(() => setAlertToast(null), 5000);
        }}
      />

      {/* Toast Alert Notification */}
      {alertToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-card border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{alertToast}</span>
        </div>
      )}
    </div>
  );
};
