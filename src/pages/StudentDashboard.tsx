import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  GraduationCap,
  Megaphone,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { college } from "../lib/college";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const student = localDb.students.find((item) => item.id === user?.student_id);
  const department = localDb.departments.find(
    (item) => item.id === student?.department_id,
  );
  const attendance = localDb.attendance.filter(
    (item) => item.student_id === student?.id,
  );
  const subjects = localDb.subjects.filter((item) =>
    attendance.some((record) => record.subject_id === item.id),
  );
  const notices = localDb.notices.filter(
    (notice) =>
      notice.status === "published" &&
      (notice.audience === "all" || notice.audience === "students"),
  );

  const attendancePercentage =
    attendance.length > 0
      ? Math.round(
          (attendance.filter((item) => item.status === "present").length /
            attendance.length) *
            100,
        )
      : 0;
  const recentAttendance = useMemo(
    () =>
      [...attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [attendance],
  );
  const initials =
    student?.full_name
      .split(" ")
      .map((name) => name[0])
      .slice(0, 2)
      .join("") || "ST";

  if (!student) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Student profile is not available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Student Portal
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
          Welcome, {student.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your attendance and academic information at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Overall Attendance
            </p>
            <div className="text-3xl font-display font-extrabold">
              {attendancePercentage}%
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-5">
            <GraduationCap className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Present
            </p>
            <div className="text-3xl font-display font-extrabold text-emerald-600">
              {attendance.filter((item) => item.status === "present").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="pt-5">
            <CalendarCheck className="h-5 w-5 text-rose-500" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Absent
            </p>
            <div className="text-3xl font-display font-extrabold text-rose-600">
              {attendance.filter((item) => item.status === "absent").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5">
            <UserRound className="h-5 w-5 text-amber-600" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Class
            </p>
            <div className="text-xl font-display font-extrabold">
              Semester {student.semester}
            </div>
            <p className="text-xs text-muted-foreground">
              {department?.code || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4 text-primary" /> Recent
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No attendance records yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentAttendance.map((record) => {
                  const subject = localDb.subjects.find(
                    (item) => item.id === record.subject_id,
                  );
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {subject?.name || "Subject"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.date}
                        </p>
                      </div>
                      <Badge
                        variant={
                          record.status === "present"
                            ? "success"
                            : "destructive"
                        }
                      >
                        {record.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Link
          to="/profile"
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4 text-primary" /> Profile Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.roll_number}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium text-right">
                    {department?.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-right">
                    {student.email || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Parent</span>
                  <span className="font-medium text-right">
                    {student.parent_name || "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary" /> Important Notices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No important notices right now.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-lg border border-border p-4"
                >
                  <p className="font-semibold">{notice.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notice.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{college.name}</p>
    </div>
  );
};
