import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  School,
  Building,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldAlert,
  Bell,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select } from './ui/select';
import { DatePicker } from './ui/date-picker';
import { MonthlyLowAttendanceAlertModal } from './MonthlyLowAttendanceAlertModal';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { college } from '../lib/college';
import {
  exportAttendancePdf,
  exportAttendanceExcel,
  exportAttendanceCsv,
  AttendanceReportRow,
} from '../lib/reportExportUtils';
import {
  ENGINEERING_YEARS,
  getEngineeringYearFromSemester,
  getEngineeringYearCode,
  getSemesterOptionsForEngineeringYear,
  getSemesterEngineeringLabel,
} from '../lib/engineeringUtils';

interface ReportDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialYear?: number;
  initialDeptId?: string;
}

export const ReportDownloadModal: React.FC<ReportDownloadModalProps> = ({
  open,
  onOpenChange,
  initialYear,
  initialDeptId,
}) => {
  const { user, role } = useAuth();
  const allStudents = localDb.students;
  const allSubjects = localDb.subjects;
  const allDepartments = localDb.departments;
  const allAcademicClasses = localDb.academic_classes;
  const attendance = localDb.attendance;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(todayStr);
  const [onlyDefaulters, setOnlyDefaulters] = useState(false);

  // 1. Resolve Linked Teacher or Coordinator record
  const linkedTeacher = useMemo(() => {
    return localDb.teachers.find(
      (t) =>
        t.id === user?.teacher_id ||
        (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.employee_id && t.employee_id === user.employee_id) ||
        t.user_id === user?.id
    );
  }, [user]);

  // Coordinator assigned year & semester
  const ccAssignedYear = useMemo(() => {
    if (role !== 'class_coordinator') return null;
    const assignment = localDb.class_coordinator_assignments.find(
      (a) => a.teacher_id === linkedTeacher?.id || a.teacher_id === user?.teacher_id
    );
    if (assignment?.year) return assignment.year;
    if (linkedTeacher?.assigned_year) return linkedTeacher.assigned_year;
    if (linkedTeacher?.assigned_semester) return getEngineeringYearFromSemester(linkedTeacher.assigned_semester);
    return user?.assigned_semester ? getEngineeringYearFromSemester(user.assigned_semester) : 3;
  }, [role, linkedTeacher, user]);

  const ccAssignedSemester = useMemo(() => {
    if (role !== 'class_coordinator') return null;
    const assignment = localDb.class_coordinator_assignments.find(
      (a) => a.teacher_id === linkedTeacher?.id || a.teacher_id === user?.teacher_id
    );
    return assignment?.semester || linkedTeacher?.assigned_semester || user?.assigned_semester || 5;
  }, [role, linkedTeacher, user]);

  // Teacher assigned subjects & years
  const teacherAssignedSubjectIds = useMemo(() => {
    if (role !== 'teacher') return new Set<string>();
    const teacherId = linkedTeacher?.id || user?.teacher_id || user?.id;
    const set = new Set<string>();
    localDb.teacher_subjects
      .filter((ts) => ts.teacher_id === teacherId)
      .forEach((ts) => set.add(ts.subject_id));
    allSubjects.forEach((s) => {
      if ((s as any).teacher_id === teacherId) set.add(s.id);
    });
    return set;
  }, [role, linkedTeacher, user, allSubjects]);

  const teacherAssignedYears = useMemo(() => {
    if (role !== 'teacher') return [];
    const years = new Set<number>();
    allSubjects.forEach((s) => {
      if (teacherAssignedSubjectIds.has(s.id)) {
        years.add(s.year || getEngineeringYearFromSemester(s.semester));
      }
    });
    return Array.from(years).sort();
  }, [role, allSubjects, teacherAssignedSubjectIds]);

  // Student linked data
  const linkedStudent = useMemo(() => {
    if (role !== 'student') return null;
    return allStudents.find(
      (st) =>
        st.id === user?.student_id ||
        (user?.email && st.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.roll_number && st.roll_number === user.roll_number)
    );
  }, [role, user, allStudents]);

  // Available Years based on role permissions
  const availableYears = useMemo(() => {
    if (role === 'admin' || role === 'hod') {
      return ENGINEERING_YEARS;
    }
    if (role === 'class_coordinator' && ccAssignedYear) {
      return ENGINEERING_YEARS.filter((y) => y.year === ccAssignedYear);
    }
    if (role === 'teacher' && teacherAssignedYears.length > 0) {
      return ENGINEERING_YEARS.filter((y) => teacherAssignedYears.includes(y.year));
    }
    if (role === 'student' && linkedStudent) {
      const sYear = linkedStudent.year || getEngineeringYearFromSemester(linkedStudent.semester);
      return ENGINEERING_YEARS.filter((y) => y.year === sYear);
    }
    return ENGINEERING_YEARS;
  }, [role, ccAssignedYear, teacherAssignedYears, linkedStudent]);

  // Default selection state
  const defaultYear = useMemo(() => {
    if (initialYear && availableYears.some((y) => y.year === initialYear)) {
      return String(initialYear);
    }
    if (role === 'class_coordinator' && ccAssignedYear) {
      return String(ccAssignedYear);
    }
    if (role === 'teacher' && teacherAssignedYears.length > 0) {
      return String(teacherAssignedYears[0]);
    }
    if (role === 'student' && linkedStudent) {
      return String(linkedStudent.year || getEngineeringYearFromSemester(linkedStudent.semester));
    }
    return String(availableYears[0]?.year || 2);
  }, [initialYear, availableYears, role, ccAssignedYear, teacherAssignedYears, linkedStudent]);

  const defaultDept = useMemo(() => {
    if (role === 'admin') return initialDeptId || '__all';
    return user?.department_id || linkedTeacher?.department_id || 'dept-1';
  }, [role, initialDeptId, user, linkedTeacher]);

  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedDept, setSelectedDept] = useState<string>(defaultDept);
  const [selectedSemester, setSelectedSemester] = useState<string>('__all');
  const [selectedClass, setSelectedClass] = useState<string>('__all');
  const [selectedSubject, setSelectedSubject] = useState<string>('__all');
  const [alertModalOpen, setAlertModalOpen] = useState<boolean>(false);

  // Reset or adjust selection when opening or role defaults change
  useEffect(() => {
    if (open) {
      setSelectedYear(defaultYear);
      setSelectedDept(defaultDept);
      setSelectedSemester('__all');
      setSelectedClass('__all');
      setSelectedSubject('__all');
      setOnlyDefaulters(false);
    }
  }, [open, defaultYear, defaultDept]);

  // Available Semesters for selected year
  const availableSemesters = useMemo(() => {
    const yr = Number(selectedYear);
    return getSemesterOptionsForEngineeringYear(yr);
  }, [selectedYear]);

  // Available Departments
  const availableDepartments = useMemo(() => {
    if (role === 'admin') return allDepartments;
    const boundDept = user?.department_id || linkedTeacher?.department_id;
    if (boundDept) {
      return allDepartments.filter((d) => d.id === boundDept);
    }
    return allDepartments;
  }, [allDepartments, role, user, linkedTeacher]);

  // Available Classes for selected Year & Dept
  const availableClasses = useMemo(() => {
    const yr = Number(selectedYear);
    const yrCode = getEngineeringYearCode(yr);

    const classesFromDb = allAcademicClasses
      .filter((c) => {
        const cYear = c.year || getEngineeringYearFromSemester(c.semester);
        const matchesYear = cYear === yr;
        const matchesDept = selectedDept === '__all' || c.department_id === selectedDept;
        return matchesYear && matchesDept;
      })
      .map((c) => c.name);

    const classesFromStudents = allStudents
      .filter((s) => {
        const sYear = s.year || getEngineeringYearFromSemester(s.semester);
        const matchesYear = sYear === yr;
        const matchesDept = selectedDept === '__all' || s.department_id === selectedDept;
        return matchesYear && matchesDept && s.class_name;
      })
      .map((s) => s.class_name as string);

    const set = new Set([...classesFromDb, ...classesFromStudents]);

    // Provide standard batch/division options if empty
    if (set.size === 0) {
      set.add(`${yrCode} Division A`);
      set.add(`${yrCode} Division B`);
    }

    return Array.from(set).sort();
  }, [selectedYear, selectedDept, allAcademicClasses, allStudents]);

  // Available Subjects for selected Year, Semester, and Dept
  const availableSubjects = useMemo(() => {
    const yr = Number(selectedYear);
    return allSubjects.filter((s) => {
      const sYear = s.year || getEngineeringYearFromSemester(s.semester);
      if (sYear !== yr) return false;
      if (selectedDept !== '__all' && s.department_id && s.department_id !== selectedDept) return false;
      if (selectedSemester !== '__all' && String(s.semester) !== selectedSemester) return false;

      // Role restrictions
      if (role === 'teacher' && teacherAssignedSubjectIds.size > 0) {
        return teacherAssignedSubjectIds.has(s.id);
      }
      return true;
    });
  }, [selectedYear, selectedDept, selectedSemester, allSubjects, role, teacherAssignedSubjectIds]);

  // Computed Report Rows
  const reportRows: AttendanceReportRow[] = useMemo(() => {
    const list: AttendanceReportRow[] = [];
    const yr = Number(selectedYear);

    // Filter students
    let targetStudents = allStudents.filter((st) => {
      const sYear = st.year || getEngineeringYearFromSemester(st.semester);
      if (sYear !== yr) return false;
      if (selectedDept !== '__all' && st.department_id !== selectedDept) return false;
      if (selectedSemester !== '__all' && String(st.semester) !== selectedSemester) return false;
      if (selectedClass !== '__all') {
        const matchesName = st.class_name === selectedClass;
        const matchesId = (st as any).class_id === selectedClass;
        if (!matchesName && !matchesId) return false;
      }
      if (role === 'student' && linkedStudent) {
        return st.id === linkedStudent.id;
      }
      return true;
    });

    const targetSubjects = availableSubjects.filter(
      (s) => selectedSubject === '__all' || s.id === selectedSubject
    );

    targetStudents.forEach((st) => {
      targetSubjects.forEach((sub) => {
        if (st.semester && sub.semester && st.semester !== sub.semester) return;

        const records = attendance.filter(
          (a) =>
            a.student_id === st.id &&
            a.subject_id === sub.id &&
            a.date >= startDate &&
            a.date <= endDate
        );

        if (records.length > 0) {
          const total = records.length;
          const present = records.filter((r) => r.status === 'present').length;
          const absent = total - present;
          const percentage = Math.round((present / total) * 100);

          if (!onlyDefaulters || percentage < college.minAttendance) {
            list.push({
              roll: st.roll_number,
              reg: st.reg_number || (st as any).prn_number || '—',
              name: st.full_name,
              className: st.class_name || selectedClass,
              subject: `${sub.code} · ${sub.name}`,
              total,
              present,
              absent,
              percentage,
              parentName: st.parent_name || undefined,
              parentMobile: st.parent_mobile || undefined,
            });
          }
        }
      });
    });

    return list;
  }, [
    allStudents,
    availableSubjects,
    attendance,
    role,
    linkedStudent,
    selectedDept,
    selectedYear,
    selectedSemester,
    selectedClass,
    selectedSubject,
    startDate,
    endDate,
    onlyDefaulters,
  ]);

  const yearLabel = useMemo(() => {
    const yInfo = ENGINEERING_YEARS.find((y) => y.year === Number(selectedYear));
    return yInfo ? yInfo.fullName : `Year ${selectedYear}`;
  }, [selectedYear]);

  const classLabel = selectedClass === '__all' ? 'All Classes / Divisions' : selectedClass;
  const deptLabel =
    selectedDept === '__all'
      ? 'All Departments'
      : allDepartments.find((d) => d.id === selectedDept)?.name || 'Filtered Department';
  const semLabel =
    selectedSemester === '__all'
      ? `All Semesters in Year (Sem ${availableSemesters.join(' & ')})`
      : `Semester ${selectedSemester}`;

  const roleBadgeLabel = useMemo(() => {
    if (role === 'admin') return 'Admin (Full College Access)';
    if (role === 'hod') return `HOD (${deptLabel} · All 4 Years)`;
    if (role === 'class_coordinator') return `Class Coordinator (${yearLabel})`;
    if (role === 'teacher') return `Subject Teacher (${yearLabel})`;
    if (role === 'student') return `Student Self-Report (${yearLabel})`;
    return role;
  }, [role, deptLabel, yearLabel]);

  const handleDownloadPdf = () => {
    exportAttendancePdf({
      rows: reportRows,
      periodLabel: `${startDate} to ${endDate}`,
      scopeLabel: `${deptLabel} • ${yearLabel} • ${classLabel}`,
      yearLabel,
      classLabel,
      semesterLabel: semLabel,
      departmentLabel: deptLabel,
      subjectLabel:
        selectedSubject === '__all'
          ? 'All Assigned Subjects'
          : availableSubjects.find((s) => s.id === selectedSubject)?.name,
      roleLabel: roleBadgeLabel,
      isDefaulterReport: onlyDefaulters,
      reportTitle: onlyDefaulters
        ? 'ACADEMIC DEFAULTER AUDIT REPORT (< 75% ATTENDANCE)'
        : 'OFFICIAL ACADEMIC ATTENDANCE AUDIT SHEET',
      fileName: `${onlyDefaulters ? 'Defaulters' : 'Attendance'}_${yearLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_to_${endDate}.pdf`,
    });
    onOpenChange(false);
  };

  const handleDownloadExcel = () => {
    exportAttendanceExcel({
      rows: reportRows,
      periodLabel: `${startDate} to ${endDate}`,
      scopeLabel: `${deptLabel} • ${yearLabel} • ${classLabel}`,
      yearLabel,
      classLabel,
      departmentLabel: deptLabel,
      subjectLabel:
        selectedSubject === '__all'
          ? 'All Assigned Subjects'
          : availableSubjects.find((s) => s.id === selectedSubject)?.name,
      roleLabel: roleBadgeLabel,
      isDefaulterReport: onlyDefaulters,
      fileName: `${onlyDefaulters ? 'Defaulters' : 'Attendance'}_${yearLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_to_${endDate}.xlsx`,
    });
    onOpenChange(false);
  };

  const handleExportCsv = () => {
    exportAttendanceCsv({
      rows: reportRows,
      isDefaulterReport: onlyDefaulters,
      yearLabel,
      startDate,
      endDate,
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Download Official Attendance Report
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  {getEngineeringYearCode(Number(selectedYear))}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate official university examination & audit reports in PDF, Excel, and CSV format.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Role Access Scope Info Banner */}
          <div className="p-3 bg-muted/50 rounded-xl border border-border flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs space-y-0.5">
              <span className="font-semibold text-foreground">Role Scoping Active: {roleBadgeLabel}</span>
              <p className="text-muted-foreground">
                {role === 'admin' && 'You have full authorization across all departments and all engineering years (FE to BE).'}
                {role === 'hod' && 'You are viewing all 4 engineering years (FE, SE, TE, BE) and classes in your department.'}
                {role === 'class_coordinator' && 'You are locked to your designated coordinator year and assigned class division.'}
                {role === 'teacher' && 'You are filtered to your assigned subjects and their respective engineering year cohorts.'}
                {role === 'student' && 'You are viewing your own personal attendance record for your enrolled year and semester.'}
              </p>
            </div>
          </div>

          {/* Form Fields: Year & Class First */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Engineering Year (FE, SE, TE, BE) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <School className="h-3.5 w-3.5 text-primary" /> Engineering Year (FE to BE) *
              </label>
              <Select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedSemester('__all');
                  setSelectedClass('__all');
                  setSelectedSubject('__all');
                }}
                disabled={availableYears.length === 1}
                options={availableYears.map((y) => ({
                  value: String(y.year),
                  label: `${y.name} • ${y.fullName}`,
                }))}
              />
            </div>

            {/* Class / Division */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Class / Division *
              </label>
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                options={[
                  { value: '__all', label: `All Classes in ${getEngineeringYearCode(Number(selectedYear))}` },
                  ...availableClasses.map((cn) => ({ value: cn, label: cn })),
                ]}
              />
            </div>

            {/* Department (if role is admin) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-primary" /> Department
              </label>
              <Select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                disabled={role !== 'admin' && availableDepartments.length <= 1}
                options={[
                  ...(role === 'admin' ? [{ value: '__all', label: 'All Departments' }] : []),
                  ...availableDepartments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>

            {/* Semester within Year */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" /> Semester
              </label>
              <Select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                disabled={availableSemesters.length === 1}
                options={[
                  ...(availableSemesters.length > 1
                    ? [{ value: '__all', label: `All Semesters (${availableSemesters.join(' & ')})` }]
                    : []),
                  ...availableSemesters.map((s) => ({
                    value: String(s),
                    label: `Semester ${s}`,
                  })),
                ]}
              />
            </div>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Subject / Curriculum Course
            </label>
            <Select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              options={[
                { value: '__all', label: `All Subjects in Year ${selectedYear} (${availableSubjects.length} courses)` },
                ...availableSubjects.map((s) => ({
                  value: s.id,
                  label: `${s.code} · ${s.name} (Sem ${s.semester})`,
                })),
              ]}
            />
          </div>

          {/* Date Range Selection */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Attendance Date Interval
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  className="text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground"
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground"
                  onClick={() => {
                    setStartDate(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
                    setEndDate(todayStr);
                  }}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  className="text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground"
                  onClick={() => {
                    setStartDate(thirtyDaysAgo);
                    setEndDate(todayStr);
                  }}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  className="text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted text-primary font-semibold"
                  onClick={() => {
                    setStartDate(new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0]);
                    setEndDate(todayStr);
                  }}
                >
                  All Semester
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DatePicker value={startDate} max={endDate} onChange={(val) => setStartDate(val || thirtyDaysAgo)} />
              <DatePicker value={endDate} min={startDate} max={todayStr} onChange={(val) => setEndDate(val || todayStr)} />
            </div>
          </div>

          {/* Defaulter Toggle Option */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`h-4 w-4 ${onlyDefaulters ? 'text-rose-600' : 'text-muted-foreground'}`} />
              <div>
                <span className="text-xs font-semibold text-foreground">Defaulter Report Only (&lt; {college.minAttendance}%)</span>
                <p className="text-[11px] text-muted-foreground">Filter export strictly to students failing university attendance threshold</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOnlyDefaulters(!onlyDefaulters)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                onlyDefaulters ? 'bg-rose-600' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  onlyDefaulters ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Records preview count */}
          <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Matching Records for Export:</span>
            <span className="font-bold text-foreground">
              {reportRows.length} student attendance rows found
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertModalOpen(true)}
              className="text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10 font-medium"
            >
              <Bell className="mr-1.5 h-3.5 w-3.5" /> Alert Parents (Monthly)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={reportRows.length === 0}
              className="text-xs"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              disabled={reportRows.length === 0}
              className="text-xs font-medium"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Excel (.xlsx)
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={reportRows.length === 0}
              className={`text-xs font-semibold shadow-xs ${
                onlyDefaulters ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
              }`}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              {onlyDefaulters ? 'Download Defaulters PDF' : 'Download Official PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Monthly Defaulter Alert Modal */}
    <MonthlyLowAttendanceAlertModal
      open={alertModalOpen}
      onOpenChange={setAlertModalOpen}
      filteredStudents={permittedStudents}
      filteredSubjects={permittedSubjects}
    />
  </>
  );
};
