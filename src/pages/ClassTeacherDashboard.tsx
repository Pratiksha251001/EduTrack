import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  ClipboardCheck,
  MessageSquare,
  FileChartColumnIncreasing,
  Users,
  BookOpen,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { localDb } from "../lib/supabase";

export const ClassTeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split("T")[0];

  const mySubjects = useMemo(() => {
    return localDb.subjects.filter(
      (s) => !user?.department_id || s.department_id === user.department_id,
    );
  }, [user]);

  const todayAttendance = useMemo(() => {
    return localDb.attendance.filter((a) => a.date === todayStr);
  }, [todayStr]);

  const [smsLogs, setSmsLogs] = React.useState<any[]>(() => localDb.getSmsLogs());

  React.useEffect(() => {
    const handleUpdate = () => setSmsLogs(localDb.getSmsLogs());
    window.addEventListener("edutrack_sms_logs_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_sms_logs_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const todaySmsLogs = useMemo(() => {
    return smsLogs.filter((l) => l.attendance_date === todayStr || (l.sent_at && l.sent_at.startsWith(todayStr)));
  }, [smsLogs, todayStr]);

  const recentSmsLogs = useMemo(() => {
    return smsLogs.slice(0, 5);
  }, [smsLogs]);

  const totalStudents = localDb.students.filter(
    (st) =>
      st.status === "active" &&
      (!user?.department_id || st.department_id === user.department_id),
  ).length;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] via-card to-card p-6 shadow-xs">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/20">
                FACULTY & CLASS TEACHER PORTAL
              </Badge>
              <span className="text-xs text-muted-foreground">
                Attendance & Parent Communication System
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.full_name || "Faculty Member"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Mark student attendance, review verified Absent & Present lists, and dispatch automated
              multilingual SMS alerts directly to parents.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-left sm:min-w-44">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Today's Date
            </p>
            <p className="mt-0.5 font-display text-base font-bold text-primary">
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Action Feature Banner */}
      <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.03] to-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Attendance Message Alert Flow
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Mark Attendance & Dispatch Verified Parent SMS Alerts
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select your subject cohort, mark attendance, and click Submit. An instant verification alert
              lets you inspect both Absent and Present lists and confirm before automated SMS messages are sent to every absent student's parent.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/attendance">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
                <Send className="mr-2 h-4 w-4" />
                Mark Subject Attendance
              </Button>
            </Link>
            <Link to="/sms-logs">
              <Button variant="outline">
                <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                SMS Logs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick KPI Stat Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Assigned Subjects
            </span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {mySubjects.length}
            </span>
            <span className="text-xs text-muted-foreground">in department</span>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Students In Scope
            </span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {totalStudents}
            </span>
            <span className="text-xs text-muted-foreground">active learners</span>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Today's Marked Records
            </span>
            <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {todayAttendance.length}
            </span>
            <span className="text-xs text-muted-foreground">entries recorded</span>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Today's Parent SMS Alerts
            </span>
            <MessageSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {todaySmsLogs.length}
            </span>
            <span className="text-xs text-muted-foreground">alerts dispatched</span>
          </div>
        </Card>
      </div>

      {/* Two Column Layout: Navigation & Recent SMS Logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Tools */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-5 border-border shadow-xs">
            <CardHeader className="p-0 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Faculty Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 space-y-2">
              <Link
                to="/attendance"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">
                      Mark Subject Attendance
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Verify Absent & Present lists before SMS
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/sms-logs"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">
                      Parent SMS Logs & History
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Track delivery receipts and multilingual alerts
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/reports"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FileChartColumnIncreasing className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">
                      Reports & Defaulter Lists
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Download session summaries & PDF sheets
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Parent SMS Activity */}
        <div className="lg:col-span-2">
          <Card className="p-5 border-border shadow-xs">
            <CardHeader className="p-0 pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Recent Parent SMS Alerts Dispatched
              </CardTitle>
              <Link to="/sms-logs" className="text-xs text-primary hover:underline font-medium">
                View all logs →
              </Link>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              {recentSmsLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No parent SMS alerts dispatched yet. Mark attendance to trigger automatic notifications.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentSmsLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">
                            {log.student_name}
                          </span>
                          <Badge
                            variant={log.status === "sent" ? "success" : "destructive"}
                            className="text-[9px] uppercase px-1.5 py-0"
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>Phone: {log.parent_mobile || "Missing"}</span>
                          <span>•</span>
                          <span>Date: {log.attendance_date}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          {log.sent_at ? new Date(log.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
