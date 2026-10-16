import React, { useState, useMemo } from "react";
import {
  Check,
  X,
  Send,
  Users,
  Copy,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Globe,
  FileText,
  MessageSquare,
  Mail,
  AlertTriangle,
  Smartphone,
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
  generateEmailAlertContent,
  generateWhatsAppMessage,
} from "../lib/college";
import { localDb } from "../lib/supabase";
import { AlertChannel, SmsLanguage, Student, Subject } from "../lib/types";

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
    channels?: AlertChannel[],
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
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>([
    "email",
  ]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [formatPreviewTab, setFormatPreviewTab] = useState<
    "sms" | "email" | "whatsapp"
  >("email");
  const [showPresentList, setShowPresentList] = useState(false);
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

  // Calculate cumulative attendance percentage for each student to identify <75% defaulters
  const studentRates = useMemo(() => {
    const rates: Record<
      string,
      { total: number; present: number; percentage: number; isDefaulter: boolean }
    > = {};

    const allRecords = localDb.attendance;

    eligibleStudents.forEach((st) => {
      const past = allRecords.filter((a) => a.student_id === st.id);
      const isTodayAbsent = (attendanceState[st.id] || "present") === "absent";
      const total = past.length + 1;
      const present =
        past.filter((a) => a.status === "present").length +
        (isTodayAbsent ? 0 : 1);
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
      rates[st.id] = {
        total,
        present,
        percentage,
        isDefaulter: percentage < 75,
      };
    });

    return rates;
  }, [eligibleStudents, attendanceState]);

  // Absent students who are defaulters (< 75% attendance)
  const defaulterAbsentees = useMemo(() => {
    return absentStudents.filter((st) => studentRates[st.id]?.isDefaulter);
  }, [absentStudents, studentRates]);

  // Sample student for live preview
  const sampleStudent =
    smsTargetMode === "present_only"
      ? presentStudents[0] || eligibleStudents[0]
      : absentStudents[0] || eligibleStudents[0];

  const sampleStatus: "absent" | "present" =
    smsTargetMode === "present_only" ? "present" : "absent";

  const sampleRate = sampleStudent
    ? studentRates[sampleStudent.id]?.percentage
    : 70;

  const sampleSms = sampleStudent
    ? generateSmsMessage(
        sampleStudent.full_name,
        date,
        subject?.name || "Subject Lecture",
        smsLanguage,
        sampleStatus,
      )
    : "";

  const sampleEmail = sampleStudent
    ? generateEmailAlertContent(
        sampleStudent.full_name,
        date,
        subject?.name || "Subject Lecture",
        sampleStatus,
        sampleRate,
      )
    : { subject: "", body: "" };

  const sampleNormalEmail = sampleStudent
    ? generateEmailAlertContent(
        sampleStudent.full_name,
        date,
        subject?.name || "Subject Lecture",
        sampleStatus,
        85,
      )
    : { subject: "", body: "" };

  const sampleDefaulterEmail = sampleStudent
    ? generateEmailAlertContent(
        sampleStudent.full_name,
        date,
        subject?.name || "Subject Lecture",
        sampleStatus,
        sampleRate && sampleRate < 75 ? sampleRate : 64,
      )
    : { subject: "", body: "" };

  const sampleWhatsApp = sampleStudent
    ? generateWhatsAppMessage(
        sampleStudent.full_name,
        date,
        subject?.name || "Subject Lecture",
        sampleStatus,
        smsLanguage,
        sampleRate,
      )
    : "";

  const toggleChannel = (channel: AlertChannel) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channel)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== channel);
      }
      return [...prev, channel];
    });
  };

  const handleCopyPreview = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Header with Title and 3-Dots Menu */}
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Confirm Attendance &amp; Send Alerts
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  <span className="font-semibold text-foreground">
                    {subject?.code} · {subject?.name}
                  </span>{" "}
                  (Sem {subject?.semester}) • Date:{" "}
                  <span className="font-semibold text-foreground">{date}</span>
                </p>
              </div>

              {/* 3-Dots Menu Container */}
              <div className="relative shrink-0 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
                    menuOpen
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title="Alert Settings (Channels, Language, Preview)"
                  aria-label="Alert Settings"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown Backdrop */}
                {menuOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                )}

                {/* 3-Dots Options Dropdown Popup */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card p-3.5 shadow-xl z-50 space-y-3.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        Alert Channels &amp; Settings
                      </span>
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="text-xs text-muted-foreground hover:text-foreground font-bold p-1"
                      >
                        ✕
                      </button>
                    </div>

                    {/* 1. Alert Channels: Email (Default), SMS, WhatsApp */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-muted-foreground block">
                          Alert Channels:
                        </label>
                        <span className="text-[10px] text-primary font-bold">
                          Email (Default)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleChannel("email")}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                            selectedChannels.includes("email")
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email</span>
                          {selectedChannels.includes("email") && <Check className="h-3 w-3 ml-0.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleChannel("sms")}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                            selectedChannels.includes("sms")
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          <span>SMS</span>
                          {selectedChannels.includes("sms") && <Check className="h-3 w-3 ml-0.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleChannel("whatsapp")}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                            selectedChannels.includes("whatsapp")
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                          {selectedChannels.includes("whatsapp") && <Check className="h-3 w-3 ml-0.5" />}
                        </button>
                      </div>

                      <p className="text-[10px] text-muted-foreground leading-relaxed pt-0.5">
                        ✉️ Normal Absence Email is sent to parents. If attendance &lt;75%, official Defaulter Warning Email is sent.
                      </p>
                    </div>

                    {/* 2. Language Setting */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        <span>Message Language:</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-lg border border-border text-xs">
                        <button
                          type="button"
                          onClick={() => onLanguageChange("en")}
                          className={`py-1 rounded font-medium transition-all ${
                            smsLanguage === "en"
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => onLanguageChange("mr")}
                          className={`py-1 rounded font-medium transition-all ${
                            smsLanguage === "mr"
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Marathi
                        </button>
                        <button
                          type="button"
                          onClick={() => onLanguageChange("bilingual_mr")}
                          className={`py-1 rounded font-medium transition-all ${
                            smsLanguage === "bilingual_mr" ||
                            smsLanguage === "other" ||
                            smsLanguage === "trilingual"
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Both
                        </button>
                      </div>
                    </div>

                    {/* 3. SMS Recipient Target Setting */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-primary" />
                        <span>Send Alerts To:</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-lg border border-border text-xs">
                        <button
                          type="button"
                          onClick={() => setSmsTargetMode("absent_only")}
                          className={`py-1 rounded font-medium transition-all ${
                            smsTargetMode === "absent_only"
                              ? "bg-rose-600 text-white font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Absent ({absentStudents.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSmsTargetMode("present_only")}
                          className={`py-1 rounded font-medium transition-all ${
                            smsTargetMode === "present_only"
                              ? "bg-emerald-600 text-white font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Present ({presentStudents.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSmsTargetMode("both")}
                          className={`py-1 rounded font-medium transition-all ${
                            smsTargetMode === "both"
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Both ({eligibleStudents.length})
                        </button>
                      </div>
                    </div>

                    {/* 4. View Alert Formats Button */}
                    <div className="pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFormatModal(true);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span>Preview SMS, Email &amp; WhatsApp Formats</span>
                        </span>
                        <span className="text-[11px] text-primary font-bold">
                          Preview &rarr;
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Simple Body */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
            {/* Simple Stats Row: Total, Present, Absent, Channel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border bg-muted/30 gap-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <Users className="h-4 w-4 text-primary" />
                <span>
                  Total Students: <strong className="text-foreground">{eligibleStudents.length}</strong>
                </span>
                <span className="text-border">|</span>
                <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                  <span>Channel:</span>
                  <strong className="text-primary font-semibold">
                    {selectedChannels.map((c) => c.toUpperCase()).join(" + ")}
                  </strong>
                  <span className="text-[10px] text-muted-foreground ml-0.5">(change in •••)</span>
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

            {/* Defaulter Warning Banner (only if any absentees have <75% attendance) */}
            {defaulterAbsentees.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[11px] leading-tight">
                  <strong>{defaulterAbsentees.length} Absent Student(s) have Low Attendance (&lt;75%):</strong> Official Warning Email will be dispatched automatically.
                </p>
              </div>
            )}

            {/* Absent Students List (Main Verification Target) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Absent Students ({absentStudents.length})</span>
                  {absentStudents.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] py-0 px-1.5 font-bold"
                    >
                      Alert Target
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
                <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-5 text-center space-y-1">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    🎉 All {eligibleStudents.length} students are marked Present!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No absence alert SMS/Email will be sent.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
                  {absentStudents.map((st) => {
                    const rateInfo = studentRates[st.id];
                    const isLow = rateInfo?.isDefaulter;

                    return (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-3 hover:bg-rose-500/[0.03] transition-colors gap-3"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground shrink-0">
                            {st.roll_number}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {st.full_name}
                              </p>
                              {isLow && (
                                <Badge
                                  className="text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 px-1.5 py-0"
                                  title="Attendance below 75% minimum"
                                >
                                  ⚠️ &lt;75% ({rateInfo.percentage}%) • Auto-Email
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              Parent: {st.parent_name || "Guardian"}
                              {st.parent_mobile ? (
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                                  • 📱 {st.parent_mobile}
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                                  • (No Mobile)
                                </span>
                              )}
                              {st.email && (
                                <span className="text-muted-foreground font-mono ml-1">
                                  • ✉️ {st.email}
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
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quiet Link to Expand Present Students */}
            {presentStudents.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPresentList(!showPresentList)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  <span>
                    {showPresentList ? "Hide" : "View"} Present Students (
                    {presentStudents.length})
                  </span>
                  {showPresentList ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
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
            )}
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
              onClick={() => onConfirm(smsLanguage, smsTargetMode, selectedChannels)}
              disabled={saving || eligibleStudents.length === 0}
              className="w-full sm:w-auto gap-1.5 text-xs font-semibold shadow-xs"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving &amp; Dispatching Alerts...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {smsTargetMode === "absent_only" && absentStudents.length > 0
                    ? `Confirm & Send Alerts (${absentStudents.length} Absent)`
                    : smsTargetMode === "present_only"
                      ? `Confirm & Send Alerts (${presentStudents.length} Present)`
                      : smsTargetMode === "both"
                        ? `Confirm & Send Alerts (${eligibleStudents.length} Students)`
                        : `Confirm Attendance (${eligibleStudents.length} Students)`}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Channel Alert Format Preview Dialog (Accessed via 3-dots menu) */}
      <Dialog open={showFormatModal} onOpenChange={setShowFormatModal}>
        <DialogContent className="max-w-lg p-5 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Alert Message Format Preview
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select a channel to review the notification template sent to parents.
            </p>
          </DialogHeader>

          {/* 4 Formats Switcher: Normal Email, <75% Defaulter Email, SMS, WhatsApp */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-muted/60 p-1 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setFormatPreviewTab("normal_email")}
              className={`py-1.5 px-2 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                formatPreviewTab === "normal_email"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Normal Email</span>
            </button>

            <button
              type="button"
              onClick={() => setFormatPreviewTab("defaulter_email")}
              className={`py-1.5 px-2 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                formatPreviewTab === "defaulter_email"
                  ? "bg-amber-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>&lt;75% Warning</span>
            </button>

            <button
              type="button"
              onClick={() => setFormatPreviewTab("sms")}
              className={`py-1.5 px-2 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                formatPreviewTab === "sms"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>SMS Format</span>
            </button>

            <button
              type="button"
              onClick={() => setFormatPreviewTab("whatsapp")}
              className={`py-1.5 px-2 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                formatPreviewTab === "whatsapp"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          {/* Preview Box */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
            {formatPreviewTab === "normal_email" ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ✉️ Normal Absence Email (Default for Attendance &gt;= 75%)
                  </span>
                </div>
                <div className="p-2 rounded-md bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Subject Line:
                  </span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {sampleNormalEmail.subject}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-card border border-border whitespace-pre-line leading-relaxed font-sans text-foreground">
                  {sampleNormalEmail.body}
                </div>
              </div>
            ) : formatPreviewTab === "defaulter_email" ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    ⚠️ Official Defaulter Warning Email (Triggered for Attendance &lt; 75%)
                  </span>
                </div>
                <div className="p-2 rounded-md bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Subject Line:
                  </span>
                  <p className="font-semibold text-foreground mt-0.5 text-amber-600 dark:text-amber-400">
                    {sampleDefaulterEmail.subject}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-card border border-border whitespace-pre-line leading-relaxed font-sans text-foreground">
                  {sampleDefaulterEmail.body}
                </div>
              </div>
            ) : formatPreviewTab === "sms" ? (
              <div className="p-3 rounded-md bg-card border border-border whitespace-pre-line leading-relaxed font-sans text-xs text-foreground">
                {sampleSms || "No SMS preview available."}
              </div>
            ) : (
              <div className="p-3 rounded-md bg-card border border-border whitespace-pre-line leading-relaxed font-sans text-xs text-foreground">
                {sampleWhatsApp || "No WhatsApp preview available."}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const textToCopy =
                  formatPreviewTab === "normal_email"
                    ? `${sampleNormalEmail.subject}\n\n${sampleNormalEmail.body}`
                    : formatPreviewTab === "defaulter_email"
                      ? `${sampleDefaulterEmail.subject}\n\n${sampleDefaulterEmail.body}`
                      : formatPreviewTab === "sms"
                        ? sampleSms
                        : sampleWhatsApp;
                handleCopyPreview(textToCopy);
              }}
              className="text-xs gap-1.5"
            >
              {copiedPreview ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied Text
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Template Text
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setShowFormatModal(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
