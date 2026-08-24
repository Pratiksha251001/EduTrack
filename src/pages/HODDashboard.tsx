import React, { useState, useMemo } from "react";
import {
  Building2,
  Users,
  UserCog,
  GraduationCap,
  Plus,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Save,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import {
  Teacher,
  ClassCoordinatorAssignment,
  TeacherSubject,
  Student,
  AcademicClass,
} from "../lib/types";
import { college } from "../lib/college";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  const [search, setSearch] = useState("");
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [expandedSemester, setExpandedSemester] = useState<number | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, { subjectId: string; className: string }>
  >({});
  const [, refresh] = useState(0);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    semester: "1",
    coordinator_teacher_id: "",
  });
  const [studentForm, setStudentForm] = useState({
    roll_number: "",
    full_name: "",
    semester: "1",
    parent_name: "",
    parent_mobile: "",
    email: "",
  });

  const [teacherForm, setTeacherForm] = useState({
    employee_id: "",
    full_name: "",
    email: "",
    mobile: "",
    role: "lecturer" as Teacher["role"],
  });

  const [assignForm, setAssignForm] = useState({
    teacher_id: "",
    semester: "1",
  });

  const departments = localDb.departments;
  const teachers = localDb.teachers;
  const assignments = localDb.class_coordinator_assignments;
  const teacherSubjects = localDb.teacher_subjects as TeacherSubject[];
  const students = localDb.students;
  const subjects = localDb.subjects;
  const academicClasses = localDb.academic_classes as AcademicClass[];

  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const assignedDepartmentId =
    user?.department_id || linkedTeacher?.department_id;
  const myDepartment = departments.find((d) => d.id === assignedDepartmentId);

  const deptTeachers = useMemo(() => {
    return teachers.filter((t) => t.department_id === assignedDepartmentId);
  }, [teachers, assignedDepartmentId]);

  const filteredTeachers = useMemo(() => {
    if (!search) return deptTeachers;
    const s = search.toLowerCase();
    return deptTeachers.filter(
      (t) =>
        t.full_name.toLowerCase().includes(s) ||
        t.employee_id.toLowerCase().includes(s) ||
        (t.email || "").toLowerCase().includes(s),
    );
  }, [deptTeachers, search]);

  const deptAssignments = useMemo(() => {
    return assignments.filter((a) => a.department_id === assignedDepartmentId);
  }, [assignments, assignedDepartmentId]);

  const assignmentsBySemester = useMemo(() => {
    const grouped: Record<number, ClassCoordinatorAssignment[]> = {};
    for (const a of deptAssignments) {
      if (!grouped[a.semester]) grouped[a.semester] = [];
      grouped[a.semester].push(a);
    }
    return grouped;
  }, [deptAssignments]);

  const deptStudents = useMemo(() => {
    return students.filter((s) => s.department_id === assignedDepartmentId);
  }, [students, assignedDepartmentId]);

  const deptSubjects = useMemo(
    () => subjects.filter((s) => s.department_id === assignedDepartmentId),
    [subjects, assignedDepartmentId],
  );

  const deptClasses = useMemo(
    () =>
      academicClasses.filter(
        (academicClass) => academicClass.department_id === assignedDepartmentId,
      ),
    [academicClasses, assignedDepartmentId],
  );

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
      : 0;

  const attendanceTrend = useMemo(() => {
    const byDate: Record<string, { present: number; total: number }> = {};
    deptAttendance.forEach((record) => {
      byDate[record.date] ||= { present: 0, total: 0 };
      byDate[record.date].total += 1;
      if (record.status === "present") byDate[record.date].present += 1;
    });
    return Object.entries(byDate)
      .sort(([first], [second]) => first.localeCompare(second))
      .slice(-7)
      .map(([date, value]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "numeric",
          day: "numeric",
        }),
        rate: Math.round((value.present / value.total) * 100),
      }));
  }, [deptAttendance]);

  const handleAddTeacher = () => setEditingTeacher(null);
  const handleEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setTeacherForm({
      employee_id: t.employee_id,
      full_name: t.full_name,
      email: t.email || "",
      mobile: t.mobile || "",
      role: t.role,
    });
    setTeacherDialogOpen(true);
  };

  const handleTeacherSubmit = async () => {
    if (!teacherForm.employee_id || !teacherForm.full_name) return;

    if (editingTeacher) {
      await localDb.update("teachers", editingTeacher.id, {
        ...teacherForm,
        email: teacherForm.email || null,
        mobile: teacherForm.mobile || null,
      });
    } else {
      await localDb.insert("teachers", [
        {
          ...teacherForm,
          department_id: user?.department_id,
          email: teacherForm.email || null,
          mobile: teacherForm.mobile || null,
          is_class_coordinator: false,
          role: teacherForm.role,
          status: "active",
        },
      ]);
    }

    setTeacherDialogOpen(false);
    setTeacherForm({
      employee_id: "",
      full_name: "",
      email: "",
      mobile: "",
      role: "lecturer",
    });
    setEditingTeacher(null);
    refresh((value) => value + 1);
  };

  const toggleTeacherStatus = async (teacher: Teacher) => {
    await localDb.update("teachers", teacher.id, {
      status: teacher.status === "active" ? "inactive" : "active",
    });
    refresh((value) => value + 1);
  };

  const assignSubject = async (
    teacherId: string,
    subjectId: string,
    className: string,
  ) => {
    if (!teacherId || !subjectId) return;
    const duplicate = teacherSubjects.some(
      (a) =>
        a.teacher_id === teacherId &&
        a.subject_id === subjectId &&
        a.class_name === (className || null),
    );
    if (duplicate) return;
    await localDb.insert("teacher_subjects", [
      {
        teacher_id: teacherId,
        subject_id: subjectId,
        class_name: className || null,
      },
    ]);
    refresh((value) => value + 1);
  };

  const removeSubject = async (assignment: TeacherSubject) => {
    await localDb.delete("teacher_subjects", assignment.id);
    refresh((value) => value + 1);
  };

  const saveSubjectAssignment = async (teacherId: string) => {
    const draft = assignmentDrafts[teacherId];
    if (!draft?.subjectId) return;
    await assignSubject(teacherId, draft.subjectId, draft.className);
    setAssignmentDrafts((prev) => ({
      ...prev,
      [teacherId]: { subjectId: "", className: "" },
    }));
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("Delete this teacher?")) return;
    await localDb.delete("teachers", id);
  };

  const handleAssignCC = async () => {
    if (!assignForm.teacher_id || !assignForm.semester) return;

    const teacher = teachers.find((t) => t.id === assignForm.teacher_id);
    if (!teacher) return;

    await localDb.insert("class_coordinator_assignments", [
      {
        teacher_id: assignForm.teacher_id,
        department_id: user?.department_id,
        semester: Number(assignForm.semester),
        assigned_by: user?.id,
      },
    ]);

    await localDb.update("teachers", assignForm.teacher_id, {
      is_class_coordinator: true,
      role: "class_coordinator",
      assigned_semester: Number(assignForm.semester),
    });

    setAssignDialogOpen(false);
    setAssignForm({ teacher_id: "", semester: "1" });
  };

  const handleRevokeCC = async (assignment: ClassCoordinatorAssignment) => {
    if (!confirm("Revoke class coordinator assignment?")) return;
    await localDb.delete("class_coordinator_assignments", assignment.id);

    const otherAssignments = deptAssignments.filter(
      (a) => a.teacher_id === assignment.teacher_id && a.id !== assignment.id,
    );
    if (otherAssignments.length === 0) {
      await localDb.update("teachers", assignment.teacher_id, {
        is_class_coordinator: false,
        role: "lecturer",
        assigned_semester: null,
      });
    }
  };

  const openStudentForm = () => {
    setStudentForm({
      roll_number: "",
      full_name: "",
      semester: String(myDepartment ? 1 : 1),
      parent_name: "",
      parent_mobile: "",
      email: "",
    });
    setStudentDialogOpen(true);
  };

  const handleStudentSubmit = async () => {
    if (
      !studentForm.roll_number.trim() ||
      !studentForm.full_name.trim() ||
      !studentForm.parent_mobile.trim()
    ) {
      alert("Roll number, full name, and parent mobile are required.");
      return;
    }
    if (
      students.some(
        (student) => student.roll_number === studentForm.roll_number.trim(),
      )
    ) {
      alert("A student with this roll number already exists.");
      return;
    }
    await localDb.insert("students", [
      {
        roll_number: studentForm.roll_number.trim(),
        full_name: studentForm.full_name.trim(),
        department_id: user?.department_id,
        semester: Number(studentForm.semester),
        parent_name: studentForm.parent_name || null,
        parent_mobile: studentForm.parent_mobile.trim(),
        email: studentForm.email || null,
        status: "active",
      },
    ]);
    setStudentDialogOpen(false);
    setStudentForm({
      roll_number: "",
      full_name: "",
      semester: "1",
      parent_name: "",
      parent_mobile: "",
      email: "",
    });
    refresh((value) => value + 1);
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Delete ${student.full_name}?`)) return;
    await localDb.delete("students", student.id);
    refresh((value) => value + 1);
  };

  const handleAddClass = async () => {
    const name = classForm.name.trim();
    if (!name || !assignedDepartmentId) {
      alert("Class name is required.");
      return;
    }
    if (
      deptClasses.some(
        (academicClass) =>
          academicClass.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      alert("This class already exists in your department.");
      return;
    }
    await localDb.insert("academic_classes", [
      {
        name,
        department_id: assignedDepartmentId,
        semester: Number(classForm.semester),
        coordinator_teacher_id: classForm.coordinator_teacher_id || null,
        status: "active",
      },
    ]);
    setClassDialogOpen(false);
    setClassForm({ name: "", semester: "1", coordinator_teacher_id: "" });
    refresh((value) => value + 1);
  };

  const handleDeleteClass = async (academicClass: AcademicClass) => {
    if (!confirm(`Delete ${academicClass.name}?`)) return;
    await localDb.delete("academic_classes", academicClass.id);
    refresh((value) => value + 1);
  };

  const statCards = [
    {
      label: "Department",
      value: myDepartment?.code || "—",
      sub: myDepartment?.name || "",
      icon: Building2,
      color: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
    },
    {
      label: "Total Teachers",
      value: String(deptTeachers.length),
      sub: "Faculty Members",
      icon: Users,
      color:
        "from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20",
    },
    {
      label: "Class Coordinators",
      value: String(deptAssignments.length),
      sub: "Across All Semesters",
      icon: UserCog,
      color:
        "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Total Students",
      value: String(deptStudents.length),
      sub: "Enrolled Students",
      icon: GraduationCap,
      color:
        "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    },
    {
      label: "Attendance Rate",
      value: `${attendanceRate}%`,
      sub: "Department-wide",
      icon: Check,
      color: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20",
    },
  ];

  const availableCCs = deptTeachers.filter(
    (t) =>
      !deptAssignments.some(
        (a) =>
          a.teacher_id === t.id && a.semester === Number(assignForm.semester),
      ),
  );

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-card to-card p-6 shadow-sm">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/20">
                HOD PORTAL
              </Badge>
              <span className="text-xs text-muted-foreground">
                Department workspace
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Department Overview
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Manage faculty, class coordinators, subjects, and students for{" "}
              <span className="font-semibold text-foreground">
                {myDepartment?.name || "your department"}
              </span>
              .
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 px-4 py-3 text-left sm:min-w-44">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Assigned Department
            </p>
            <p className="mt-1 font-display text-xl font-bold text-primary">
              {myDepartment?.code || "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {myDepartment?.name || "Department unavailable"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          const borderClass =
            s.color
              .split(" ")
              .find((className) => className.startsWith("border-")) ||
            "border-border";
          const gradientClasses = s.color
            .split(" ")
            .filter(
              (className) =>
                className.startsWith("from-") || className.startsWith("to-"),
            );
          return (
            <Card
              key={i}
              className={`border ${borderClass} p-5 relative overflow-hidden`}
            >
              <div
                className={`absolute top-0 right-0 h-20 w-20 rounded-bl-full bg-gradient-to-br ${gradientClasses.join(" ")} opacity-60 -mr-10 -mt-10`}
              />
              <div className="relative">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br ${gradientClasses.join(" ")} ${borderClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {s.value}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {s.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.sub}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <BookOpen className="h-4 w-4 text-primary" /> Department Attendance
            Trend
          </h2>
          <p className="text-xs text-muted-foreground">
            Last seven recorded days for{" "}
            {myDepartment?.code || "your department"}.
          </p>
        </div>
        <div className="h-72 p-4">
          {attendanceTrend.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No department attendance records yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 100]} unit="%" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Attendance"]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hidden p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-lg">
                Department Teachers
              </h2>
              <p className="text-xs text-muted-foreground">
                Add and manage faculty members
              </p>
            </div>
            <Dialog open={false} onOpenChange={setTeacherDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTeacher ? "Edit Teacher" : "Add New Teacher"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Employee ID *
                    </label>
                    <Input
                      value={teacherForm.employee_id}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          employee_id: e.target.value,
                        })
                      }
                      placeholder="EMP-201"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Full Name *
                    </label>
                    <Input
                      value={teacherForm.full_name}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          full_name: e.target.value,
                        })
                      }
                      placeholder="Prof. John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={teacherForm.email}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="j.doe@edutrack.edu"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Mobile
                    </label>
                    <Input
                      value={teacherForm.mobile}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          mobile: e.target.value,
                        })
                      }
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Role
                    </label>
                    <Select
                      value={teacherForm.role}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          role: e.target.value as Teacher["role"],
                        })
                      }
                      options={[
                        { value: "lecturer", label: "Lecturer" },
                        {
                          value: "class_coordinator",
                          label: "Class Coordinator",
                        },
                      ]}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setTeacherDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleTeacherSubmit}>
                    <Save className="h-4 w-4 mr-1.5" />
                    {editingTeacher ? "Update" : "Add Teacher"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teachers..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredTeachers.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                No teachers found. Add your first faculty member.
              </div>
            )}
            {filteredTeachers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center flex-shrink-0 border border-violet-500/20">
                    <span className="text-sm font-bold text-violet-400">
                      {t.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {t.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {t.employee_id}
                    </div>
                    {t.is_class_coordinator && (
                      <Badge
                        variant="success"
                        className="mt-1 text-[10px] px-1.5 py-0"
                      >
                        CC Sem {t.assigned_semester}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditTeacher(t)}
                    className="h-8 w-8"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTeacherStatus(t)}
                    className="h-8 text-[10px]"
                  >
                    {t.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTeacher(t.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="hidden p-5 lg:col-span-2">
          <div className="mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Subject Assignments
            </h2>
            <p className="text-xs text-muted-foreground">
              Assign multiple subjects and classes to each teacher.
            </p>
          </div>
          <div className="space-y-3">
            {deptTeachers.map((teacher) => {
              const assigned = teacherSubjects.filter(
                (a) =>
                  a.teacher_id === teacher.id &&
                  deptSubjects.some((s) => s.id === a.subject_id),
              );
              return (
                <div
                  key={teacher.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">
                      {teacher.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {assigned.length} subject
                      {assigned.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assigned.map((a) => {
                      const subject = deptSubjects.find(
                        (s) => s.id === a.subject_id,
                      );
                      return (
                        <Badge key={a.id} variant="outline" className="gap-1">
                          {subject?.code} · {a.class_name || "Class"}{" "}
                          <button
                            onClick={() => removeSubject(a)}
                            aria-label="Remove assignment"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={assignmentDrafts[teacher.id]?.subjectId || ""}
                      options={[
                        { value: "", label: "Select subject..." },
                        ...deptSubjects.map((s) => ({
                          value: s.id,
                          label: `${s.code} · ${s.name}`,
                        })),
                      ]}
                      onChange={(e) =>
                        setAssignmentDrafts((prev) => ({
                          ...prev,
                          [teacher.id]: {
                            ...(prev[teacher.id] || { className: "" }),
                            subjectId: e.target.value,
                          },
                        }))
                      }
                    />
                    <Input
                      placeholder="Class (e.g. CSE-A)"
                      value={assignmentDrafts[teacher.id]?.className || ""}
                      onChange={(e) =>
                        setAssignmentDrafts((prev) => ({
                          ...prev,
                          [teacher.id]: {
                            ...(prev[teacher.id] || { subjectId: "" }),
                            className: e.target.value,
                          },
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() => saveSubjectAssignment(teacher.id)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Assign
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="hidden p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-lg">
                Class Coordinators
              </h2>
              <p className="text-xs text-muted-foreground">
                Assign teachers as CC per semester
              </p>
            </div>
            <Dialog open={false} onOpenChange={setAssignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Class Coordinator</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Semester
                    </label>
                    <Select
                      value={assignForm.semester}
                      onValueChange={(v) =>
                        setAssignForm({ ...assignForm, semester: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {college.semesters.map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            Semester {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Teacher
                    </label>
                    <Select
                      value={assignForm.teacher_id}
                      onValueChange={(v) =>
                        setAssignForm({ ...assignForm, teacher_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCCs.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.full_name} ({t.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setAssignDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignCC}>
                    <Check className="h-4 w-4 mr-1.5" /> Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {Object.keys(assignmentsBySemester).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                No class coordinator assignments yet.
              </div>
            )}
            {college.semesters.map((sem) => {
              const semAssignments = assignmentsBySemester[sem];
              if (!semAssignments) return null;
              const isExpanded = expandedSemester === sem;
              return (
                <div
                  key={sem}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setExpandedSemester(isExpanded ? null : sem)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="default"
                        className="bg-primary/15 text-primary border-primary/20"
                      >
                        Sem {sem}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {semAssignments.length} Coordinator
                        {semAssignments.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-2 space-y-1.5">
                      {semAssignments.map((a) => {
                        const teacher = teachers.find(
                          (t) => t.id === a.teacher_id,
                        );
                        return (
                          <div
                            key={a.id}
                            className="flex items-center justify-between p-2.5 rounded-md bg-card border border-border"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                <UserCog className="h-3.5 w-3.5 text-emerald-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-xs truncate">
                                  {teacher?.full_name || "Unknown"}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono truncate">
                                  {teacher?.employee_id}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRevokeCC(a)}
                              className="h-7 w-7 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="hidden p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Building2 className="h-4 w-4 text-primary" /> Department Classes
            </h2>
            <p className="text-xs text-muted-foreground">
              Create classes and assign a class coordinator for your department.
            </p>
          </div>
          <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() =>
                  setClassForm({
                    name: "",
                    semester: "1",
                    coordinator_teacher_id: "",
                  })
                }
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Department Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Class name (e.g. CSE-A)"
                  value={classForm.name}
                  onChange={(event) =>
                    setClassForm({ ...classForm, name: event.target.value })
                  }
                />
                <Select
                  value={classForm.semester}
                  onChange={(event) =>
                    setClassForm({ ...classForm, semester: event.target.value })
                  }
                  options={college.semesters.map((semester) => ({
                    value: String(semester),
                    label: `Semester ${semester}`,
                  }))}
                />
                <Select
                  value={classForm.coordinator_teacher_id}
                  onChange={(event) =>
                    setClassForm({
                      ...classForm,
                      coordinator_teacher_id: event.target.value,
                    })
                  }
                  options={[
                    { value: "", label: "No coordinator yet" },
                    ...deptTeachers
                      .filter(
                        (teacher) =>
                          teacher.role === "class_coordinator" &&
                          teacher.status === "active",
                      )
                      .map((teacher) => ({
                        value: teacher.id,
                        label: teacher.full_name,
                      })),
                  ]}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setClassDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddClass}>
                  <Save className="mr-1.5 h-4 w-4" /> Create Class
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {deptClasses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No classes created for this department.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deptClasses.map((academicClass) => {
              const coordinator = deptTeachers.find(
                (teacher) =>
                  teacher.id === academicClass.coordinator_teacher_id,
              );
              return (
                <div
                  key={academicClass.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <p className="font-display font-bold">
                      {academicClass.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Semester {academicClass.semester}
                    </p>
                    <p className="mt-1 text-xs text-primary">
                      {coordinator?.full_name || "Coordinator unassigned"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClass(academicClass)}
                    className="h-8 w-8 text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="hidden p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Department
              Students
            </h2>
            <p className="text-xs text-muted-foreground">
              View and add students belonging only to{" "}
              {myDepartment?.code || "your department"}.
            </p>
          </div>
          <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openStudentForm}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Department Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Roll Number *"
                  value={studentForm.roll_number}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      roll_number: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Full Name *"
                  value={studentForm.full_name}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      full_name: e.target.value,
                    })
                  }
                />
                <Select
                  value={studentForm.semester}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, semester: e.target.value })
                  }
                  options={college.semesters.map((semester) => ({
                    value: String(semester),
                    label: `Semester ${semester}`,
                  }))}
                />
                <Input
                  placeholder="Parent / Guardian Name"
                  value={studentForm.parent_name}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      parent_name: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Parent Mobile *"
                  value={studentForm.parent_mobile}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      parent_mobile: e.target.value,
                    })
                  }
                />
                <Input
                  type="email"
                  placeholder="Student Email"
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, email: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setStudentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleStudentSubmit}>
                  <Save className="h-4 w-4 mr-1.5" /> Add Student
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {deptStudents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground md:col-span-2">
              No students in this department.
            </div>
          ) : (
            deptStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {student.roll_number} · Semester {student.semester}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteStudent(student)}
                  className="h-8 w-8 text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
