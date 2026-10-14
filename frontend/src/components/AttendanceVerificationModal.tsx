import React, { useState, useMemo } from "react";
import {
  Check,
  X,
  Send,
  MessageSquare,
  Users,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
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
import {
  generateSmsMessage,
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
  onConfirm: (
    language: SmsLanguage,
    targetMode: "absent_only" | "present_only" | "both",
  ) => Promise<void>;
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
  const [smsTargetMode, setSmsTargetMode] = useState<
    "absent_only" | "present_only" | "both"
  >("absent_only");
  const [showPresentList, setShowPresentList] = useState(false);
  const [showSmsPreview, setShowSmsPreview] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Categorize students
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

  // Target count based on SMS target mode
  const targetCount =
    smsTargetMode === "absent_only"
      ? absentStudents.length
      : smsTargetMode === "present_only"
        ? presentStudents.length
        : eligibleStudents.length;

  // Sample student for live SMS preview
  const sampleStudent =
    smsTargetMode === "present_only"
      ? presentStudents[0] || eligibleStudents[0]
      : absentStudents[0] || eligibleStudents[0];

  const sampleStatus: "absent" | "present" =
    smsTargetMode === "present_only" ? "present" : "absent";

  const sampleMessage = sampleStudent
    ? generateSmsMessage(
        sampleStudent.full_name,
        date,
        subject?.name || "Subject Lecture",
        smsLanguage,
        sampleStatus,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Clean Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Confirm Attendance &amp; Send SMS
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground">
                  {subject?.code} · {subject?.name}
                </span>{" "}
                (Sem {subject?.semester}) • Date:{" "}
                <span className="font-semibold text-foreground">{date}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Unified Compact Overview Bar */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-3">
            {/* Top Stats: Total, Present, Absent */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Total Students:{" "}
                  <strong className="text-foreground">{eligibleStudents.length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Present: {presentStudents.length}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold border border-rose-500/20">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Absent: {absentStudents.length}
                </span>
              </div>
            </div>

            {/* Quick Controls: Send SMS To & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground block">
                  Send SMS Notification to:
                </label>
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setSmsTargetMode("absent_only")}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-all ${
                      smsTargetMode === "absent_only"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Absent ({absentStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmsTargetMode("present_only")}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-all ${
                      smsTargetMode === "present_only"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Present ({presentStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmsTargetMode("both")}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-all ${
                      smsTargetMode === "both"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Both ({eligibleStudents.length})
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground block">
                  Message Language:
                </label>
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => onLanguageChange("en")}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-all ${
                      smsLanguage === "en"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange("mr")}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-all ${
                      smsLanguage === "mr"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Marathi
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange("bilingual_mr")}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-all ${
                      smsLanguage === "bilingual_mr" ||
                      smsLanguage === "other" ||
                      smsLanguage === "trilingual"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Absent Students Section (Main Verification Target) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <span>Absent Students ({absentStudents.length})</span>
                {absentStudents.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                    SMS Target
                  </Badge>
                )}
              </h3>
              {absentStudents.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  Click &quot;Make Present&quot; if marked by mistake
                </span>
              )}
            </div>

            {absentStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 text-center space-y-1">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  🎉 All {eligibleStudents.length} students are marked Present!
                </p>
                <p className="text-xs text-muted-foreground">
                  No absence SMS alerts will be sent.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
                {absentStudents.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3 hover:bg-rose-500/[0.03] transition-colors gap-3"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground shrink-0">
                        {st.roll_number}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {st.full_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Parent: {st.parent_name || "Guardian"}{" "}
                          {st.parent_mobile ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                              • {st.parent_mobile}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                              • (No Mobile Registered)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleStudent(st.id, "present")}
                      className="h-7 text-xs px-2.5 shrink-0 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 font-medium"
                      title="Change to Present"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Make Present
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggleable Present Students List */}
          <div className="border-t border-border/60 pt-2">
            <button
              type="button"
              onClick={() => setShowPresentList(!showPresentList)}
              className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              <span>View Present Students ({presentStudents.length})</span>
              {showPresentList ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showPresentList && (
              <div className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden mt-2 max-h-48 overflow-y-auto">
                {presentStudents.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors gap-3"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="font-mono font-medium text-xs text-muted-foreground shrink-0">
                        {st.roll_number}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {st.full_name}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleStudent(st.id, "absent")}
                      className="h-6 text-[11px] px-2 text-rose-600 hover:bg-rose-500/10 gap-1"
                      title="Change to Absent"
                    >
                      <X className="h-3 w-3" />
                      Mark Absent
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible SMS Preview */}
          <div className="border-t border-border/60 pt-2">
            <button
              type="button"
              onClick={() => setShowSmsPreview(!showSmsPreview)}
              className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Preview SMS Message Template
              </span>
              {showSmsPreview ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showSmsPreview && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2 mt-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Template Preview ({sampleStatus === "present" ? "Present Alert" : "Absent Alert"} ·{" "}
                    {smsLanguage === "mr" ? "Marathi" : smsLanguage === "en" ? "English" : "Both"}):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPreview}
                    className="flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    {copiedPreview ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs whitespace-pre-line leading-relaxed text-foreground font-sans">
                  {sampleMessage || "No message preview available."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="w-full sm:w-auto text-xs"
          >
            Cancel / Back to Edit
          </Button>

          <Button
            onClick={() => onConfirm(smsLanguage, smsTargetMode)}
            disabled={saving || eligibleStudents.length === 0}
            className="w-full sm:w-auto gap-1.5 text-xs font-semibold shadow-xs"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving &amp; Sending SMS...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {smsTargetMode === "absent_only" && absentStudents.length > 0
                  ? `Confirm & Send SMS (${absentStudents.length} Absent)`
                  : smsTargetMode === "present_only"
                    ? `Confirm & Send SMS (${presentStudents.length} Present)`
                    : smsTargetMode === "both"
                      ? `Confirm & Send SMS to All (${eligibleStudents.length})`
                      : `Confirm Attendance (${eligibleStudents.length} Students)`}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
