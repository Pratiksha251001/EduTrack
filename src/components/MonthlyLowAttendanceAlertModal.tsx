import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  CheckCircle2,
  Users,
  Calendar,
  MessageSquare,
  ShieldAlert,
  Loader2,
  ExternalLink,
  X,
  Clock,
  RotateCcw,
  Pause,
  Play,
  FileText,
  Search,
  Check,
  Copy,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import {
  college,
  getMonthlyLowAttendanceMessage,
  cleanSmsMessage,
  getParentWhatsAppUrl,
} from "../lib/college";
import { localDb } from "../lib/supabase";
import { SmsLanguage, Student, Subject, SmsLog } from "../lib/types";

export interface MonthlyDefaulterStudent {
  student: Student;
  roll: string;
  reg: string;
  name: string;
  className: string;
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  percentage: number;
  shortfall: number;
  parentName: string;
  parentMobile: string;
  hasValidMobile: boolean;
  previouslyAlerted: boolean;
  lastAlertDate?: string;
}

interface MonthlyLowAttendanceAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredStudents?: Student[];
  filteredSubjects?: Subject[];
  initialMonth?: number; // 0 to 11
  initialYear?: number;
  roleScopeLabel?: string;
  onAlertsSent?: (count: number) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PRESET_NOTES = [
  "Please meet Class Teacher on Friday.",
  "Submit explanation letter or medical slip.",
  "Attend mandatory Saturday remedial class.",
];

export const MonthlyLowAttendanceAlertModal: React.FC<
  MonthlyLowAttendanceAlertModalProps
> = ({
  open,
  onOpenChange,
  filteredStudents,
  filteredSubjects,
  initialMonth,
  initialYear,
  onAlertsSent,
}) => {
  const currentDate = new Date();
  const currentMonthIdx =
    initialMonth !== undefined ? initialMonth : currentDate.getMonth();
  const currentYearVal =
    initialYear !== undefined ? initialYear : currentDate.getFullYear();

  // Fixed English + Marathi format with common student name
  const selectedLang: SmsLanguage = "bilingual_mr";

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearVal);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "alerted">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  );
  const [isSending, setIsSending] = useState(false);
  const [customRemark, setCustomRemark] = useState<string>("");
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Sent Success state & auto-close timer
  const [sentSuccessDetails, setSentSuccessDetails] = useState<{
    count: number;
    monthLabel: string;
    targets: Array<{
      id: string;
      name: string;
      roll: string;
      parentMobile: string;
      parentName: string;
      percentage: number;
      attended: number;
      total: number;
      className: string;
      waUrl: string;
    }>;
  } | null>(null);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState<number>(6);
  const [isAutoClosePaused, setIsAutoClosePaused] = useState<boolean>(false);

  const handleCloseModal = () => {
    setSentSuccessDetails(null);
    setIsAutoClosePaused(false);
    setAutoCloseSeconds(6);
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      setSentSuccessDetails(null);
      setIsSending(false);
      setCustomRemark("");
      setSearchQuery("");
      setStatusFilter("all");
      setAutoCloseSeconds(6);
      setIsAutoClosePaused(false);
    }
  }, [open]);

  useEffect(() => {
    if (!sentSuccessDetails || isAutoClosePaused) return;

    if (autoCloseSeconds <= 0) {
      handleCloseModal();
      return;
    }

    const timer = setInterval(() => {
      setAutoCloseSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCloseModal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sentSuccessDetails, autoCloseSeconds, isAutoClosePaused]);

  // Determine Month Date Range
  const monthDateRange = useMemo(() => {
    const yr = selectedYear;
    const m = selectedMonth;
    const startStr = `${yr}-${String(m + 1).padStart(2, "0")}-01`;
    const nextMonth = new Date(yr, m + 1, 0);
    const endStr = `${yr}-${String(m + 1).padStart(2, "0")}-${String(
      nextMonth.getDate()
    ).padStart(2, "0")}`;

    const monthLabel = `${MONTH_NAMES[m]} ${yr}`;
    return { startStr, endStr, monthLabel };
  }, [selectedYear, selectedMonth]);

  const studentsPool = useMemo(() => {
    return filteredStudents || localDb.students;
  }, [filteredStudents]);

  const subjectsPool = useMemo(() => {
    return filteredSubjects || localDb.subjects;
  }, [filteredSubjects]);

  const attendanceRecords = localDb.attendance;
  const smsLogs = localDb.sms_logs;

  // Evaluate Low Attendance Students (< 75%)
  const defaulterList: MonthlyDefaulterStudent[] = useMemo(() => {
    const list: MonthlyDefaulterStudent[] = [];
    const minAttendance = college.minAttendance || 75;
    const subjectIds = new Set(subjectsPool.map((s) => s.id));

    studentsPool.forEach((st) => {
      const monthRecords = attendanceRecords.filter((a) => {
        if (a.student_id !== st.id) return false;
        if (!subjectIds.has(a.subject_id)) return false;
        return (
          a.date >= monthDateRange.startStr && a.date <= monthDateRange.endStr
        );
      });

      if (monthRecords.length > 0) {
        const totalSessions = monthRecords.length;
        const attendedSessions = monthRecords.filter(
          (a) => a.status === "present"
        ).length;
        const absentSessions = totalSessions - attendedSessions;
        const percentage = Math.round((attendedSessions / totalSessions) * 100);

        if (percentage < minAttendance) {
          const shortfall = Math.max(
            1,
            Math.ceil((minAttendance / 100) * totalSessions) - attendedSessions
          );

          const monthTag = monthDateRange.monthLabel;
          const alreadySent = smsLogs.some(
            (log) =>
              (log.student_id === st.id ||
                log.student_name.toLowerCase() === st.full_name.toLowerCase()) &&
              log.message.includes(monthTag) &&
              log.status === "sent"
          );

          const lastSentLog = smsLogs
            .filter(
              (log) =>
                (log.student_id === st.id ||
                  log.student_name.toLowerCase() === st.full_name.toLowerCase()) &&
                log.message.includes(monthTag)
            )
            .sort(
              (a, b) =>
                new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
            )[0];

          const pMobile = (st.parent_mobile || "").trim();
          const cleanMobile = pMobile.replace(/\D/g, "");
          const hasValidMobile =
            cleanMobile.length === 10 ||
            (cleanMobile.length === 12 && cleanMobile.startsWith("91"));

          list.push({
            student: st,
            roll: st.roll_number || st.admission_number || "—",
            reg: st.register_number || "",
            name: st.full_name,
            className: st.class_name || "Class",
            totalSessions,
            attendedSessions,
            absentSessions,
            percentage,
            shortfall,
            parentName: st.parent_name || "Parent",
            parentMobile: st.parent_mobile || "",
            hasValidMobile,
            previouslyAlerted: alreadySent,
            lastAlertDate: lastSentLog?.sent_at
              ? new Date(lastSentLog.sent_at).toLocaleDateString()
              : undefined,
          });
        }
      }
    });

    return list.sort((a, b) => a.percentage - b.percentage);
  }, [
    studentsPool,
    subjectsPool,
    attendanceRecords,
    smsLogs,
    monthDateRange,
    college.minAttendance,
  ]);

  // Filter list by search query & status
  const visibleDefaulters = useMemo(() => {
    let result = defaulterList;

    if (statusFilter === "pending") {
      result = result.filter((d) => !d.previouslyAlerted);
    } else if (statusFilter === "alerted") {
      result = result.filter((d) => d.previouslyAlerted);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.roll.toLowerCase().includes(q) ||
          d.parentName.toLowerCase().includes(q) ||
          d.parentMobile.includes(q)
      );
    }

    return result;
  }, [defaulterList, searchQuery, statusFilter]);

  // Auto-select pending students with valid mobile numbers
  useEffect(() => {
    if (defaulterList.length > 0) {
      const validPendingIds = new Set<string>();
      defaulterList.forEach((d) => {
        if (d.hasValidMobile && !d.previouslyAlerted) {
          validPendingIds.add(d.student.id);
        }
      });
      if (validPendingIds.size === 0) {
        defaulterList.forEach((d) => {
          if (d.hasValidMobile) validPendingIds.add(d.student.id);
        });
      }
      setSelectedStudentIds(validPendingIds);
      setPreviewStudentId(defaulterList[0].student.id);
    } else {
      setSelectedStudentIds(new Set());
      setPreviewStudentId(null);
    }
  }, [defaulterList]);

  // Toggle selection
  const handleToggleSelect = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const selectable = visibleDefaulters.filter((d) => d.hasValidMobile);
    const allSelected = selectable.every((d) =>
      selectedStudentIds.has(d.student.id)
    );

    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectable.forEach((d) => next.delete(d.student.id));
      } else {
        selectable.forEach((d) => next.add(d.student.id));
      }
      return next;
    });
  };

  const previewStudent = useMemo(() => {
    if (!previewStudentId && defaulterList.length > 0) {
      return defaulterList[0];
    }
    return defaulterList.find((d) => d.student.id === previewStudentId);
  }, [previewStudentId, defaulterList]);

  const previewMessage = useMemo(() => {
    if (!previewStudent) return "";
    let msg = getMonthlyLowAttendanceMessage({
      studentName: previewStudent.name,
      rollNumber: previewStudent.roll,
      monthName: monthDateRange.monthLabel,
      percentage: previewStudent.percentage,
      totalSessions: previewStudent.totalSessions,
      attendedSessions: previewStudent.attendedSessions,
      minAttendance: college.minAttendance || 75,
      lang: selectedLang,
    });

    if (customRemark.trim()) {
      msg += `\n\nNote: ${customRemark.trim()}`;
    }

    return cleanSmsMessage(msg);
  }, [previewStudent, monthDateRange, selectedLang, customRemark, college.minAttendance]);

  const handleCopyPreview = () => {
    if (!previewMessage) return;
    navigator.clipboard.writeText(previewMessage);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  // Dispatch Handler
  const handleSendMonthlyAlerts = async () => {
    if (selectedStudentIds.size === 0) {
      alert("Please select at least one student with a registered mobile.");
      return;
    }

    const targets = defaulterList.filter(
      (d) => selectedStudentIds.has(d.student.id) && d.hasValidMobile
    );

    if (targets.length === 0) {
      alert("None of the selected students have a valid registered parent mobile.");
      return;
    }

    setIsSending(true);

    try {
      await new Promise((r) => setTimeout(r, 550));
      const timestamp = new Date().toISOString();
      const logsToInsert: SmsLog[] = [];

      targets.forEach((t) => {
        let msg = getMonthlyLowAttendanceMessage({
          studentName: t.name,
          rollNumber: t.roll,
          monthName: monthDateRange.monthLabel,
          percentage: t.percentage,
          totalSessions: t.totalSessions,
          attendedSessions: t.attendedSessions,
          minAttendance: college.minAttendance || 75,
          lang: selectedLang,
        });

        if (customRemark.trim()) {
          msg += `\n\nNote: ${customRemark.trim()}`;
        }

        logsToInsert.push({
          id: `sms-monthly-${Date.now()}-${t.student.id}-${Math.random()
            .toString(36)
            .substring(2, 6)}`,
          student_id: t.student.id,
          student_name: t.name,
          parent_mobile: t.parentMobile,
          message: cleanSmsMessage(msg),
          status: "sent",
          attendance_date: monthDateRange.monthLabel,
          sent_at: timestamp,
          language: selectedLang,
          created_at: timestamp,
        });
      });

      await localDb.insert("sms_logs", logsToInsert);

      window.dispatchEvent(
        new CustomEvent("edutrack_sms_logs_updated", { detail: logsToInsert })
      );

      const sentTargets = targets.map((t) => {
        let msg = getMonthlyLowAttendanceMessage({
          studentName: t.name,
          rollNumber: t.roll,
          monthName: monthDateRange.monthLabel,
          percentage: t.percentage,
          totalSessions: t.totalSessions,
          attendedSessions: t.attendedSessions,
          minAttendance: college.minAttendance || 75,
          lang: selectedLang,
        });
        if (customRemark.trim()) {
          msg += `\n\nNote: ${customRemark.trim()}`;
        }
        return {
          id: t.student.id,
          name: t.name,
          roll: t.roll,
          parentMobile: t.parentMobile,
          parentName: t.parentName,
          percentage: t.percentage,
          attended: t.attendedSessions,
          total: t.totalSessions,
          className: t.className,
          waUrl: getParentWhatsAppUrl(t.parentMobile, cleanSmsMessage(msg)),
        };
      });

      setSentSuccessDetails({
        count: targets.length,
        monthLabel: monthDateRange.monthLabel,
        targets: sentTargets,
      });
      setAutoCloseSeconds(6);
      setIsAutoClosePaused(false);

      if (onAlertsSent) {
        onAlertsSent(targets.length);
      }
    } catch (err: any) {
      console.error("Failed to send monthly alerts:", err);
      alert("Failed to record SMS logs: " + (err?.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Short, Clean Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border bg-card/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  sentSuccessDetails
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {sentSuccessDetails ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground leading-none">
                  {sentSuccessDetails ? "Alerts Sent" : "Low Attendance Alerts"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1 leading-none">
                  {sentSuccessDetails
                    ? `${sentSuccessDetails.count} messages logged for ${sentSuccessDetails.monthLabel}`
                    : `Students under ${college.minAttendance}% in ${monthDateRange.monthLabel}`}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseModal}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              title="Close"
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>
        </DialogHeader>

        {sentSuccessDetails ? (
          /* ================= SENT SUCCESS VIEW ================= */
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                  {sentSuccessDetails.count} Alerts Dispatched Successfully!
                </h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  Logged in SMS Registry for {sentSuccessDetails.monthLabel}.
                </p>
              </div>
            </div>

            {/* Auto-Close Countdown Bar */}
            <div className="rounded-xl border border-border bg-card p-2.5 px-3 flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {isAutoClosePaused ? (
                    <strong className="text-amber-600 dark:text-amber-400">
                      Auto-close paused.
                    </strong>
                  ) : (
                    <>
                      Closing in{" "}
                      <strong className="text-primary font-mono font-bold">
                        {autoCloseSeconds}s
                      </strong>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAutoClosePaused((prev) => !prev)}
                  className="h-6 px-2 text-[11px]"
                >
                  {isAutoClosePaused ? (
                    <>
                      <Play className="h-3 w-3 mr-1" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3 mr-1" /> Pause
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={handleCloseModal}
                  className="h-6 px-2.5 text-[11px] font-semibold bg-primary text-primary-foreground"
                >
                  Close Now
                </Button>
              </div>
            </div>

            {/* Dispatched Recipient List */}
            <div className="rounded-xl border border-border overflow-hidden bg-card divide-y divide-border max-h-64 overflow-y-auto">
              {sentSuccessDetails.targets.map((target) => (
                <div
                  key={target.id}
                  className="p-2.5 px-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        {target.roll}
                      </span>
                      <span className="font-medium text-foreground truncate">
                        {target.name}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        ({target.className})
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Attended: {target.attended}/{target.total} · Parent: {target.parentName} ({target.parentMobile})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="destructive"
                      className="text-[11px] font-bold px-1.5 py-0.5 bg-rose-600 text-white"
                    >
                      {target.percentage}%
                    </Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px]">
                      Sent
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ================= EVALUATION VIEW ================= */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Compact Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2">
                <Select
                  value={String(selectedMonth)}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  options={MONTH_NAMES.map((name, idx) => ({
                    value: String(idx),
                    label: name,
                  }))}
                  className="h-8 text-xs w-32"
                />
                <Select
                  value={String(selectedYear)}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  options={[
                    { value: "2026", label: "2026" },
                    { value: "2025", label: "2025" },
                    { value: "2024", label: "2024" },
                  ]}
                  className="h-8 text-xs w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className={`text-[11px] h-8 px-2 ${
                    selectedMonth === currentDate.getMonth() &&
                    selectedYear === currentDate.getFullYear()
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedMonth(currentDate.getMonth());
                    setSelectedYear(currentDate.getFullYear());
                  }}
                >
                  This Month
                </Button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 min-w-44 max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or roll..."
                  className="pl-8 pr-7 text-xs h-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {defaulterList.length} Defaulter(s)
                </span>
                <span className="text-muted-foreground text-[11px]">
                  (&lt; {college.minAttendance}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/40 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-2 py-0.5 rounded ${
                      statusFilter === "all"
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    All ({defaulterList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("pending")}
                    className={`px-2 py-0.5 rounded ${
                      statusFilter === "pending"
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    Pending
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSelectAll}
                  className="text-[11px] h-6 px-2"
                >
                  {visibleDefaulters
                    .filter((d) => d.hasValidMobile)
                    .every((d) => selectedStudentIds.has(d.student.id))
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
            </div>

            {/* Defaulter Roster */}
            {visibleDefaulters.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-1.5 bg-muted/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                <p className="font-semibold text-foreground text-xs">
                  {defaulterList.length === 0
                    ? `No low attendance defaulters in ${monthDateRange.monthLabel}.`
                    : "No matching students found."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card divide-y divide-border max-h-56 overflow-y-auto">
                {visibleDefaulters.map((d) => {
                  const isSelected = selectedStudentIds.has(d.student.id);
                  const isPreviewed = previewStudentId === d.student.id;
                  const waUrl = getParentWhatsAppUrl(
                    d.parentMobile,
                    previewMessage
                  );

                  return (
                    <div
                      key={d.student.id}
                      className={`p-2.5 px-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                        isSelected
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/30"
                      } ${isPreviewed ? "border-l-2 border-l-primary" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          disabled={!d.hasValidMobile}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(d.student.id)}
                          className="h-3.5 w-3.5 rounded border-border text-primary cursor-pointer disabled:opacity-40"
                        />

                        <div
                          className="min-w-0 cursor-pointer flex-1"
                          onClick={() => {
                            setPreviewStudentId(d.student.id);
                            if (d.hasValidMobile) handleToggleSelect(d.student.id);
                          }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-foreground">
                              {d.roll}
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {d.name}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {d.className}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span>
                              {d.attendedSessions}/{d.totalSessions} sessions
                            </span>
                            <span>•</span>
                            <span>
                              Parent: {d.parentMobile || "No Phone"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="destructive"
                          className="text-[11px] font-bold px-1.5 py-0.5 bg-rose-600 text-white"
                        >
                          {d.percentage}%
                        </Badge>

                        {d.previouslyAlerted ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          >
                            Sent
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          >
                            Pending
                          </Badge>
                        )}

                        {d.hasValidMobile && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md border border-border hover:bg-emerald-500/10 text-emerald-600"
                            title="WhatsApp"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Message Preview & Quick Note */}
            {defaulterList.length > 0 && previewStudent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Preview Box */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      Message Preview ({previewStudent.name})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPreview}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      {copiedPreview ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500 mr-1" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] whitespace-pre-line leading-relaxed text-foreground max-h-32 overflow-y-auto">
                    {previewMessage}
                  </div>
                </div>

                {/* Quick Note Input */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Additional Note (Optional):
                    </span>
                    {customRemark && (
                      <button
                        type="button"
                        onClick={() => setCustomRemark("")}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <Textarea
                    value={customRemark}
                    onChange={(e) => setCustomRemark(e.target.value)}
                    placeholder="e.g. Please meet Class Coordinator on Friday."
                    className="text-xs h-14 resize-none"
                  />

                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1">
                    {PRESET_NOTES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomRemark(preset)}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground text-left"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact Footer */}
        {sentSuccessDetails ? (
          <DialogFooter className="p-3.5 border-t border-border bg-card flex items-center justify-between gap-2">
            <Link to="/sms-logs" onClick={handleCloseModal}>
              <Button variant="outline" size="sm" className="text-xs h-8">
                <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                View SMS Logs
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSentSuccessDetails(null)}
                className="text-xs h-8"
              >
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Send Another
              </Button>

              <Button
                size="sm"
                onClick={handleCloseModal}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-8"
              >
                Done ({autoCloseSeconds}s)
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter className="p-3.5 border-t border-border bg-card flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              <strong>{selectedStudentIds.size}</strong> selected
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseModal}
                className="text-xs h-8"
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSendMonthlyAlerts}
                disabled={isSending || selectedStudentIds.size === 0}
                className="text-xs font-semibold h-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send Alert to {selectedStudentIds.size} Parent(s)
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
