import React, { useState, useMemo } from "react";
import {
  Check,
  X,
  Send,
  AlertCircle,
  Save,
  Loader2,
  Globe,
  Copy,
  MessageSquare,
} from "lucide-react";
import { localDb } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  college,
  generateSmsMessage,
  SMS_LANGUAGES,
  getParentWhatsAppUrl,
} from "../lib/college";
import { SmsLanguage } from "../lib/types";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

export const Attendance: React.FC = () => {
  const { user, role } = useAuth();
  const subjects = localDb.subjects.filter(
    (subject) =>
      role !== "hod" || subject.department_id === user?.department_id,
  );
  const students = localDb.students;

  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || "",
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [smsLanguage, setSmsLanguage] = useState<SmsLanguage>("trilingual");
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [attendanceState, setAttendanceState] = useState<
    Record<string, "present" | "absent">
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const eligibleStudents = useMemo(() => {
    if (!selectedSubject) return [];
    return students.filter(
      (st) =>
        st.status === "active" &&
        st.semester === selectedSubject.semester &&
        (!selectedSubject.department_id ||
          st.department_id === selectedSubject.department_id) &&
        (searchQuery.trim() === "" ||
          st.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          st.roll_number.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [students, selectedSubject, searchQuery]);

  React.useEffect(() => {
    const existing = localDb.attendance.filter(
      (a) => a.subject_id === selectedSubjectId && a.date === selectedDate,
    );
    const map: Record<string, "present" | "absent"> = {};
    eligibleStudents.forEach((st) => {
      const rec = existing.find((r) => r.student_id === st.id);
      map[st.id] = rec ? rec.status : "present";
    });
    setAttendanceState(map);
  }, [selectedSubjectId, selectedDate, eligibleStudents]);

  const markAll = (status: "present" | "absent") => {
    const next: Record<string, "present" | "absent"> = {};
    eligibleStudents.forEach((st) => (next[st.id] = status));
    setAttendanceState(next);
  };

  const toggleStudent = (id: string, status: "present" | "absent") => {
    setAttendanceState((prev) => ({ ...prev, [id]: status }));
  };

  const absentees = eligibleStudents.filter(
    (st) => (attendanceState[st.id] || "present") === "absent",
  );

  const handleSaveAndSendAlerts = async () => {
    if (!selectedSubject) return;
    setSaving(true);

    const records = eligibleStudents.map((st) => ({
      student_id: st.id,
      subject_id: selectedSubject.id,
      date: selectedDate,
      status: attendanceState[st.id] || "present",
      marked_by: user?.id || null,
    }));

    await localDb.upsertAttendance(records);

    if (absentees.length > 0) {
      const smsEntries = absentees.map((st) => ({
        student_id: st.id,
        subject_id: selectedSubject.id,
        student_name: st.full_name,
        parent_mobile: st.parent_mobile,
        message: generateSmsMessage(
          st.full_name,
          selectedDate,
          selectedSubject.name,
          smsLanguage,
        ),
        status: (st.parent_mobile ? "sent" : "failed") as "sent" | "failed",
        attendance_date: selectedDate,
        sent_at: new Date().toISOString(),
        language: smsLanguage,
      }));
      await localDb.insert("sms_logs", smsEntries);
    }

    const currentLang = SMS_LANGUAGES.find((l) => l.id === smsLanguage);
    setSaving(false);
    setConfirmOpen(false);
    setSuccessMsg(
      `Attendance saved! ${absentees.length} Parent SMS alert(s) dispatched in ${currentLang?.label || smsLanguage}.`,
    );
    setTimeout(() => setSuccessMsg(""), 6000);
  };

  const sampleAbsentStudent = absentees[0] || eligibleStudents[0];
  const previewMessage = sampleAbsentStudent
    ? generateSmsMessage(
        sampleAbsentStudent.full_name,
        selectedDate,
        selectedSubject?.name || "Subject Lecture",
        smsLanguage,
      )
    : "";

  const handleCopyPreview = () => {
    if (!previewMessage) return;
    navigator.clipboard.writeText(previewMessage);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">
          Mark Subject Attendance
        </h2>
        <p className="text-sm text-muted-foreground">
          One daily record per student per subject. Absentees automatically receive multilingual parent SMS alerts in English, मराठी, or हिंदी.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          ✓ {successMsg}
        </div>
      )}

      <div className="surface-panel grid gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Select Subject
          </label>
          <Select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            options={subjects.map((s) => ({
              value: s.id,
              label: `${s.code} · ${s.name} (Sem ${s.semester})`,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Attendance Date
          </label>
          <Input
            type="date"
            max={todayStr}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Globe className="h-3 w-3 text-primary" />
            Parent SMS Language
          </label>
          <Select
            value={smsLanguage}
            onChange={(e) => setSmsLanguage(e.target.value as SmsLanguage)}
            options={SMS_LANGUAGES.map((l) => ({
              value: l.id,
              label: `${l.flag} ${l.label} (${l.subLabel})`,
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Filter Students
          </label>
          <Input
            placeholder="Search by name or roll no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="surface-panel space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h3 className="font-display text-lg font-bold">
              {eligibleStudents.length} Students in Cohort
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedSubject?.name} · Semester {selectedSubject?.semester}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll("present")}
            >
              All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll("absent")}
            >
              All Absent
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={eligibleStudents.length === 0}
            >
              <Save className="mr-2 h-4 w-4" /> Save Attendance
            </Button>
          </div>
        </div>

        {eligibleStudents.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No active students enrolled in this subject's semester and
            department.
          </div>
        ) : (
          <div className="space-y-2">
            {eligibleStudents.map((st) => {
              const status = attendanceState[st.id] || "present";
              return (
                <div
                  key={st.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3.5 transition-colors ${
                    status === "absent"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{st.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Roll No:{" "}
                      <span className="font-medium text-foreground">
                        {st.roll_number}
                      </span>{" "}
                      · Parent Mobile: {st.parent_mobile || "None"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Badge
                      variant={status === "present" ? "success" : "destructive"}
                      className="uppercase text-[10px]"
                    >
                      {status}
                    </Badge>
                    <Button
                      size="sm"
                      variant={status === "present" ? "default" : "outline"}
                      onClick={() => toggleStudent(st.id, "present")}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Present
                    </Button>
                    <Button
                      size="sm"
                      variant={status === "absent" ? "destructive" : "outline"}
                      onClick={() => toggleStudent(st.id, "absent")}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Absent
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Multilingual Confirm & Parent SMS Dispatch Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg">
                  Confirm Attendance & Parent Alerts
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedSubject?.name} • {selectedDate}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                <span className="text-[11px] text-muted-foreground block">Total Students</span>
                <span className="text-lg font-bold text-foreground">{eligibleStudents.length}</span>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">Present</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {eligibleStudents.length - absentees.length}
                </span>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-2.5">
                <span className="text-[11px] text-destructive block">Absent (Alerted)</span>
                <span className="text-lg font-bold text-destructive">{absentees.length}</span>
              </div>
            </div>

            {absentees.length > 0 ? (
              <div className="space-y-3 pt-1">
                {/* Language Selection Header */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      Parent Message Language / संदेशाची भाषा:
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Easy for parents to read & understand
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {SMS_LANGUAGES.map((lang) => {
                      const isSelected = smsLanguage === lang.id;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setSmsLanguage(lang.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left text-xs transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/20"
                              : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="text-sm">{lang.flag}</span>
                          <div className="truncate">
                            <span className="block truncate">{lang.label}</span>
                            <span className="text-[9px] text-muted-foreground font-normal block truncate">
                              {lang.subLabel}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Message Preview */}
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Live Message Preview (Sample: {sampleAbsentStudent?.full_name})
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyPreview}
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {copiedPreview ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-card border border-border/60 text-xs font-sans text-foreground whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                    {previewMessage}
                  </div>
                </div>

                {/* Absentee Student Parent List */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Absentees Receiving Notification ({absentees.length}):
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border/60 p-1.5">
                    {absentees.map((st) => {
                      const stMsg = generateSmsMessage(
                        st.full_name,
                        selectedDate,
                        selectedSubject?.name || "Subject",
                        smsLanguage,
                      );
                      const waUrl = st.parent_mobile
                        ? getParentWhatsAppUrl(st.parent_mobile, stMsg)
                        : null;

                      return (
                        <div
                          key={st.id}
                          className="flex items-center justify-between text-xs p-2 rounded-md bg-card border border-border/40 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[11px] font-bold text-muted-foreground shrink-0">
                              {st.roll_number}
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {st.full_name}
                            </span>
                            <span className="text-muted-foreground text-[11px] shrink-0">
                              ({st.parent_name || "Guardian"})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {st.parent_mobile ? (
                              <>
                                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {st.parent_mobile}
                                </span>
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                    title="Open WhatsApp with message"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </>
                            ) : (
                              <Badge variant="destructive" className="text-[9px]">
                                Missing Phone
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                🎉 Excellent! All {eligibleStudents.length} students are marked PRESENT. No parent absence alerts need to be dispatched.
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndSendAlerts}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving & Dispatching...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {absentees.length > 0
                    ? `Save & Trigger ${absentees.length} SMS (${SMS_LANGUAGES.find((l) => l.id === smsLanguage)?.label})`
                    : "Save Attendance Record"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
