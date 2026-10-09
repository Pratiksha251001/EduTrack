import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  Check,
  X,
  Send,
  Globe,
  Copy,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  MessageSquare,
  Sparkles,
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
import { Input } from "./ui/input";
import {
  college,
  SMS_LANGUAGES,
  generateSmsMessage,
  getParentWhatsAppUrl,
} from "../lib/college";
import { SmsLanguage, Student, Subject } from "../lib/types";

interface AttendanceVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | undefined;
  date: string;
  eligibleStudents: Student[];
  attendanceState: Record<string, "present" | "absent">;
  onToggleStudent: (id: string, status: "present" | "absent") => void;
  onConfirm: (language: SmsLanguage) => Promise<void>;
  saving: boolean;
  smsLanguage: SmsLanguage;
  onLanguageChange: (lang: SmsLanguage) => void;
}

export const AttendanceVerificationModal: React.FC<
  AttendanceVerificationModalProps
> = ({
  open,
  onOpenChange,
  subject,
  date,
  eligibleStudents,
  attendanceState,
  onToggleStudent,
  onConfirm,
  saving,
  smsLanguage,
  onLanguageChange,
}) => {
  const [activeTab, setActiveTab] = useState<"absent" | "present" | "all">(
    "absent",
  );
  const [filterSearch, setFilterSearch] = useState("");
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Categorize students based on current attendanceState
  const { absentStudents, presentStudents } = useMemo(() => {
    const absent: Student[] = [];
    const present: Student[] = [];

    eligibleStudents.forEach((st) => {
      const status = attendanceState[st.id] || "present";
      if (status === "absent") {
        absent.push(st);
      } else {
        present.push(st);
      }
    });

    return { absentStudents: absent, presentStudents: present };
  }, [eligibleStudents, attendanceState]);

  const absentWithMobile = absentStudents.filter((s) => Boolean(s.parent_mobile));
  const absentWithoutMobile = absentStudents.filter((s) => !s.parent_mobile);

  // Filtered lists for the active tab
  const displayedStudents = useMemo(() => {
    let list: Student[] = [];
    if (activeTab === "absent") list = absentStudents;
    else if (activeTab === "present") list = presentStudents;
    else list = eligibleStudents;

    if (!filterSearch.trim()) return list;

    const q = filterSearch.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        (s.parent_name && s.parent_name.toLowerCase().includes(q)) ||
        (s.parent_mobile && s.parent_mobile.includes(q)),
    );
  }, [activeTab, absentStudents, presentStudents, eligibleStudents, filterSearch]);

  // Sample absentee for live SMS preview
  const sampleStudent = absentStudents[0] || eligibleStudents[0];
  const sampleMessage = sampleStudent
    ? generateSmsMessage(
        sampleStudent.full_name,
        date,
        subject?.name || "Subject Lecture",
        smsLanguage,
      )
    : "";

  const handleCopyPreview = () => {
    if (!sampleMessage) return;
    navigator.clipboard.writeText(sampleMessage);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Modal Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-card/70 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Check Attendance & Confirm Parent SMS Alerts
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">
                    {subject?.code} · {subject?.name}
                  </span>{" "}
                  (Semester {subject?.semester}) • Date:{" "}
                  <span className="font-medium text-foreground">{date}</span>
                </p>
              </div>
            </div>
          </div>

          {/* One-Line Verification Notice */}
          <div className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-[11.5px] truncate">
              Please verify Absent ({absentStudents.length}) & Present ({presentStudents.length}) lists before clicking Confirm & Send SMS.
            </span>
          </div>

          {/* Small Message Options: Marathi, Eng, Both (Default: Eng) */}
          <div className="mt-2 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs shadow-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11.5px]">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">Msg Option:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onLanguageChange("mr")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  smsLanguage === "mr"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                Marathi
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange("en")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  smsLanguage === "en"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                Eng (Default)
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange("bilingual_mr")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  smsLanguage === "bilingual_mr" || smsLanguage === "other" || smsLanguage === "trilingual"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                Both
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            <div className="rounded-lg border border-border bg-muted/40 p-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Students
              </span>
              <span className="text-base font-bold text-foreground">
                {eligibleStudents.length}
              </span>
            </div>
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                Present
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {presentStudents.length}
              </span>
            </div>
            <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                Absent (Alerted)
              </span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                {absentStudents.length}
              </span>
            </div>
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-2">
              <span className="text-[10px] uppercase font-bold text-primary block">
                SMS Deliveries
              </span>
              <span className="text-base font-bold text-primary">
                {absentWithMobile.length}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Verification Tabs & Search */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab("absent")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "absent"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Absent List</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeTab === "absent"
                        ? "bg-rose-700 text-white"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {absentStudents.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("present")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "present"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Present List</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeTab === "present"
                        ? "bg-emerald-800 text-white"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {presentStudents.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "all"
                      ? "bg-card text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>All ({eligibleStudents.length})</span>
                </button>
              </div>

              {/* In-modal search */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter this list..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {/* Notice if absent students without phone */}
            {activeTab === "absent" && absentWithoutMobile.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>
                  ⚠️ <strong>{absentWithoutMobile.length} student(s)</strong> have no parent mobile registered. Their absence will still be recorded in logs.
                </span>
                <span className="text-[11px] font-semibold underline">
                  {absentWithoutMobile.map((s) => s.roll_number).join(", ")}
                </span>
              </div>
            )}

            {/* List Container */}
            <div className="rounded-xl border border-border/70 divide-y divide-border/60 max-h-56 overflow-y-auto bg-card">
              {displayedStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {activeTab === "absent" ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        🎉 No students are marked absent!
                      </p>
                      <p className="text-[11px]">
                        All {eligibleStudents.length} students in this cohort will be recorded as Present.
                      </p>
                    </div>
                  ) : activeTab === "present" ? (
                    <p>No students currently marked present.</p>
                  ) : (
                    <p>No students match your filter search.</p>
                  )}
                </div>
              ) : (
                displayedStudents.map((st) => {
                  const status = attendanceState[st.id] || "present";
                  const isAbsent = status === "absent";

                  return (
                    <div
                      key={st.id}
                      className={`flex items-center justify-between p-2.5 px-3 text-xs transition-colors ${
                        isAbsent
                          ? "bg-rose-500/[0.04] hover:bg-rose-500/[0.08]"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Student & Parent Info */}
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground shrink-0 border border-border/50">
                            {st.roll_number}
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {st.full_name}
                          </span>
                          <Badge
                            variant={isAbsent ? "destructive" : "success"}
                            className="text-[9px] uppercase px-1.5 py-0 shrink-0"
                          >
                            {isAbsent ? "Absent" : "Present"}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>Parent: {st.parent_name || "Guardian"}</span>
                          <span>•</span>
                          {st.parent_mobile ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                              📱 {st.parent_mobile}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              ⚠️ No Mobile Registered
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Correction Toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isAbsent ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onToggleStudent(st.id, "present")}
                            className="h-7 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                            title="Mistake? Click to mark this student as Present"
                          >
                            <Check className="h-3 w-3 mr-1 text-emerald-600" />
                            Mark Present
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onToggleStudent(st.id, "absent")}
                            className="h-7 text-[11px] border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/50"
                            title="Mistake? Click to mark this student as Absent"
                          >
                            <X className="h-3 w-3 mr-1 text-rose-600" />
                            Mark Absent
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SMS Notification Message Preview */}
          {absentStudents.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  SMS Preview ({smsLanguage === "mr" ? "Marathi" : smsLanguage === "en" ? "Eng" : "Both"} · Ward: {sampleStudent?.full_name}):
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
                      <Copy className="h-3 w-3 mr-1" /> Copy SMS Text
                    </>
                  )}
                </Button>
              </div>
              <div className="p-2.5 rounded-lg bg-card border border-border/80 text-xs font-sans text-foreground whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                {sampleMessage}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card/70 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Cancel / Back to Edit
          </Button>

          <Button
            onClick={() => onConfirm(smsLanguage)}
            disabled={saving || eligibleStudents.length === 0}
            className={`w-full sm:w-auto font-semibold ${
              absentStudents.length > 0
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Dispatching Parent Alerts...
              </span>
            ) : absentStudents.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                Confirm Attendance & Send SMS ({absentStudents.length} Absent)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Confirm Attendance (All {eligibleStudents.length} Present)
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
