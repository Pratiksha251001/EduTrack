import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Send,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Phone,
  User,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Pause,
  Play,
  FileText,
  ShieldAlert,
  Mail,
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
  cleanSmsMessage,
  generateEmailAlertContent,
} from "../lib/college";
import { localDb } from "../lib/supabase";
import { isValid10DigitMobile } from "../lib/validation";
import { SmsLanguage, SmsLog } from "../lib/types";
import { dispatchSmsViaGateway } from "../lib/smsService";
import { apiFetch } from "../lib/api";

interface ParentAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName?: string;
  parentMobile?: string;
  parentName?: string;
  subjectName?: string;
  date?: string;
  studentId?: string;
  subjectId?: string;
  existingMessage?: string;
  initialLanguage?: SmsLanguage;
  onSuccess?: (msg: string) => void;
}

type MessageOption = "en" | "mr" | "other";

export const ParentAlertModal: React.FC<ParentAlertModalProps> = ({
  open,
  onOpenChange,
  studentName = "Student",
  parentMobile = "",
  parentName = "Guardian",
  subjectName = "Academic Lecture",
  date = new Date().toISOString().split("T")[0],
  studentId,
  subjectId,
  existingMessage,
  initialLanguage,
  onSuccess,
}) => {
  // 3 options: eng, marathi, other message (default is eng)
  const [selectedOption, setSelectedOption] = useState<MessageOption>(() => {
    if (initialLanguage === "mr") return "mr";
    if (initialLanguage === "other" || initialLanguage === "custom") return "other";
    return "en"; // Default is English
  });

  const [selectedChannel, setSelectedChannel] = useState<"sms" | "email">("sms");
  const [customSubject, setCustomSubject] = useState(subjectName);
  const [messageText, setMessageText] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // Sent success state & auto-close timer
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sentChannel, setSentChannel] = useState<"sms" | "email">("sms");
  const [sentStatus, setSentStatus] = useState<"sent" | "failed">("sent");
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(5);
  const [isPaused, setIsPaused] = useState(false);

  const student = useMemo(() => {
    if (!studentId) return null;
    return localDb.students.find((s) => s.id === studentId) || null;
  }, [studentId]);

  const studentAttendanceRate = useMemo(() => {
    if (!studentId) return null;
    const history = localDb.attendance.filter((a) => a.student_id === studentId);
    if (history.length === 0) return null;
    const presentCount = history.filter((a) => a.status === "present").length;
    return (presentCount / history.length) * 100;
  }, [studentId]);

  const isDefaulter = studentAttendanceRate !== null && studentAttendanceRate < 75;

  const handleCloseModal = () => {
    setSentSuccess(false);
    setDispatching(false);
    setIsPaused(false);
    setAutoCloseSeconds(5);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!sentSuccess || isPaused) return;

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
  }, [sentSuccess, autoCloseSeconds, isPaused]);

  // When modal opens or subject changes, reset state
  useEffect(() => {
    if (open) {
      setCustomSubject(subjectName);
      setSentSuccess(false);
      setDispatching(false);
      setAutoCloseSeconds(5);
      setIsPaused(false);

      const email = student?.parent_email_verified_at ? (student.parent_email || "") : "";
      setStudentEmail(email);

      const emailContent = generateEmailAlertContent(
        studentName,
        date,
        subjectName,
        "absent",
        studentAttendanceRate ?? undefined
      );
      setEmailSubject(emailContent.subject);
      setEmailBody(emailContent.body);

      if (existingMessage) {
        setMessageText(cleanSmsMessage(existingMessage));
      } else {
        const initialOpt: MessageOption =
          initialLanguage === "mr" ? "mr" : initialLanguage === "other" || initialLanguage === "custom" ? "other" : "en";
        setSelectedOption(initialOpt);
        setMessageText(
          cleanSmsMessage(generateSmsMessage(studentName, date, subjectName, initialOpt))
        );
      }
    }
  }, [open, subjectName, studentName, date, existingMessage, initialLanguage, student, studentAttendanceRate]);

  // Handle user switching between the 3 options: Eng, Marathi, Other
  const handleSelectOption = (option: MessageOption) => {
    setSelectedOption(option);
    const newMsg = cleanSmsMessage(
      generateSmsMessage(studentName, date, customSubject, option)
    );
    setMessageText(newMsg);
  };

  const handleResetToTemplate = () => {
    const newMsg = cleanSmsMessage(
      generateSmsMessage(studentName, date, customSubject, selectedOption)
    );
    setMessageText(newMsg);
  };

  const handleApplyPreset = (presetText: string) => {
    setMessageText(cleanSmsMessage(presetText));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      selectedChannel === "email" ? `${emailSubject}\n\n${emailBody}` : messageText
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendViaEmail = async () => {
    setDispatching(true);
    let accepted = false;
    let detail = "Verified parent email or student link missing.";
    if (studentId && studentEmail) {
      try {
        const response = await apiFetch("/api/parents/attendance/notify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, kind: isDefaulter ? "low_attendance" : "daily_attendance", date }),
        });
        const result = await response.json().catch(() => ({}));
        accepted = response.ok && result.success === true && result.status === "provider_accepted";
        detail = result.message || result.reason || result.status || "Request not accepted";
      } catch { detail = "Notification backend unavailable"; }
    }

    const logEntry: SmsLog = {
      id: `sms-email-${Date.now()}`,
      student_id: studentId || null,
      subject_id: subjectId || null,
      student_name: studentName,
      parent_mobile: parentMobile,
      recipient_email: studentEmail,
      channel: "email",
      is_defaulter_alert: isDefaulter,
      attendance_rate: studentAttendanceRate,
      email_subject: emailSubject,
      message: emailBody,
      status: accepted ? "sent" : "failed",
      attendance_date: date,
      sent_at: new Date().toISOString(),
      language: selectedOption,
      gateway: "Email Notification Service",
      gateway_response: detail,
    };

    await localDb.insert("sms_logs", [logEntry]);
    window.dispatchEvent(
      new CustomEvent("edutrack_sms_logs_updated", { detail: [logEntry] })
    );

    setDispatching(false);
    setSentChannel("email");
    setSentStatus(accepted ? "sent" : "failed");
    setSentSuccess(true);
    setAutoCloseSeconds(5);
    setIsPaused(false);
    onSuccess?.(
      accepted ? "Email provider accepted request; delivery not confirmed." : detail
    );
  };

  const handleSimulateSmsDispatch = async () => {
    setDispatching(true);

    const isMobileValid = isValid10DigitMobile(parentMobile);
    let gatewayDetails = "";
    let gatewayAccepted = false;

    if (isMobileValid && parentMobile) {
      try {
        const gatewayRes = await dispatchSmsViaGateway([
          {
            mobile: parentMobile,
            message: messageText,
            studentName,
            date,
            subject: customSubject || "Attendance",
          },
        ]);
        if (gatewayRes.results && gatewayRes.results.length > 0) {
          gatewayDetails = gatewayRes.results[0].details || "";
          gatewayAccepted = gatewayRes.results[0].status === "sent" || gatewayRes.results[0].status === "accepted" || gatewayRes.results[0].status === "delivered";
        }
      } catch (err: any) {
        console.warn("Gateway direct alert dispatch note:", err);
      }
    }

    const status = gatewayAccepted ? "sent" : "failed";
    const logEntry: SmsLog = {
      id: `sms-direct-${Date.now()}`,
      student_id: studentId || null,
      subject_id: subjectId || null,
      student_name: studentName,
      parent_mobile: parentMobile,
      channel: "sms",
      message: messageText,
      status,
      attendance_date: date,
      sent_at: new Date().toISOString(),
      language: selectedOption,
      gateway: "MSG91",
      gateway_response: gatewayDetails,
    };

    await localDb.insert("sms_logs", [logEntry]);
    window.dispatchEvent(
      new CustomEvent("edutrack_sms_logs_updated", { detail: [logEntry] })
    );

    setDispatching(false);
    setSentChannel("sms");
    setSentStatus(status);
    setSentSuccess(true);
    setAutoCloseSeconds(status === "sent" ? 5 : 8);
    setIsPaused(false);

    if (status === "sent") {
      onSuccess?.(`Absence alert dispatched to parent via MSG91 Gateway!`);
    } else if (!parentMobile) {
      onSuccess?.(`SMS recorded as failed: Parent mobile number missing.`);
    } else {
      onSuccess?.(
        `SMS recorded as failed: Parent mobile "${parentMobile}" is not a valid 10-digit number.`
      );
    }
  };

  const isPhoneValid = isValid10DigitMobile(parentMobile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border bg-card/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  sentSuccess
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {sentSuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground leading-none">
                  {sentSuccess ? "Alert Dispatched" : "Parent Absence Alert"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1 leading-none">
                  {sentSuccess
                    ? `Notification logged for ${studentName}`
                    : `${studentName} marked absent on ${date}`}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sentSuccess ? (
            <div className="space-y-4 py-1">
              {/* Sent Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-xs ${
                  sentStatus === "sent"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                }`}
              >
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    sentStatus === "sent"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {sentStatus === "sent" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-sm block">
                    {sentStatus === "sent"
                      ? "Provider request recorded; delivery not confirmed"
                      : "Alert Logged with Delivery Flag"}
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {`Notification outcome recorded for ${studentName}; delivery not confirmed.`}
                  </p>
                </div>
              </div>

              {/* Auto-close Banner */}
              <div className="rounded-xl border border-border bg-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {isPaused ? (
                      <strong className="text-amber-600 dark:text-amber-400">
                        Auto-close paused. Click "Done / Close" when ready.
                      </strong>
                    ) : (
                      <>
                        Closing window in{" "}
                        <strong className="text-primary font-mono text-sm">
                          {autoCloseSeconds}s
                        </strong>
                        ...
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused((prev) => !prev)}
                    className="h-7 px-2.5 text-[11px]"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-3 w-3 mr-1" /> Resume Timer
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 mr-1" /> Pause Timer
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCloseModal}
                    className="h-7 px-3 text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Close Now
                  </Button>
                </div>
              </div>

              {/* Recipient Details & Sent Message Log */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 text-xs shadow-xs">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                  Dispatched Communication Record
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-lg bg-muted/40">
                  <div>
                    <span className="text-muted-foreground block">Student:</span>
                    <strong className="text-foreground">{studentName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Guardian:</span>
                    <strong className="text-foreground">
                      {parentName || "Parent"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Contact:</span>
                    <strong className="font-mono text-foreground">
                      {parentMobile || "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Channel:</span>
                    <strong className="capitalize text-foreground">
                      {sentChannel === "email" ? "Email" : "Automated SMS"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Language:</span>
                    <strong className="text-foreground">
                      {selectedOption === "en"
                        ? "English (Eng)"
                        : selectedOption === "mr"
                        ? "Marathi (मराठी)"
                        : "Both (Eng + मराठी)"}
                    </strong>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border/80 text-xs whitespace-pre-line text-muted-foreground max-h-44 overflow-y-auto leading-relaxed">
                  {messageText}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recipient Overview Card */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {studentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">
                          {studentName}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isDefaulter
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {studentAttendanceRate}% Attendance
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Absence on <strong>{date}</strong> · {customSubject}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="destructive"
                    className="text-[11px] font-semibold bg-rose-600 text-white"
                  >
                    Marked Absent
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/40 space-y-0.5">
                    <span className="text-[10.5px] text-muted-foreground block">Parent / Guardian:</span>
                    <span className="font-semibold text-foreground truncate block">
                      {parentName || "Parent"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-muted/40 space-y-0.5">
                    <span className="text-[10.5px] text-muted-foreground block">Parent Mobile:</span>
                    {parentMobile ? (
                      isPhoneValid ? (
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                          📱 {parentMobile}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block truncate">
                          Invalid ({parentMobile})
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-rose-600 font-bold block truncate">
                        Missing Number
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-muted/40 space-y-0.5">
                    <span className="text-[10.5px] text-muted-foreground block">Email Address:</span>
                    <span className="font-mono text-muted-foreground text-[11px] truncate block">
                      ✉️ {studentEmail || "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alert channels: SMS and Email */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-primary" />
                    <span>Select Alert Channel (Choose from 3 Options):</span>
                  </label>
                  {isDefaulter && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                      ⚠️ &lt;75% Attendance Defaulter
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Channel 1: SMS */}
                  <button
                    type="button"
                    onClick={() => setSelectedChannel("sms")}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      selectedChannel === "sms"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    <span>SMS Alert</span>
                  </button>

                  {/* Channel 2: Email (<75% Auto Warning) */}
                  <button
                    type="button"
                    onClick={() => setSelectedChannel("email")}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all relative ${
                      selectedChannel === "email"
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Alert</span>
                    {isDefaulter && (
                      <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded text-[8.5px] bg-amber-500 text-amber-950 font-bold border border-amber-600/30">
                        &lt;75% Warning
                      </span>
                    )}
                  </button>

                </div>

                {/* Email Defaulter Rule Banner */}
                {isDefaulter && (
                  <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-[11px] leading-tight">
                      <strong>Defaulter Policy:</strong> This student has <strong>{studentAttendanceRate}%</strong> attendance (below 75%). An official Warning Email notice will be issued with deficit details.
                    </span>
                  </div>
                )}
              </div>

              {/* Channel-Specific Configuration */}
              {selectedChannel === "email" ? (
                <div className="space-y-3 p-3.5 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      Email Notification Details
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopy}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy Text
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Recipient Email Address:</label>
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
                      placeholder="student@engg.college.edu"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Subject Line:</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Email Notice Body:</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground font-sans leading-relaxed resize-y shadow-inner"
                    />
                  </div>
                </div>
              ) : (
                /* SMS Content Options */
                <div className="space-y-3">
                  {/* Message Language / Type: Eng, Marathi, Both */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span>Message Language:</span>
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Default is <strong className="text-primary font-semibold">English (Eng)</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectOption("en")}
                        className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          selectedOption === "en"
                            ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/40"
                            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="font-bold">English (Eng)</span>
                        <span className="text-[10px] mt-0.5 opacity-80 font-normal">Standard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectOption("mr")}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          selectedOption === "mr"
                            ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/40"
                            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="font-bold">Marathi (मराठी)</span>
                        <span className="text-[10px] mt-0.5 opacity-80 font-normal">स्थानिक संदेश</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectOption("other")}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          selectedOption === "other"
                            ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/40"
                            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="font-bold">Both (Bilingual)</span>
                        <span className="text-[10px] mt-0.5 opacity-80 font-normal">Eng + मराठी</span>
                      </button>
                    </div>
                  </div>

                  {/* Message Editor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {"SMS Message Content:"}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {messageText.length} chars · {Math.max(1, Math.ceil(messageText.length / 160))} SMS credit
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleResetToTemplate}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Reset to default"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCopy}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {copied ? (
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
                    </div>

                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary leading-relaxed resize-y font-sans shadow-inner"
                      placeholder="Type message to send to parent..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {sentSuccess ? (
          <DialogFooter className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <Link to="/sms-logs" onClick={handleCloseModal} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                View in Alert History Logs
              </Button>
            </Link>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSentSuccess(false)}
                className="w-full sm:w-auto text-xs h-9"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Send Another Alert
              </Button>

              <Button
                size="sm"
                onClick={handleCloseModal}
                className="w-full sm:w-auto text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-9"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Done / Close ({autoCloseSeconds}s)
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs h-9"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedChannel === "sms" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSimulateSmsDispatch}
                  disabled={dispatching || !parentMobile}
                  className="w-full sm:w-auto text-xs font-semibold h-9 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {dispatching ? (
                    <>Sending Mobile SMS...</>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Send Mobile SMS
                    </>
                  )}
                </Button>
              )}

              {selectedChannel === "email" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendViaEmail}
                  disabled={dispatching || !studentEmail}
                  className="w-full sm:w-auto text-xs font-semibold h-9 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {dispatching ? (
                    <>Dispatching Email Notice...</>
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      Send Email Notice {isDefaulter ? "(<75% Defaulter Warning)" : ""}
                    </>
                  )}
                </Button>
              )}

            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
