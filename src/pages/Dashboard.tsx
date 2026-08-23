import React, { useMemo } from 'react';
import {
  GraduationCap,
  ClipboardCheck,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { localDb } from '../lib/supabase';
import { college } from '../lib/college';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export const Dashboard: React.FC = () => {
  const students = localDb.students;
  const subjects = localDb.subjects;
  const attendance = localDb.attendance;
  const smsLogs = localDb.sms_logs;

  const totalStudents = students.filter(s => s.status === 'active').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter(a => a.date === todayStr);
  const todayPresent = todayRecords.filter(a => a.status === 'present').length;
  const todayPercentage = todayRecords.length > 0 ? Math.round((todayPresent / todayRecords.length) * 100) : 88;

  const studentStats = useMemo(() => {
    return students.map(st => {
      const records = attendance.filter(a => a.student_id === st.id);
      const total = records.length;
      const present = records.filter(a => a.status === 'present').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 100;
      return { ...st, total, present, pct };
    });
  }, [students, attendance]);

  const defaulters = studentStats.filter(s => s.pct < college.minAttendance);

  const trendData = useMemo(() => {
    const dates: Record<string, { total: number; present: number }> = {};
    attendance.forEach(a => {
      if (!dates[a.date]) dates[a.date] = { total: 0, present: 0 };
      dates[a.date].total += 1;
      if (a.status === 'present') dates[a.date].present += 1;
    });

    return Object.entries(dates)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        rate: Math.round((d.present / d.total) * 100),
      }));
  }, [attendance]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Academic Overview</h2>
        <p className="text-sm text-muted-foreground">
          Live statistics, attendance compliance, and parent communication metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Active Students
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-extrabold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all departments & sems</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Today's Average Attendance
            </CardTitle>
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-extrabold text-emerald-600">{todayPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">Daily institution-wide average</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Low Attendance (&lt;75%)
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-extrabold text-amber-600">{defaulters.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Students below threshold</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Parent SMS Alerts Sent
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-extrabold">{smsLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total absentee SMS delivered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Daily Attendance Trend (%)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[50, 100]} fontSize={12} unit="%" />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Attendance']} />
                <Line type="monotone" dataKey="rate" stroke="oklch(42% 0.09 158)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> Attendance Defaulters (&lt;75%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {defaulters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">All students meet attendance criteria.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {defaulters.map((st) => (
                  <div key={st.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <div>
                      <p className="text-sm font-semibold">{st.full_name}</p>
                      <p className="text-xs text-muted-foreground">Roll: {st.roll_number}</p>
                    </div>
                    <Badge variant="destructive">{st.pct}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
