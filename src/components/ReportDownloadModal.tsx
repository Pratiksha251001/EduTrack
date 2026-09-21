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
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select } from './ui/select';
import { DatePicker } from './ui/date-picker';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { college } from '../lib/college';
import { exportAttendancePdf } from '../lib/pdfExport';
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

  // 1. Resolve Linked Teacher or Coordinator record
  const linkedTeacher = useMemo(() => {
    return localDb.teachers.find(
      (t) =>
        t.id === user?.teacher_id ||
        (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.employee_id && t.employee_id === user.employee_id)
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
    if (role !== 'teacher') return [1, 2, 3, 4];
    const years = new Set<number>();
    allSubjects.forEach((s) => {
      if (teacherAssignedSubjectIds.has(s.id)) {
        const y = s.year || getEngineeringYearFromSemester(s.semester);
        years.add(y);
      }
    });
    return years.size > 0 ? Array.from(years).sort() : [1, 2, 3, 4];
  }, [role, allSubjects, teacherAssignedSubjectIds]);

  // Student details if student role
  const linkedStudent = useMemo(() => {
    if (role !== 'student') return null;
    return allStudents.find(
      (st) =>
        st.id === user?.student_id ||
        (user?.email && st.email?.toLowerCase() === user.email.toLowerCase()) ||
        st.roll_number === user?.roll_number
    );
  }, [role, user, allStudents]);

  // 2. Department Scoping
  const availableDepartments = useMemo(() => {
    if (role === 'admin') return allDepartments;
    const deptId = user?.department_id || linkedTeacher?.department_id || linkedStudent?.department_id;
    if (deptId) {
      return allDepartments.filter((d) => d.id === deptId);
    }
    return allDepartments;
  }, [role, allDepartments, user, linkedTeacher, linkedStudent]);

  const defaultDeptId =
    role === 'admin'
      ? initialDeptId || '__all'
      : availableDepartments[0]?.id || user?.department_id || '__all';
  const [selectedDept, setSelectedDept] = useState<string>(defaultDeptId);

  // 3. Engineering Year Scoping (1st FE to 4th BE)
  const availableYears = useMemo(() => {
    if (role === 'admin' || role === 'hod') {
      return ENGINEERING_YEARS;
    }
    if (role === 'class_coordinator' && ccAssignedYear) {
      return ENGINEERING_YEARS.filter((y) => y.year === ccAssignedYear);
    }
    if (role === 'teacher') {
      return ENGINEERING_YEARS.filter((y) => teacherAssignedYears.includes(y.year));
    }
    if (role === 'student' && linkedStudent) {
      const stuYear = linkedStudent.year || getEngineeringYearFromSemester(linkedStudent.semester);
      return ENGINEERING_YEARS.filter((y) => y.year === stuYear);
    }
    return ENGINEERING_YEARS;
  }, [role, ccAssignedYear, teacherAssignedYears, linkedStudent]);

  const defaultYear = useMemo(() => {
    if (role === 'class_coordinator' && ccAssignedYear) return String(ccAssignedYear);
    if (role === 'student' && linkedStudent) {
      return String(linkedStudent.year || getEngineeringYearFromSemester(linkedStudent.semester));
    }
    if (initialYear && availableYears.some((y) => y.year === initialYear)) {
      return String(initialYear);
    }
    return availableYears[0]?.year ? String(availableYears[0].year) : '4';
  }, [role, ccAssignedYear, linkedStudent, initialYear, availableYears]);

  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);

  // Sync year if available years change
  useEffect(() => {
    if (!availableYears.some((y) => String(y.year) === selectedYear)) {
      if (availableYears[0]) {
        setSelectedYear(String(availableYears[0].year));
      }
    }
  }, [availableYears, selectedYear]);

  // 4. Semester Scoping (Filtered by selected Year)
  const availableSemesters = useMemo(() => {
    const yrNum = Number(selectedYear);
    const yrInfo = ENGINEERING_YEARS.find((y) => y.year === yrNum);
    if (!yrInfo) return [1, 2, 3, 4, 5, 6, 7, 8];
    if (role === 'class_coordinator' && ccAssignedSemester) {
      return yrInfo.semesters.includes(ccAssignedSemester) ? [ccAssignedSemester] : yrInfo.semesters;
    }
    if (role === 'student' && linkedStudent) {
      return [linkedStudent.semester];
    }
    return yrInfo.semesters;
  }, [selectedYear, role, ccAssignedSemester, linkedStudent]);

  const [selectedSemester, setSelectedSemester] = useState<string>('__all');

  // 5. Classes / Divisions Scoping for the chosen year and dept
  const availableClasses = useMemo(() => {
    const yrNum = Number(selectedYear);
    const yrInfo = ENGINEERING_YEARS.find((y) => y.year === yrNum);
    const validSems = yrInfo ? yrInfo.semesters : [1, 2, 3, 4, 5, 6, 7, 8];

    // From academic_classes table
    const matched = allAcademicClasses.filter((c) => {
      if (selectedDept !== '__all' && c.department_id !== selectedDept) return false;
      if (c.year && c.year !== yrNum) return false;
      if (!c.year && !validSems.includes(c.semester)) return false;
      return true;
    });

    // Also extract any distinct class_name from students in that year
    const studentClasses = new Set<string>();
    allStudents.forEach((st) => {
      const stYear = st.year || getEngineeringYearFromSemester(st.semester);
      if (stYear === yrNum && st.class_name) {
        if (selectedDept === '__all' || st.department_id === selectedDept) {
          studentClasses.add(st.class_name);
        }
      }
    });

    // Merge names
    const classNames = new Set(matched.map((c) => c.name));
    studentClasses.forEach((cn) => classNames.add(cn));

    const list = Array.from(classNames).sort();
    return list;
  }, [allAcademicClasses, allStudents, selectedDept, selectedYear]);

  const [selectedClass, setSelectedClass] = useState<string>('__all');

  // 6. Subject Scoping for the selected year & role
  const availableSubjects = useMemo(() => {
    const yrNum = Number(selectedYear);
    const yrInfo = ENGINEERING_YEARS.find((y) => y.year === yrNum);
    const validSems = yrInfo ? yrInfo.semesters : [1, 2, 3, 4, 5, 6, 7, 8];

    return allSubjects.filter((s) => {
      // Dept check
      if (selectedDept !== '__all' && s.department_id && s.department_id !== selectedDept) return false;
      // Year / Semester check
      const sYear = s.year || getEngineeringYearFromSemester(s.semester);
      if (sYear !== yrNum) return false;
      if (selectedSemester !== '__all' && s.semester !== Number(selectedSemester)) return false;

      // Role restrictions
      if (role === 'teacher') {
        return teacherAssignedSubjectIds.has(s.id);
      }
      if (role === 'class_coordinator' && ccAssignedSemester) {
        return s.semester === ccAssignedSemester;
      }
      if (role === 'student' && linkedStudent) {
        return s.semester === linkedStudent.semester;
      }
      return true;
    });
  }, [
    allSubjects,
    selectedDept,
    selectedYear,
    selectedSemester,
    role,
    teacherAssignedSubjectIds,
    ccAssignedSemester,
    linkedStudent,
  ]);

  const [selectedSubject, setSelectedSubject] = useState<string>('__all');

  // 7. Calculate Report Rows according to current selection and role rules
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
      className?: string;
    }> = [];

    const yrNum = Number(selectedYear);

    // Filter students
    const targetStudents = allStudents.filter((st) => {
      if (role === 'student' && linkedStudent && st.id !== linkedStudent.id) return false;
      if (selectedDept !== '__all' && st.department_id !== selectedDept) return false;

      const stYear = st.year || getEngineeringYearFromSemester(st.semester);
      if (stYear !== yrNum) return false;

      if (selectedSemester !== '__all' && st.semester !== Number(selectedSemester)) return false;
      if (selectedClass !== '__all' && st.class_name !== selectedClass) return false;

      return true;
    });

    // Filter subjects
    const targetSubjects = availableSubjects.filter(
      (s) => selectedSubject === '__all' || s.id === selectedSubject
    );

    targetStudents.forEach((st) => {
      targetSubjects.forEach((sub) => {
        if (st.semester !== sub.semester) return;
        if (sub.department_id && sub.department_id !== st.department_id) return;

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

          list.push({
            roll: st.roll_number,
            reg: st.reg_number || '—',
            name: st.full_name,
            subject: `${sub.code} · ${sub.name}`,
            total,
            present,
            absent,
            percentage,
            className: st.class_name || undefined,
          });
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
      fileName: `Attendance_${yearLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_to_${endDate}.pdf`,
    });
    onOpenChange(false);
  };

  const handleExportCsv = () => {
    const csvContent =
      'Roll No,Reg No,Student Name,Class,Subject,Total Classes,Present,Absent,Percentage\n' +
      reportRows
        .map(
          (r) =>
            `"${r.roll}","${r.reg}","${r.name}","${r.className || classLabel}","${r.subject}",${r.total},${r.present},${r.absent},${r.percentage}%`
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_${yearLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Download Attendance Report
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  {getEngineeringYearCode(Number(selectedYear))}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select Year (1st to 4th / FE to BE), Class division, and date interval to generate official reports.
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
              <div className="flex items-center gap-1">
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DatePicker value={startDate} max={endDate} onChange={(val) => setStartDate(val || thirtyDaysAgo)} />
              <DatePicker value={endDate} min={startDate} max={todayStr} onChange={(val) => setEndDate(val || todayStr)} />
            </div>
          </div>

          {/* Records preview count */}
          <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Matching Records:</span>
            <span className="font-bold text-foreground">
              {reportRows.length} student attendance rows found
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={reportRows.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV / Excel
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={reportRows.length === 0}
              className="font-semibold shadow-sm"
            >
              <FileText className="mr-2 h-4 w-4" /> Download Official PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
