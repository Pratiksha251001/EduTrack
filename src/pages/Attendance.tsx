import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
  ShieldCheck,
  CheckCircle2,
  Bell,
  ArrowRight,
} from "lucide-react";
import { localDb } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  college,
  generateSmsMessage,
  SMS_LANGUAGES,
  getParentWhatsAppUrl,
} from "../lib/college";
import { SmsLanguage, Student } from "../lib/types";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { AttendanceVerificationModal } from "../components/AttendanceVerificationModal";
import { AttendanceDispatchReceiptModal } from "../components/AttendanceDispatchReceiptModal";

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
  const [attendanceState, setAttendanceState] = useState<
    Record<string, "present" | "absent">
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [lastDispatched, setLastDispatched] = useState<{
    subject?: (typeof subjects)[0];
    date: string;
    totalPresent: number;
    recipients: Array<{
      student: Student;
      status: "sent" | "failed";
      message: string;
    }>;
    language: SmsLanguage;
  }>({
    subject: undefined,
    date: todayStr,
    totalPresent: 0,
    recipients: [],
    language: "trilingual",
  });

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const cohortStudents = useMemo(() => {
    if (!selectedSubject) return [];
    return students.filter(
      (st) =>
        st.status === "active" &&
        st.semester === selectedSubject.semester &&
        (!selectedSubject.department_id ||
          st.department_id === selectedSubject.department_id),
    );
  }, [students, selectedSubject]);

  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return cohortStudents;
    const q = searchQuery.toLowerCase().trim();
    return cohortStudents.filter(
      (st) =>
        st.full_name.toLowerCase().includes(q) ||
        st.roll_number.toLowerCase().includes(q) ||
        (st.parent_name && st.parent_name.toLowerCase().includes(q)),
    );
  }, [cohortStudents, searchQuery]);

  React.useEffect(() => {
    const existing = localDb.attendance.filter(
      (a) => a.subject_id === selectedSubjectId && a.date === selectedDate,
    );
    const map: Record<string, "present" | "absent"> = {};
    cohortStudents.forEach((st) => {
      const rec = existing.find((r) => r.student_id === st.id);
      map[st.id] = rec ? rec.status : "present";
    });
    setAttendanceState(map);
  }, [selectedSubjectId, selectedDate, cohortStudents]);

  const markAll = (status: "present" | "absent") => {
    const next: Record<string, "present" | "absent"> = {};
    cohortStudents.forEach((st) => (next[st.id] = status));
    setAttendanceState(next);
  };

  const toggleStudent = (id: string, status: "present" | "absent") => {
    setAttendanceState((prev) => ({ ...prev, [id]: status }));
  };

  const absentees = cohortStudents.filter(
    (st) => (attendanceState[st.id] || "present") === "absent",
  );

  const handleConfirmSubmission = async (chosenLang: SmsLanguage) => {
    if (!selectedSubject) return;
    setSaving(true);

    const records = cohortStudents.map((st) => ({
      student_id: st.id,
      subject_id: selectedSubject.id,
      date: selectedDate,
      status: attendanceState[st.id] || "present",
      marked_by: user?.id || null,
    }));

    await localDb.upsertAttendance(records);

    const currentAbsentees = cohortStudents.filter(
      (st) => (attendanceState[st.id] || "present") === "absent",
    );

    const dispatchedList: Array<{
      student: Student;
      status: "sent" | "failed";
      message: string;
    }> = [];

    if (currentAbsentees.length > 0) {
      const smsEntries = currentAbsentees.map((st) => {
        const msg = generateSmsMessage(
          st.full_name,
          selectedDate,
          selectedSubject.name,
          chosenLang,
        );
        const status = (st.parent_mobile ? "sent" : "failed") as "sent" | "failed";
        dispatchedList.push({
          student: st,
          status,
          message: msg,
        });
        return {
          student_id: st.id,
          subject_id: selectedSubject.id,
          student_name: st.full_name,
          parent_mobile: st.parent_mobile,
          message: msg,
          status,
          attendance_date: selectedDate,
          sent_at: new Date().toISOString(),
          language: chosenLang,
        };
      });
      await localDb.insert("sms_logs", smsEntries);
    }

    const currentLang = SMS_LANGUAGES.find((l) => l.id === chosenLang);
    setSaving(false);
    setConfirmOpen(false);

    setLastDispatched({
      subject: selectedSubject,
      date: selectedDate,
      totalPresent: cohortStudents.length - currentAbsentees.length,
      recipients: dispatchedList,
      language: chosenLang,
    });
    setReceiptOpen(true);

    setSuccessMsg(
      `Attendance saved! ${currentAbsentees.length} Parent SMS alert(s) dispatched in ${currentLang?.label || chosenLang}. View them in SMS Log History anytime.`,
    );
    setTimeout(() => setSuccessMsg(""), 12000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">
            Mark Subject Attendance
          </h2>
          <p className="text-sm text-muted-foreground">
            Take attendance and click Submit to review Absent & Present lists before automated SMS alerts reach parents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs border-primary/25 bg-primary/5 text-primary">
            <Bell className="h-3.5 w-3.5 mr-1.5" /> Automated Parent SMS Enabled
          </Badge>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Attendance Saved & Parent SMS Alerts Dispatched!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{successMsg}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link to="/sms-logs">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                View in Log History
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="surface-panel grid gap-4 md:grid-cols-3">
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
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold">
                {cohortStudents.length} Students in Cohort
              </h3>
              <Badge variant="outline" className="text-xs">
                {absentees.length} Absent
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedSubject?.name} · Semester {selectedSubject?.semester}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
              disabled={cohortStudents.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs"
            >
              <Send className="mr-1.5 h-4 w-4" />
              <span>Submit Attendance</span>
              {absentees.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                  {absentees.length} SMS
                </span>
              )}
            </Button>
          </div>
        </div>

        {displayedStudents.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {cohortStudents.length === 0
              ? "No active students enrolled in this subject's semester and department."
              : "No students matching search filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedStudents.map((st) => {
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
                      · Parent: {st.parent_name || "Guardian"} · Mobile:{" "}
                      <span className="font-mono text-foreground font-medium">
                        {st.parent_mobile || "None"}
                      </span>
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

      {/* Verification Modal with Absent and Present Lists & Language SMS Preview */}
      <AttendanceVerificationModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        subject={selectedSubject}
        date={selectedDate}
        eligibleStudents={cohortStudents}
        attendanceState={attendanceState}
        onToggleStudent={toggleStudent}
        onConfirm={handleConfirmSubmission}
        saving={saving}
        smsLanguage={smsLanguage}
        onLanguageChange={setSmsLanguage}
      />

      {/* Post-dispatch confirmation receipt modal */}
      <AttendanceDispatchReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        subject={lastDispatched.subject}
        date={lastDispatched.date}
        totalPresent={lastDispatched.totalPresent}
        absentRecipients={lastDispatched.recipients}
        language={lastDispatched.language}
        onMarkAnother={() => {
          setSearchQuery("");
        }}
      />
    </div>
  );
};
