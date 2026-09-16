import React, { useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet, FileText, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { college } from '../lib/college';
import { exportAttendancePdf } from '../lib/pdfExport';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { DatePicker } from '../components/ui/date-picker';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';

export const Reports: React.FC = () => {
  const { user, role } = useAuth();
  const allStudents = localDb.students;
  const allSubjects = localDb.subjects;
  const allDepartments = localDb.departments;
  const attendance = localDb.attendance;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(todayStr);

  // Initialize selectedDept based on role
  const defaultDept = role === 'admin' ? '__all' : user?.department_id || '__all';
  const [selectedDept, setSelectedDept] = useState<string>(defaultDept);
  const [selectedSubject, setSelectedSubject] = useState<string>('__all');

  useEffect(() => {
    if (role !== 'admin' && user?.department_id) {
      setSelectedDept(user.department_id);
    }
  }, [role, user?.department_id]);

  // Scoped subjects based on role
  const subjects = useMemo(() => {
    if (role === 'admin') return allSubjects;
    if (role === 'hod') {
      return allSubjects.filter((s) => !user?.department_id || s.department_id === user.department_id);
    }
    if (role === 'class_coordinator') {
      const teacherRec = localDb.teachers.find(
        (t) =>
          t.id === user?.teacher_id ||
          (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.employee_id && t.employee_id === user.employee_id) ||
          (t.is_class_coordinator && t.department_id === user?.department_id)
      );
      const coordSem = teacherRec?.assigned_semester || user?.assigned_semester || 5;
      const deptId = user?.department_id || teacherRec?.department_id;
      return allSubjects.filter(
        (s) => (!deptId || s.department_id === deptId) && s.semester === coordSem
      );
    }
    if (role === 'teacher') {
      const teacherId = user?.teacher_id || user?.id;
      const mySubjectIds = new Set(
        localDb.teacher_subjects
          .filter((ts) => ts.teacher_id === teacherId)
          .map((ts) => ts.subject_id)
      );
      allSubjects.forEach((s) => {
        if ((s as any).teacher_id === teacherId) {
          mySubjectIds.add(s.id);
        }
      });
      if (mySubjectIds.size > 0) {
        return allSubjects.filter((s) => mySubjectIds.has(s.id));
      }
      return allSubjects.filter((s) => !user?.department_id || s.department_id === user.department_id);
    }
    return allSubjects;
  }, [allSubjects, role, user]);

  // Scoped students based on role
  const students = useMemo(() => {
    if (role === 'admin') return allStudents;
    if (role === 'hod') {
      return allStudents.filter((st) => !user?.department_id || st.department_id === user.department_id);
    }
    if (role === 'class_coordinator') {
      const teacherRec = localDb.teachers.find(
        (t) =>
          t.id === user?.teacher_id ||
          (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.employee_id && t.employee_id === user.employee_id) ||
          (t.is_class_coordinator && t.department_id === user?.department_id)
      );
      const coordSem = teacherRec?.assigned_semester || user?.assigned_semester || 5;
      const deptId = user?.department_id || teacherRec?.department_id;
      return allStudents.filter(
        (st) => (!deptId || st.department_id === deptId) && st.semester === coordSem
      );
    }
    if (role === 'teacher') {
      // Students in semesters of the teacher's assigned subjects
      const teacherSemesters = new Set(subjects.map((s) => s.semester));
      return allStudents.filter(
        (st) =>
          (!user?.department_id || st.department_id === user.department_id) &&
          teacherSemesters.has(st.semester)
      );
    }
    return allStudents;
  }, [allStudents, subjects, role, user]);

  const departments = useMemo(() => {
    if (role === 'admin') return allDepartments;
    if (user?.department_id) {
      return allDepartments.filter((d) => d.id === user.department_id);
    }
    return allDepartments;
  }, [allDepartments, role, user]);

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

    const filteredSubjects = subjects.filter(s => selectedSubject === '__all' || s.id === selectedSubject);

    students.forEach(st => {
      if (selectedDept !== '__all' && st.department_id !== selectedDept) return;

      filteredSubjects.forEach(sub => {
        if (st.semester !== sub.semester) return;
        if (sub.department_id && sub.department_id !== st.department_id) return;

        const records = attendance.filter(
          a => a.student_id === st.id && a.subject_id === sub.id && a.date >= startDate && a.date <= endDate
        );

        if (records.length > 0) {
          const total = records.length;
          const present = records.filter(r => r.status === 'present').length;
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
          });
        }
      });
    });

    return list;
  }, [students, subjects, attendance, startDate, endDate, selectedDept, selectedSubject]);

  const exportCsv = () => {
    const csvContent =
      'Roll No,Reg No,Student Name,Subject,Total Classes,Present,Absent,Percentage\n' +
      reportRows.map(r => `"${r.roll}","${r.reg}","${r.name}","${r.subject}",${r.total},${r.present},${r.absent},${r.percentage}%`).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = () => {
    exportAttendancePdf({
      rows: reportRows,
      periodLabel: `${startDate} to ${endDate}`,
      scopeLabel: selectedDept === '__all' ? 'All Departments' : departments.find(d => d.id === selectedDept)?.name || 'Filtered',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-2xl font-bold">Attendance Reports & Sign-off</h2>
            <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary">
              {role === 'admin' && 'College-Wide Reports'}
              {role === 'hod' && `Department Scope (${user?.department_id || 'All Classes'})`}
              {role === 'class_coordinator' && `Class Coordinator Scope (Sem ${user?.assigned_semester || 5})`}
              {role === 'teacher' && 'Assigned Classes & Subjects'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Aggregate student attendance across date intervals with audit-ready PDF & CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={reportRows.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={handlePdfExport} disabled={reportRows.length === 0}>
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
                const past7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
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
                const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">From Date</label>
            <DatePicker value={startDate} max={endDate} onChange={val => setStartDate(val || thirtyDaysAgo)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">To Date</label>
            <DatePicker value={endDate} min={startDate} max={todayStr} onChange={val => setEndDate(val || todayStr)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Department</label>
            <Select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              options={[
                { value: '__all', label: 'All Departments' },
                ...departments.map(d => ({ value: d.id, label: d.name })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Subject</label>
            <Select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              options={[
                { value: '__all', label: 'All Subjects' },
                ...subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` })),
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
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No attendance records found for the selected filter parameters.
                </TableCell>
              </TableRow>
            ) : (
              reportRows.map(r => (
                <TableRow key={`${r.roll}-${r.subject}`}>
                  <TableCell className="font-mono text-xs font-bold">{r.roll}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.reg}</TableCell>
                  <TableCell className="font-semibold">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.subject}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">{r.present}</TableCell>
                  <TableCell className="text-right text-destructive font-medium">{r.absent}</TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      r.percentage < college.minAttendance ? 'text-destructive' : 'text-emerald-600'
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
