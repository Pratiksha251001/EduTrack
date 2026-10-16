import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  cleanSmsMessage,
  generateEmailAlertContent,
} from '../lib/college';
import { ParentAlertModal } from '../components/ParentAlertModal';
import { Msg91SetupModal } from '../components/Msg91SetupModal';
import { DefaulterDirectAlertModal } from '../components/DefaulterDirectAlertModal';
import { getSmsGatewayStatus, SmsGatewayStatus } from '../lib/smsService';

export const SmsLogs: React.FC = () => {
  const { user, role } = useAuth();
  const [logs, setLogs] = useState<any[]>(() => localDb.getSmsLogs());
  const [activeLogTab, setActiveLogTab] = useState<'daily' | 'defaulter'>('daily');
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [defaulterModalOpen, setDefaulterModalOpen] = useState(false);
  const [msg91ModalOpen, setMsg91ModalOpen] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<SmsGatewayStatus | null>(null);
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalParentMobile, setModalParentMobile] = useState('');
  const [modalParentName, setModalParentName] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const refreshLogs = () => {
    setIsRefreshing(true);
    setLogs(localDb.getSmsLogs());
    getSmsGatewayStatus().then(setGatewayStatus).catch(() => {});
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    refreshLogs();
    getSmsGatewayStatus().then(setGatewayStatus).catch(() => {});
    const handleUpdate = () => {
      refreshLogs();
    };
    window.addEventListener('edutrack_sms_logs_updated', handleUpdate);
    window.addEventListener('edutrack_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('edutrack_sms_logs_updated', handleUpdate);
      window.removeEventListener('edutrack_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Role-based scoping of SMS logs
  const scopedLogs = useMemo(() => {
    if (role === 'admin') return logs;

    const studentsMap = new Map(localDb.students.map((s) => [s.id, s]));
    const subjectsMap = new Map(localDb.subjects.map((s) => [s.id, s]));

    if (role === 'hod') {
      const deptId = user?.department_id;
      if (!deptId) return logs;
      return logs.filter((log) => {
        const student = studentsMap.get(log.student_id);
        const subject = subjectsMap.get(log.subject_id);
        return student?.department_id === deptId || subject?.department_id === deptId;
      });
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

      return logs.filter((log) => {
        const student = studentsMap.get(log.student_id);
        const subject = subjectsMap.get(log.subject_id);
        const isClassStudent =
          student && (!deptId || student.department_id === deptId) && student.semester === coordSem;
        const isClassSubject =
          subject && (!deptId || subject.department_id === deptId) && subject.semester === coordSem;
        return isClassStudent || isClassSubject;
      });
    }

    if (role === 'teacher') {
      const teacherId = user?.teacher_id || user?.id;
      const mySubjectIds = new Set(
        localDb.teacher_subjects
          .filter((ts) => ts.teacher_id === teacherId)
          .map((ts) => ts.subject_id)
      );
      localDb.subjects.forEach((s) => {
        if ((s as any).teacher_id === teacherId) {
          mySubjectIds.add(s.id);
        }
      });

      // If teacher has assigned subjects, restrict strictly to logs of those subjects/classes
      if (mySubjectIds.size > 0) {
        return logs.filter((log) => log.subject_id && mySubjectIds.has(log.subject_id));
      }
      // Fallback to department if none assigned
      if (user?.department_id) {
        return logs.filter((log) => {
          const student = studentsMap.get(log.student_id);
          const subject = subjectsMap.get(log.subject_id);
          return student?.department_id === user.department_id || subject?.department_id === user.department_id;
        });
      }
    }

    return logs;
  }, [logs, role, user]);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Daily attendance alert logs (normal attendance notifications)
  const dailyLogs = useMemo(() => {
    return scopedLogs.filter(
      (l) => !l.is_defaulter_alert && !(typeof l.attendance_rate === 'number' && l.attendance_rate < 75)
    );
  }, [scopedLogs]);

  // 2. <75% Low attendance defaulter alert logs (monthly / deficit warnings)
  const defaulterLogs = useMemo(() => {
    return scopedLogs.filter(
      (l) => l.is_defaulter_alert || (typeof l.attendance_rate === 'number' && l.attendance_rate < 75)
    );
  }, [scopedLogs]);

  // Current active students with <75% attendance with rich details
  const defaulterDetails = useMemo(() => {
    const allAttendance = localDb.attendance;
    const allStudents = localDb.students.filter((s) => s.status === 'active');
    return allStudents
      .map((st) => {
        const records = allAttendance.filter((a) => a.student_id === st.id);
        const total = records.length;
        const present = records.filter((a) => a.status === 'present').length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 65;
        return {
          student: st,
          id: st.id,
          roll_number: st.roll_number,
          student_name: st.full_name,
          rate,
          total,
          present,
          parentName: st.parent_name || 'Parent',
          parentMobile: st.parent_mobile || '',
          parentEmail:
            st.email ||
            `${st.full_name.toLowerCase().replace(/\s+/g, '.')}@engg.college.edu`,
        };
      })
      .filter((item) => item.rate < 75)
      .sort((a, b) => a.rate - b.rate);
  }, []);

  const defaulterStudents = useMemo(
    () => defaulterDetails.map((d) => d.student),
    [defaulterDetails]
  );

  // Filter based on active tab and search query only
  const filteredLogs = useMemo(() => {
    const list = activeLogTab === 'daily' ? dailyLogs : defaulterLogs;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (log) =>
        log.student_name.toLowerCase().includes(q) ||
        (log.parent_mobile && log.parent_mobile.toLowerCase().includes(q)) ||
        (log.message && log.message.toLowerCase().includes(q))
    );
  }, [activeLogTab, dailyLogs, defaulterLogs, search]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openViewModal = (log: (typeof logs)[0]) => {
    const matchedStudent = localDb.students.find(s => s.id === log.student_id || s.full_name === log.student_name);
    setModalStudentName(log.student_name);
    setModalParentMobile(log.parent_mobile || matchedStudent?.parent_mobile || '');
    setModalParentName(matchedStudent?.parent_name || 'Parent');
    setModalDate(log.attendance_date);
    setModalMessage(cleanSmsMessage(log.message || ''));
    setAlertModalOpen(true);
  };

  const openNewAlertModal = () => {
    const firstStudent = localDb.students[0];
    setModalStudentName(firstStudent?.full_name || 'Student');
    setModalParentMobile(firstStudent?.parent_mobile || '');
    setModalParentName(firstStudent?.parent_name || 'Parent');
    setModalDate(new Date().toISOString().split('T')[0]);
    setModalMessage('');
    setAlertModalOpen(true);
  };

  const formatSentTime = (dateStr?: string, timeStr?: string) => {
    if (timeStr) {
      try {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch {}
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Parent Alert &amp; Communication Logs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated SMS, Email &amp; WhatsApp logs with direct &lt;75% Defaulter Notice dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Direct <75% Defaulter Alert Modal Button */}
          <Button
            onClick={() => setDefaulterModalOpen(true)}
            size="sm"
            className="font-semibold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Send &lt;75% Defaulter Alert ({defaulterStudents.length})
          </Button>
        </div>
      </div>

      {toastMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {toastMsg}
          </span>
          <button onClick={() => setToastMsg(null)} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* 2 Main Log Sections: 1. Daily Attendance Alerts, 2. <75% Defaulter Alerts (Monthly) */}
      <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveLogTab('daily')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeLogTab === 'daily'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Daily Attendance Alerts</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeLogTab === 'daily'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {dailyLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLogTab('defaulter')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeLogTab === 'defaulter'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>&lt;75% Defaulter Alerts (Monthly)</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeLogTab === 'defaulter'
                ? 'bg-white/20 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {defaulterLogs.length}
          </span>
        </button>
      </div>

      {/* Only Search Bar */}
      <div className="surface-panel p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder={
              activeLogTab === 'daily'
                ? 'Search daily attendance alerts by student, parent mobile, or message...'
                : 'Search <75% defaulter notices by student, parent mobile, or message...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Parent Mobile</TableHead>
              <TableHead>Absence Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[300px]">
                <span>Message Content</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No {activeLogTab === 'daily' ? 'daily attendance' : '<75% defaulter'} alert logs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const cleanMsg = cleanSmsMessage(log.message || "");

                const isToday =
                  log.attendance_date === todayStr ||
                  (log.sent_at && log.sent_at.startsWith(todayStr));

                const sentTime = formatSentTime(log.attendance_date, log.sent_at);
                const isExpanded = expandedIds.has(log.id);

                const matchedStudent = localDb.students.find(
                  (s) => s.id === log.student_id || s.full_name === log.student_name
                );
                const studentRecords = localDb.attendance.filter(
                  (a) => a.student_id === (matchedStudent?.id || log.student_id)
                );
                const totalRecs = studentRecords.length;
                const presentRecs = studentRecords.filter((a) => a.status === 'present').length;
                const realRate =
                  totalRecs > 0
                    ? Math.round((presentRecs / totalRecs) * 100)
                    : (log.attendance_rate ?? 65);
                const isDefaulter = log.is_defaulter_alert || realRate < 75;

                return (
                  <TableRow key={log.id} className={isToday ? "bg-primary/[0.02]" : ""}>
                    <TableCell className="font-semibold text-foreground whitespace-nowrap align-top py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{log.student_name}</span>
                        {isDefaulter && (
                          <Badge className="text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 px-1.5 py-0">
                            &lt;75% ({realRate}%)
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs whitespace-nowrap align-top py-3">
                      {log.parent_mobile || <span className="text-rose-500 font-bold">No Number</span>}
                    </TableCell>

                    <TableCell className="text-xs whitespace-nowrap align-top py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{log.attendance_date}</span>
                        {sentTime && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {sentTime}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap align-top py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant={log.status === 'sent' ? 'success' : 'destructive'}
                          className="uppercase text-[10px]"
                        >
                          {log.status === 'sent' ? (
                            <CheckCircle className="h-3 w-3 mr-1 inline" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1 inline" />
                          )}
                          {log.status === 'sent' ? 'Delivered' : 'Failed'}
                        </Badge>
                        {log.channel && (
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            via {log.channel}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Message Cell with only Arrow Icon */}
                    <TableCell className="text-xs max-w-md align-top py-3">
                      {isExpanded ? (
                        <div className="space-y-1">
                          <div className="whitespace-pre-line text-foreground/90 bg-muted/20 p-2.5 rounded-lg border border-border/40 font-sans leading-relaxed text-xs">
                            {cleanMsg}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors inline-flex items-center"
                            title="Collapse message"
                            aria-label="Collapse message"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p
                            onClick={() => toggleExpand(log.id)}
                            className="line-clamp-1 text-muted-foreground hover:text-foreground cursor-pointer font-sans text-xs bg-muted/10 px-2.5 py-1 rounded border border-border/30 transition-colors flex-1"
                            title="Click to view full message"
                          >
                            {cleanMsg.replace(/\s+/g, ' ')}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="p-1 rounded text-primary hover:text-primary/80 hover:bg-muted/50 transition-colors shrink-0 inline-flex items-center"
                            title="Expand message"
                            aria-label="Expand message"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ParentAlertModal
        open={alertModalOpen}
        onOpenChange={setAlertModalOpen}
        studentName={modalStudentName}
        parentMobile={modalParentMobile}
        parentName={modalParentName}
        date={modalDate}
        existingMessage={modalMessage}
        onSuccess={(msg) => {
          setToastMsg(msg);
          refreshLogs();
        }}
      />

      <DefaulterDirectAlertModal
        open={defaulterModalOpen}
        onOpenChange={setDefaulterModalOpen}
        onAlertsSent={(count) => {
          refreshLogs();
          setToastMsg(
            `Sent <75% Defaulter Notice to ${count} student(s) via Email. Logged in Parent Logs.`
          );
        }}
      />

      <Msg91SetupModal
        open={msg91ModalOpen}
        onOpenChange={setMsg91ModalOpen}
        onTestSent={() => {
          refreshLogs();
          setToastMsg("Test message recorded in SMS logs!");
        }}
      />
    </div>
  );
};
