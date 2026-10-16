import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  UserCog,
  GraduationCap,
  Layers,
  BookOpen,
  ClipboardCheck,
  Check,
  ArrowRight,
  TrendingUp,
  Search,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { TeacherSubject } from "../lib/types";
import {
  CURRENT_ACADEMIC_YEAR,
  ENGINEERING_YEARS,
  getEngineeringYearFromSemester,
  getSemesterEngineeringLabel,
} from "../lib/college";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const HODDashboard: React.FC = () => {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectSemFilter, setSubjectSemFilter] = useState("all");

  useEffect(() => {
    const handleUpdate = () => {
      setVersion((v) => v + 1);
    };
    window.addEventListener("edutrack_data_updated", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_data_updated", handleUpdate);
    };
  }, []);

  const departments = localDb.departments;
  const teachers = localDb.teachers;
  const assignments = localDb.class_coordinator_assignments;
  const teacherSubjects = localDb.teacher_subjects as TeacherSubject[];
  const students = localDb.students;
  const subjects = localDb.subjects;
  const academicClasses = localDb.academic_classes;

  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const assignedDepartmentId =
    user?.department_id || linkedTeacher?.department_id;
  const myDepartment = departments.find((d) => d.id === assignedDepartmentId);

  const deptTeachers = useMemo(() => {
    if (!assignedDepartmentId) return [];
    return teachers.filter(
      (teacher) =>
        teacher.department_id === assignedDepartmentId &&
        teacher.status === "active",
    );
  }, [teachers, assignedDepartmentId, version]);

  const deptStudents = useMemo(() => {
    if (!assignedDepartmentId) return [];
    return students.filter(
      (student) =>
        student.department_id === assignedDepartmentId &&
        student.status === "active",
    );
  }, [students, assignedDepartmentId, version]);

  const deptClasses = useMemo(() => {
    if (!assignedDepartmentId) return [];
    return academicClasses.filter(
      (c) => c.department_id === assignedDepartmentId && c.status === "active",
    );
  }, [academicClasses, assignedDepartmentId, version]);

  const deptAssignments = useMemo(() => {
    if (!assignedDepartmentId) return [];
    return assignments.filter((a) => {
      const teacher = teachers.find((t) => t.id === a.teacher_id);
      return teacher?.department_id === assignedDepartmentId;
    });
  }, [assignments, teachers, assignedDepartmentId, version]);

  // ALL subjects belonging to HOD's department, including all subjects added by Class Coordinators
  const allDeptSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (!assignedDepartmentId) return true;
      return !s.department_id || s.department_id === assignedDepartmentId;
    });
  }, [subjects, assignedDepartmentId, version]);

  // Filtered department subjects for search & semester filter
  const filteredDeptSubjects = useMemo(() => {
    let list = allDeptSubjects;
    if (subjectSemFilter !== "all") {
      list = list.filter((s) => s.semester === Number(subjectSemFilter));
    }
    if (subjectSearch.trim()) {
      const q = subjectSearch.toLowerCase().trim();
      list = list.filter((s) => {
        const assignedT = teachers.find((t) => t.id === (s as any).teacher_id);
        const tsList = teacherSubjects.filter((ts) => ts.subject_id === s.id);
        const mappedTeachers = tsList
          .map((ts) => teachers.find((t) => t.id === ts.teacher_id)?.full_name || "")
          .join(" ")
          .toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (assignedT && assignedT.full_name.toLowerCase().includes(q)) ||
          mappedTeachers.includes(q)
        );
      });
    }
    return list;
  }, [allDeptSubjects, subjectSemFilter, subjectSearch, teachers, teacherSubjects, version]);

  // Subjects taught directly by this HOD
  const myTeachingSubjects = useMemo(() => {
    if (!linkedTeacher) return [];
    return subjects.filter((s) => {
      const isAssigned = teacherSubjects.some(
        (ts) => ts.teacher_id === linkedTeacher.id && ts.subject_id === s.id,
      );
      return isAssigned || (s as any).teacher_id === linkedTeacher.id;
    });
  }, [subjects, teacherSubjects, linkedTeacher, version]);

  const deptAttendance = localDb.attendance.filter((record) =>
    deptStudents.some((student) => student.id === record.student_id),
  );
  const attendanceRate =
    deptAttendance.length > 0
      ? Math.round(
          (deptAttendance.filter((record) => record.status === "present")
            .length /
            deptAttendance.length) *
            100,
        )
      : 86;

  const attendanceTrend = useMemo(() => {
    const byDate: Record<string, { present: number; total: number }> = {};
    deptAttendance.forEach((record) => {
      byDate[record.date] ||= { present: 0, total: 0 };
      byDate[record.date].total += 1;
      if (record.status === "present") byDate[record.date].present += 1;
    });
    const entries = Object.entries(byDate).sort(([first], [second]) =>
      first.localeCompare(second),
    );

    if (entries.length === 0) {
      // Provide a baseline trend if no records yet
      return [
        { date: "Mon", rate: 84 },
        { date: "Tue", rate: 88 },
        { date: "Wed", rate: 82 },
        { date: "Thu", rate: 90 },
        { date: "Fri", rate: 86 },
      ];
    }

    return entries.slice(-7).map(([date, value]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "numeric",
        day: "numeric",
      }),
      rate: Math.round((value.present / value.total) * 100),
    }));
  }, [deptAttendance]);

  const statCards = [
    {
      label: "Department",
      value: myDepartment?.code || "CSE",
      icon: Building2,
      color: "from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    },
    {
      label: "Faculty Members",
      value: String(deptTeachers.length),
      icon: Users,
      color: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20",
    },
    {
      label: "Class Coordinators",
      value: String(deptAssignments.length),
      icon: UserCog,
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Total Classes",
      value: String(deptClasses.length),
      icon: Layers,
      color: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      label: "Curriculum Subjects",
      value: String(allDeptSubjects.length),
      icon: BookOpen,
      color: "from-teal-500/20 to-teal-500/5 text-teal-600 dark:text-teal-400 border-teal-500/20",
    },
    {
      label: "Enrolled Students",
      value: String(deptStudents.length),
      icon: GraduationCap,
      color: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] via-card to-card p-6 shadow-xs">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/20 text-xs font-bold">
                HOD PORTAL · {myDepartment?.code || "ENGINEERING"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Academic Year {CURRENT_ACADEMIC_YEAR}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {myDepartment?.name || "Department Overview"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Engineering classes, faculty members, and attendance overview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link to="/attendance">
              <Button size="sm" className="gap-1.5 shadow-xs text-xs h-9">
                <ClipboardCheck className="h-4 w-4" />
                Take Attendance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={i}
              className="border border-border p-4 relative overflow-hidden shadow-xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
                <div className={`p-1.5 rounded-lg border bg-gradient-to-br ${s.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">
                {s.value}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Link
          to="/hod/classes"
          className="group block rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/50 hover:bg-muted/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-display font-bold text-sm text-foreground mt-3">
            Classes &amp; Divisions
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {deptClasses.length} active classes
          </p>
        </Link>

        <Link
          to="/hod/teachers"
          className="group block rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/50 hover:bg-muted/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Users className="h-4 w-4" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-display font-bold text-sm text-foreground mt-3">
            Department Faculty
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {deptTeachers.length} active teachers
          </p>
        </Link>

        <Link
          to="/hod/coordinators"
          className="group block rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/50 hover:bg-muted/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCog className="h-4 w-4" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-display font-bold text-sm text-foreground mt-3">
            Class Coordinators
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {deptAssignments.length} assigned CCs
          </p>
        </Link>

        <Link
          to="/subjects"
          className="group block rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/50 hover:bg-muted/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <BookOpen className="h-4 w-4" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-display font-bold text-sm text-foreground mt-3">
            Department Subjects
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {allDeptSubjects.length} subjects (CC &amp; Dept)
          </p>
        </Link>

        <Link
          to="/hod/students"
          className="group block rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/50 hover:bg-muted/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <GraduationCap className="h-4 w-4" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-display font-bold text-sm text-foreground mt-3">
            Department Students
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {deptStudents.length} enrolled students
          </p>
        </Link>
      </div>

      {/* 4-Year Engineering Academic Year Overview (Simple & Clean - No track/sem filters) */}
      <Card className="border-border p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
              Engineering Academic Years Overview
            </h2>
            <Badge className="bg-muted text-muted-foreground border-border text-[10px] font-bold">
              1st – 4th Year
            </Badge>
          </div>

          <Link
            to="/hod/classes"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Manage Classes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 4 Engineering Year Cards (FY, SY, TY, BE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {ENGINEERING_YEARS.map((engYear) => {
            const yearStudents = deptStudents.filter((s) =>
              s.year
                ? s.year === engYear.year
                : getEngineeringYearFromSemester(s.semester) === engYear.year,
            );
            const yearClasses = deptClasses.filter((c) =>
              c.year
                ? c.year === engYear.year
                : getEngineeringYearFromSemester(c.semester) === engYear.year,
            );
            const yearCoordinators = deptTeachers.filter(
              (t) =>
                (t.role === "class_coordinator" || t.is_class_coordinator) &&
                (t.assigned_year
                  ? t.assigned_year === engYear.year
                  : t.assigned_semester
                    ? getEngineeringYearFromSemester(t.assigned_semester) ===
                      engYear.year
                    : false),
            );

            return (
              <div
                key={engYear.year}
                className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-all"
              >
                {/* Year Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center h-6 px-2 rounded-md font-bold font-mono text-xs border ${
                        engYear.year === 1
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25"
                          : engYear.year === 2
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25"
                            : engYear.year === 3
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                              : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25"
                      }`}
                    >
                      {engYear.shortName}
                    </span>
                    <span className="font-display font-bold text-sm text-foreground">
                      {engYear.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-muted-foreground">
                    Sem {engYear.semesters[0]} &amp; {engYear.semesters[1]}
                  </span>
                </div>

                {/* Compact Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 bg-muted/40 rounded-lg">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Classes
                    </span>
                    <strong className="text-foreground text-sm">
                      {yearClasses.length} {yearClasses.length === 1 ? "Class" : "Divs"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Students
                    </span>
                    <strong className="text-foreground text-sm">
                      {yearStudents.length}
                    </strong>
                  </div>
                </div>

                {/* Coordinator */}
                <div className="pt-2 border-t border-border/60 text-[11px] flex items-center justify-between gap-1">
                  <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                    <UserCog className="h-3.5 w-3.5 text-muted-foreground" /> Coordinator:
                  </span>
                  {yearCoordinators.length > 0 ? (
                    <span
                      className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[130px] text-right"
                      title={yearCoordinators.map((c) => c.full_name).join(", ")}
                    >
                      {yearCoordinators[0].full_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Unassigned
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dual Role: HOD as Lecturer & Teaching Workload */}
      <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <BookOpen className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg font-bold text-foreground">
                My Lecture &amp; Teaching Workload
              </h2>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary text-[10px] font-bold"
              >
                HOD &amp; Lecturer
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Courses assigned to your faculty profile for lecture attendance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/attendance">
              <Button size="sm" className="gap-1.5 shadow-xs text-xs">
                <ClipboardCheck className="h-4 w-4" />
                Mark Lecture Attendance
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-4">
          {myTeachingSubjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myTeachingSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {sub.code}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Sem {sub.semester}
                      </Badge>
                    </div>
                    <p className="truncate text-sm font-semibold text-foreground mt-1">
                      {sub.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {sub.credits} Credits
                    </p>
                  </div>

                  <Link to="/attendance">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0 gap-1 hover:bg-primary hover:text-primary-foreground"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Mark
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-background/50 p-4 text-xs text-muted-foreground">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="font-semibold text-foreground">
                  Ready to take lectures for {myDepartment?.code || "your department"}
                </p>
              </div>
              <Link to="/attendance" className="shrink-0">
                <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  Take Attendance
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Department Subjects & Curriculum (Added by Class Coordinators & Department) */}
      <Card className="border-border p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg font-bold text-foreground">
                Department Subjects &amp; Curriculum
              </h2>
              <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 text-xs font-bold">
                {allDeptSubjects.length} Total Subjects (CC &amp; Dept)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              All subjects and curriculum courses added by Class Coordinators (CC) and Department across Engineering Semesters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/subjects">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs shadow-xs">
                <BookOpen className="h-3.5 w-3.5" />
                Manage in Curriculum Portal
              </Button>
            </Link>
            <Link to="/hod/teachers">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs shadow-xs">
                <Users className="h-3.5 w-3.5" />
                Assign Faculty
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Semester Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by code, subject name, or assigned faculty..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <Select
              value={subjectSemFilter}
              onChange={(e) => setSubjectSemFilter(e.target.value)}
              className="h-9 text-xs"
              options={[
                { value: "all", label: "All Semesters (1–8)" },
                { value: "1", label: "Semester 1 (FY Engg)" },
                { value: "2", label: "Semester 2 (FY Engg)" },
                { value: "3", label: "Semester 3 (SY Engg)" },
                { value: "4", label: "Semester 4 (SY Engg)" },
                { value: "5", label: "Semester 5 (TY Engg)" },
                { value: "6", label: "Semester 6 (TY Engg)" },
                { value: "7", label: "Semester 7 (BE Engg)" },
                { value: "8", label: "Semester 8 (BE Engg)" },
              ]}
            />
          </div>
        </div>

        {/* Subjects Grid */}
        {filteredDeptSubjects.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDeptSubjects.map((sub) => {
              const engYear = getEngineeringYearFromSemester(sub.semester);
              const semLabel = getSemesterEngineeringLabel(sub.semester);

              // Faculty assignments
              const directTeacher = teachers.find(
                (t) => t.id === (sub as any).teacher_id,
              );
              const mappedTs = teacherSubjects.filter((ts) => ts.subject_id === sub.id);
              const assignedTeachers = Array.from(
                new Set(
                  [
                    directTeacher?.full_name,
                    ...mappedTs.map((ts) => teachers.find((t) => t.id === ts.teacher_id)?.full_name),
                  ].filter(Boolean),
                ),
              );

              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/60">
                        {sub.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge
                          className={`text-[10px] font-bold ${
                            engYear === 1
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25"
                              : engYear === 2
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25"
                                : engYear === 3
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                                  : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25"
                          }`}
                        >
                          Sem {sub.semester} · {semLabel.split(" ")[0]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {sub.credits || 3} Credits
                        </span>
                      </div>
                    </div>

                    <h4 className="font-display font-semibold text-sm text-foreground leading-snug">
                      {sub.name}
                    </h4>
                  </div>

                  <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Assigned Lecturer
                      </span>
                      {assignedTeachers.length > 0 ? (
                        <span
                          className="font-medium text-foreground truncate block text-xs"
                          title={assignedTeachers.join(", ")}
                        >
                          👨‍🏫 {assignedTeachers.join(", ")}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-xs font-medium inline-flex items-center gap-1">
                          ⚠️ Unassigned
                        </span>
                      )}
                    </div>

                    <Link to="/attendance">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-2 text-primary hover:bg-primary/10"
                        title="Conduct Lecture"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                        Lecture
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-semibold text-foreground">
              {subjectSearch ? "No matching subjects found" : "No subjects added yet for this filter"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Class Coordinators can add subjects from their dashboard, or you can import curriculum directly.
            </p>
            <Link to="/subjects" className="inline-block mt-3">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                Go to Subjects &amp; Curriculum Portal
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Attendance Trend Chart */}
      <Card className="border-border p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="font-display text-base font-bold text-foreground">
              Department Attendance Trend
            </h2>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            Average: {attendanceRate}%
          </Badge>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} stroke="currentColor" opacity={0.6} />
              <YAxis domain={[0, 100]} unit="%" fontSize={11} stroke="currentColor" opacity={0.6} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Attendance"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
