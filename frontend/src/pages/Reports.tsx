import React, { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
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
  Calendar,
  Building2,
  Lock,
  RotateCcw,
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
type StudentCategoryFilter = "all" | "defaulters" | "eligible";
type ReportViewType = "subject" | "student_summary";

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

  // Date range state (Empty by default: user selects date to access report)
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
  const [studentCategory, setStudentCategory] = useState<StudentCategoryFilter>("all");
  const [reportViewType, setReportViewType] = useState<ReportViewType>("subject");
  const [searchQuery, setSearchQuery] = useState<string>("");
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
    if (selectedDept !== "__all" && filtered.length === 0) {
      const dept = allDepartments.find((d) => d.id === selectedDept);
      const code = dept?.code || "DIV";
      return [
        {
          id: `${code}-FY-A`,
          name: `FY ${code}-A`,
          department_id: selectedDept,
          year: 1,
          semester: 1,
        },
        {
          id: `${code}-SY-A`,
          name: `SY ${code}-A`,
          department_id: selectedDept,
          year: 2,
          semester: 3,
        },
        {
          id: `${code}-SY-B`,
          name: `SY ${code}-B`,
          department_id: selectedDept,
          year: 2,
          semester: 3,
        },
        {
          id: `${code}-TY-A`,
          name: `TY ${code}-A`,
          department_id: selectedDept,
          year: 3,
          semester: 5,
        },
        {
          id: `${code}-BE-A`,
          name: `BE ${code}-A`,
          department_id: selectedDept,
          year: 4,
          semester: 7,
        },
      ];
    } else if (selectedYear !== "__all" && filtered.length === 0) {
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
    allDepartments,
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
    // Show list only when a date filter is selected by the user
    if (!startDate && !endDate) return [];

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

        const records = attendance.filter((a) => {
          if (a.student_id !== st.id || a.subject_id !== sub.id) return false;
          if (startDate && a.date < startDate) return false;
          if (endDate && a.date > endDate) return false;
          return true;
        });

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

  // Base dataset according to selected report format
  const baseDataset = useMemo(() => {
    return reportViewType === "student_summary" ? studentSummaryRows : reportRows;
  }, [reportViewType, studentSummaryRows, reportRows]);

  // Categorize students by attendance status (All / Defaulters / Eligible)
  const categorizedDataset = useMemo(() => {
    if (studentCategory === "defaulters") {
      return baseDataset.filter((r) => r.percentage < college.minAttendance);
    }
    if (studentCategory === "eligible") {
      return baseDataset.filter((r) => r.percentage >= college.minAttendance);
    }
    return baseDataset;
  }, [baseDataset, studentCategory]);

  // Filtered dataset by search query
  const displayedRows = useMemo(() => {
    if (!searchQuery.trim()) return categorizedDataset;
    const q = searchQuery.toLowerCase().trim();
    return categorizedDataset.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.roll.toLowerCase().includes(q) ||
        (r.reg && r.reg.toLowerCase().includes(q)) ||
        r.subject.toLowerCase().includes(q) ||
        (r.className && r.className.toLowerCase().includes(q))
    );
  }, [categorizedDataset, searchQuery]);

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
    const isDefaulterReport = studentCategory === "defaulters";
    const dateRangeLabel =
      startDate && endDate
        ? `${startDate} to ${endDate}`
        : startDate
        ? `From ${startDate}`
        : endDate
        ? `Up to ${endDate}`
        : "All Dates";
    exportAttendancePdf({
      rows: displayedRows,
      periodLabel: dateRangeLabel,
      scopeLabel: `${currentDeptLabel} · ${currentYearLabel} · ${currentClassLabel}`,
      departmentLabel: currentDeptLabel,
      yearLabel: currentYearLabel,
      classLabel: currentClassLabel,
      subjectLabel: currentSubjectLabel,
      roleLabel: roleScopeLabel,
      isDefaulterReport,
      reportTitle: isDefaulterReport
        ? "ACADEMIC DEFAULTER REPORT (< 75% ATTENDANCE)"
        : reportViewType === "student_summary"
        ? "CONSOLIDATED STUDENT ATTENDANCE REPORT"
        : "OFFICIAL ATTENDANCE REPORT",
      fileName: `${isDefaulterReport ? "Defaulters" : "Attendance"}_Report_${startDate || "all"}_to_${endDate || "latest"}.pdf`,
    });
  };

  const handleDownloadExcel = () => {
    const isDefaulterReport = studentCategory === "defaulters";
    const dateRangeLabel =
      startDate && endDate
        ? `${startDate} to ${endDate}`
        : startDate
        ? `From ${startDate}`
        : endDate
        ? `Up to ${endDate}`
        : "All Dates";
    exportAttendanceExcel({
      rows: displayedRows,
      periodLabel: dateRangeLabel,
      scopeLabel: `${currentDeptLabel} · ${currentYearLabel} · ${currentClassLabel}`,
      departmentLabel: currentDeptLabel,
      yearLabel: currentYearLabel,
      classLabel: currentClassLabel,
      subjectLabel: currentSubjectLabel,
      roleLabel: roleScopeLabel,
      isDefaulterReport,
      fileName: `${isDefaulterReport ? "Defaulters" : "Attendance"}_Report_${startDate || "all"}_to_${endDate || "latest"}.xlsx`,
    });
  };

  const handleDownloadCsv = () => {
    exportAttendanceCsv({
      rows: displayedRows,
      isDefaulterReport: studentCategory === "defaulters",
      yearLabel: currentYearLabel,
      startDate,
      endDate,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header and Export Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Attendance Reports
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 border-primary/30 bg-primary/10 text-primary"
            >
              {role === "admin" && "Admin (College-Wide)"}
              {role === "hod" && `HOD · ${currentDeptLabel}`}
              {role === "class_coordinator" && `Coordinator · ${currentClassLabel}`}
              {role === "teacher" && `Faculty · ${linkedTeacher?.full_name || user?.full_name}`}
              {role === "student" && "My Record"}
            </Badge>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {stats.defaultersCount > 0 && (
            <Button
              size="sm"
              onClick={() => setMonthlyAlertModalOpen(true)}
              className="text-xs h-9 font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              Alert Defaulter Parents
            </Button>
          )}

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
            Excel
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={displayedRows.length === 0}
            className={`text-xs h-9 font-semibold ${
              studentCategory === "defaulters"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            {studentCategory === "defaulters" ? "Download Defaulters PDF" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Students</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {stats.uniqueStudents}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
            <span className="text-xs font-medium">Defaulters (&lt; {college.minAttendance}%)</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.defaultersCount}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-medium">Not Defaulter (&ge; {college.minAttendance}%)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.eligibleCount}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Average Attendance</span>
            <Percent className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {stats.avgAttendance}%
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
        {/* Academic Hierarchy & Filters Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Department Filter (Admin selects, HOD/others fixed) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>Department</span>
              </span>
              {role === "admin" ? (
                selectedDept !== "__all" && (
                  <span className="text-[10px] text-primary font-bold">Filtered</span>
                )
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                  <Lock className="h-2.5 w-2.5" /> Fixed
                </span>
              )}
            </label>
            {role === "admin" ? (
              <Select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedClass("__all");
                  setSelectedSubject("__all");
                }}
                options={[
                  { value: "__all", label: "All Departments" },
                  ...allDepartments.map((d) => ({
                    value: d.id,
                    label: `${d.code} - ${d.name}`,
                  })),
                ]}
              />
            ) : (
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/60 text-xs font-semibold text-foreground">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{currentDeptLabel}</span>
              </div>
            )}
          </div>

          {/* Class / Division Filter (Scoped dynamically to selected Department) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Class / Division</span>
            </label>
            <Select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSubject("__all");
              }}
              options={[
                {
                  value: "__all",
                  label:
                    selectedDept === "__all"
                      ? "All Classes / Divisions"
                      : `All ${departments.find((d) => d.id === selectedDept)?.code || ""} Divisions`,
                },
                ...permittedClasses.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
          </div>

          {/* Subject Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Subject</span>
            </label>
            <Select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              options={[
                {
                  value: "__all",
                  label: role === "teacher" ? "All My Subjects" : "All Subjects",
                },
                ...permittedSubjects.map((s) => ({
                  value: s.id,
                  label: `${s.code} - ${s.name}`,
                })),
              ]}
            />
          </div>

          {/* Report Format */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Format</span>
            </label>
            <Select
              value={reportViewType}
              onChange={(e) => setReportViewType(e.target.value as ReportViewType)}
              options={[
                { value: "subject", label: "Subject-wise" },
                { value: "student_summary", label: "Consolidated (All Subjects)" },
              ]}
            />
          </div>
        </div>

        {/* Date Filters, Search & Action Bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-border/40">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>From Date</span>
            </label>
            <DatePicker
              value={startDate}
              max={endDate || todayStr}
              placeholder="Select Date"
              onChange={(val) => setStartDate(val || "")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>To Date</span>
            </label>
            <DatePicker
              value={endDate}
              min={startDate}
              max={todayStr}
              placeholder="Select Date"
              onChange={(val) => setEndDate(val || "")}
            />
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-primary" />
                <span>Quick Search</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Showing <strong className="text-foreground">{displayedRows.length}</strong> records
              </span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, roll no, subject, division..."
                  className="pl-8 text-xs h-9"
                />
              </div>
              {(selectedDept !== initialDept ||
                selectedClass !== initialClass ||
                selectedSubject !== "__all" ||
                studentCategory !== "all" ||
                searchQuery ||
                startDate ||
                endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDept(initialDept);
                    setSelectedClass(initialClass);
                    setSelectedSubject("__all");
                    setStudentCategory("all");
                    setSearchQuery("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  title="Reset all filters to defaults"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Student Attendance List Table (Shown when Date is selected) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-20 font-bold">Roll No</TableHead>
                <TableHead className="min-w-44 font-bold">Student Name</TableHead>
                <TableHead className="w-28">Class / Div</TableHead>
                <TableHead className="min-w-44">Subject</TableHead>
                <TableHead className="text-right w-16">Total</TableHead>
                <TableHead className="text-right w-16 text-emerald-600 font-bold">Present</TableHead>
                <TableHead className="text-right w-16 text-rose-600 font-bold">Absent</TableHead>
                <TableHead className="text-right w-24 font-bold">Attendance %</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="min-w-32 text-right">Parent Contact / Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!startDate && !endDate ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-16 text-center text-muted-foreground">
                    <div className="max-w-sm mx-auto space-y-2.5">
                      <Calendar className="h-9 w-9 mx-auto text-primary/70" />
                      <p className="font-semibold text-foreground text-sm">
                        Select Date to View Attendance Report
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Please choose a date from the date pickers above to view attendance records and filter defaulters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                    <div className="max-w-sm mx-auto space-y-2">
                      <AlertTriangle className="h-7 w-7 mx-auto text-muted-foreground/60" />
                      <p className="font-semibold text-foreground text-sm">
                        No attendance records for this period
                      </p>
                      <p className="text-xs text-muted-foreground">
                        No sessions found between {startDate || "start"} and {endDate || "today"}.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedRows.map((r, idx) => {
                  const isDefaulter = r.percentage < college.minAttendance;
                  return (
                    <TableRow
                      key={`${r.roll}-${r.subject}-${idx}`}
                      className={isDefaulter ? "bg-rose-500/5 hover:bg-rose-500/10" : ""}
                    >
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {r.roll}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground text-xs">{r.name}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.className || "—"}
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
                      <TableCell className="text-center">
                        {isDefaulter ? (
                          <span className="inline-flex items-center text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            Defaulter
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            Eligible
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.parentMobile ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <span className="font-mono text-foreground text-[11px]">
                              {r.parentMobile}
                            </span>
                            <a
                              href={getParentWhatsAppUrl(
                                r.parentMobile,
                                `Dear Parent, Your ward ${r.name} (Roll: ${r.roll}) has secured ${r.percentage}% attendance. Required minimum is ${college.minAttendance}%. Please ensure regular attendance. - ${college.name}`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-500/15 inline-flex items-center"
                              title="Send WhatsApp Direct Message"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {isDefaulter && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setMonthlyAlertModalOpen(true)}
                                className="text-[10px] h-6 px-1.5 border-rose-500/30 text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 font-semibold ml-1"
                              >
                                <Bell className="h-2.5 w-2.5 mr-0.5" />
                                Alert
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">
                            No mobile
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer */}
        {displayedRows.length > 0 && (
          <div className="p-3 bg-muted/40 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{displayedRows.length}</span>{" "}
              records ({startDate} to {endDate})
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                Eligible (&ge; {college.minAttendance}%): {stats.eligibleCount}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                Defaulters (&lt; {college.minAttendance}%): {stats.defaultersCount}
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
