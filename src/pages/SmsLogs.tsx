import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Globe,
  MessageSquare,
  Copy,
  Check,
  Send,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
  Eye,
  Shield,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { localDb } from '../lib/supabase';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  getParentWhatsAppUrl,
  cleanSmsMessage,
} from '../lib/college';
import { ParentAlertModal } from '../components/ParentAlertModal';

export const SmsLogs: React.FC = () => {
  const { user, role } = useAuth();
  const [logs, setLogs] = useState<any[]>(() => localDb.getSmsLogs());
  const [dateScope, setDateScope] = useState<'all' | 'today'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'__all' | 'sent' | 'failed'>('__all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalParentMobile, setModalParentMobile] = useState('');
  const [modalParentName, setModalParentName] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const refreshLogs = () => {
    setIsRefreshing(true);
    setLogs(localDb.getSmsLogs());
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    refreshLogs();
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

  const todayLogs = useMemo(() => {
    return scopedLogs.filter((log) => {
      const isDateToday = log.attendance_date === todayStr;
      const isSentToday = log.sent_at && log.sent_at.startsWith(todayStr);
      return isDateToday || isSentToday;
    });
  }, [scopedLogs, todayStr]);

  const deliveredCount = useMemo(() => scopedLogs.filter((l) => l.status === 'sent').length, [scopedLogs]);
  const failedCount = useMemo(() => scopedLogs.filter((l) => l.status === 'failed').length, [scopedLogs]);

  const filteredLogs = useMemo(() => {
    return scopedLogs.filter((log) => {
      if (dateScope === 'today') {
        const isDateToday = log.attendance_date === todayStr;
        const isSentToday = log.sent_at && log.sent_at.startsWith(todayStr);
        if (!isDateToday && !isSentToday) return false;
      }
      if (statusFilter !== '__all' && log.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.student_name.toLowerCase().includes(q) ||
          (log.parent_mobile && log.parent_mobile.toLowerCase().includes(q)) ||
          log.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedLogs, dateScope, search, statusFilter, todayStr]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const toggleExpandAll = () => {
    if (expandedIds.size > 0) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredLogs.map((l) => l.id)));
    }
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
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-2xl font-bold">Parent Absentee SMS Logs</h2>
            <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary">
              {role === 'admin' && 'College-Wide Audit'}
              {role === 'hod' && `Department: ${user?.department_id || 'All Classes'}`}
              {role === 'class_coordinator' && `Class Coordinator Scope (Sem ${user?.assigned_semester || 5})`}
              {role === 'teacher' && 'Assigned Classes & Subjects'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {role === 'admin' && 'Complete real-time dispatch record of parent absentee alerts across all college departments.'}
            {role === 'hod' && 'Real-time dispatch record of parent absentee alerts for all classes and students in your department.'}
            {role === 'class_coordinator' && 'Parent absentee alerts dispatched for your assigned class / semester students.'}
            {role === 'teacher' && 'Parent absentee alerts dispatched for students in your assigned subjects and classes.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshLogs();
              setToastMsg("Log history refreshed successfully");
              setTimeout(() => setToastMsg(null), 3000);
            }}
            className="text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            Refresh History
          </Button>

          <Button onClick={openNewAlertModal} size="sm" className="font-semibold text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Send Parent Alert
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

      {/* Live Dispatches Callout Banner if alerts were sent today */}
      {todayLogs.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.07] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-foreground">
                  {todayLogs.length} Parent SMS Alert{todayLogs.length > 1 ? 's' : ''} Dispatched Today
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                  Live Log Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each SMS includes English, Marathi, and Hindi messages in a single dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Button
              variant={dateScope === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateScope(dateScope === 'today' ? 'all' : 'today')}
              className="text-xs font-semibold"
            >
              {dateScope === 'today' ? 'Show All History' : `Filter Today's Alerts (${todayLogs.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Filter Metrics & Chips */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={dateScope === 'all' && statusFilter === '__all' ? 'default' : 'outline'}
            onClick={() => {
              setDateScope('all');
              setStatusFilter('__all');
            }}
            className="text-xs h-8"
          >
            All Logs ({logs.length})
          </Button>

          <Button
            size="sm"
            variant={dateScope === 'today' ? 'default' : 'outline'}
            onClick={() => {
              setDateScope('today');
            }}
            className="text-xs h-8"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
            Today's Alerts ({todayLogs.length})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === 'sent' && dateScope === 'all' ? 'default' : 'outline'}
            onClick={() => {
              setDateScope('all');
              setStatusFilter('sent');
            }}
            className="text-xs h-8"
          >
            <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
            Delivered ({deliveredCount})
          </Button>

          <Button
            size="sm"
            variant={statusFilter === 'failed' && dateScope === 'all' ? 'default' : 'outline'}
            onClick={() => {
              setDateScope('all');
              setStatusFilter('failed');
            }}
            className="text-xs h-8"
          >
            <XCircle className="h-3 w-3 mr-1 text-rose-500" />
            Failed ({failedCount})
          </Button>
        </div>

        {/* Global Expand / Minimize Toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={toggleExpandAll}
          className="text-xs h-8 text-muted-foreground hover:text-foreground"
        >
          {expandedIds.size > 0 ? (
            <>
              <Minimize2 className="h-3.5 w-3.5 mr-1" />
              Minimize All Messages
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5 mr-1" />
              Expand All Messages
            </>
          )}
        </Button>
      </div>

      <div className="surface-panel grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Search Log</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by student, mobile, or message text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Status Filter</label>
          <Select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            options={[
              { value: '__all', label: 'All Statuses (Sent & Failed)' },
              { value: 'sent', label: 'Delivered / Sent' },
              { value: 'failed', label: 'Failed (No Parent Number)' },
            ]}
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
              <TableHead className="min-w-[320px]">
                <div className="flex items-center justify-between">
                  <span>SMS Message Content</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {expandedIds.size > 0 ? 'Expanded' : 'Minimized'}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No SMS alert logs found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const cleanMsg = cleanSmsMessage(log.message || "");
                const waUrl = log.parent_mobile
                  ? getParentWhatsAppUrl(log.parent_mobile, cleanMsg)
                  : null;

                const isToday =
                  log.attendance_date === todayStr ||
                  (log.sent_at && log.sent_at.startsWith(todayStr));

                const sentTime = formatSentTime(log.attendance_date, log.sent_at);
                const isExpanded = expandedIds.has(log.id);

                return (
                  <TableRow key={log.id} className={isToday ? "bg-primary/[0.02]" : ""}>
                    <TableCell className="font-semibold text-foreground whitespace-nowrap align-top py-3">
                      <div className="flex items-center gap-2">
                        {log.student_name}
                        {isToday && (
                          <Badge className="text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-1.5 py-0">
                            NEW
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
                    </TableCell>

                    {/* Minimized Message Cell */}
                    <TableCell className="text-xs max-w-md align-top py-3">
                      {isExpanded ? (
                        <div className="space-y-1.5">
                          <div className="whitespace-pre-line text-foreground/90 bg-muted/20 p-2.5 rounded-lg border border-border/40 font-sans leading-relaxed text-xs">
                            {cleanMsg}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          >
                            <ChevronUp className="h-3 w-3" /> Minimize message
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p
                            onClick={() => toggleExpand(log.id)}
                            className="line-clamp-1 text-muted-foreground hover:text-foreground cursor-pointer font-sans text-xs bg-muted/10 px-2 py-1 rounded border border-border/30 transition-colors"
                            title="Click to view full message"
                          >
                            {cleanMsg.replace(/\s+/g, ' ')}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <ChevronDown className="h-3 w-3" /> Show full message
                          </button>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap align-top py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(log.id, cleanMsg)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Copy SMS text"
                        >
                          {copiedId === log.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Send via WhatsApp to parent"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">WhatsApp</span>
                          </a>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openViewModal(log)}
                          className="h-7 px-2 text-xs font-medium"
                          title="View complete message"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                          View
                        </Button>
                      </div>
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
    </div>
  );
};
