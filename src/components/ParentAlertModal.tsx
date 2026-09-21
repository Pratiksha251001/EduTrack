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
  getParentWhatsAppUrl,
  formatParentPhoneForWhatsApp,
} from "../lib/college";
import { localDb } from "../lib/supabase";
import { isValid10DigitMobile } from "../lib/validation";
import { SmsLanguage, SmsLog } from "../lib/types";

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
  onSuccess,
}) => {
  // Default to fixed English + Marathi format with common student name
  const selectedLang: SmsLanguage = "bilingual_mr";
  const [copied, setCopied] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [customSubject, setCustomSubject] = useState(subjectName);

  // Sent success state & auto-close timer
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sentChannel, setSentChannel] = useState<"whatsapp" | "sms">("sms");
  const [sentStatus, setSentStatus] = useState<"sent" | "failed">("sent");
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(5);
  const [isPaused, setIsPaused] = useState(false);

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

  useEffect(() => {
    if (open) {
      setCustomSubject(subjectName);
      setSentSuccess(false);
      setDispatching(false);
      setAutoCloseSeconds(5);
      setIsPaused(false);
    }
  }, [open, subjectName]);

  const activeMessage = useMemo(() => {
    if (existingMessage) {
      return cleanSmsMessage(existingMessage);
    }
    return cleanSmsMessage(
      generateSmsMessage(studentName, date, customSubject, selectedLang)
    );
  }, [existingMessage, studentName, date, customSubject, selectedLang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendViaWhatsApp = () => {
    if (!parentMobile) {
      alert("Parent mobile number is not registered for this student.");
      return;
    }
    const url = getParentWhatsAppUrl(parentMobile, activeMessage);
    window.open(url, "_blank");

    // Also record in SMS log
    const logEntry: SmsLog = {
      id: `sms-wa-${Date.now()}`,
      student_id: studentId || null,
      subject_id: subjectId || null,
      student_name: studentName,
      parent_mobile: parentMobile,
      message: activeMessage,
      status: "sent",
      attendance_date: date,
      sent_at: new Date().toISOString(),
      language: selectedLang,
    };
    localDb.insert("sms_logs", [logEntry]);
    window.dispatchEvent(
      new CustomEvent("edutrack_sms_logs_updated", { detail: [logEntry] })
    );

    setSentChannel("whatsapp");
    setSentStatus("sent");
    setSentSuccess(true);
    setAutoCloseSeconds(5);
    setIsPaused(false);
    onSuccess?.(`WhatsApp message opened and logged for ${studentName}'s parent.`);
  };

  const handleSimulateSmsDispatch = async () => {
    setDispatching(true);
    await new Promise((r) => setTimeout(r, 500));

    const isMobileValid = isValid10DigitMobile(parentMobile);
    const status = parentMobile && isMobileValid ? "sent" : "failed";
    const logEntry: SmsLog = {
      id: `sms-direct-${Date.now()}`,
      student_id: studentId || null,
      subject_id: subjectId || null,
      student_name: studentName,
      parent_mobile: parentMobile,
      message: activeMessage,
      status,
      attendance_date: date,
      sent_at: new Date().toISOString(),
      language: selectedLang,
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
      onSuccess?.(`Absence alert successfully dispatched to parent!`);
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
                      ? sentChannel === "whatsapp"
                        ? "WhatsApp Message Dispatched & Logged!"
                        : "Absence Alert Dispatched Successfully!"
                      : "Alert Logged with Delivery Flag"}
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {sentChannel === "whatsapp"
                      ? `WhatsApp communication launched for ${studentName}'s parent (${parentMobile || "N/A"}). Audit record preserved in logs.`
                      : `Official absence warning transmitted to ${studentName}'s parent (${parentMobile || "N/A"}). Log entry confirmed.`}
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
                      {sentChannel === "whatsapp"
                        ? "WhatsApp Direct"
                        : "Automated SMS"}
                    </strong>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border/80 text-xs whitespace-pre-line text-muted-foreground max-h-44 overflow-y-auto leading-relaxed">
                  {activeMessage}
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
                      <h4 className="font-bold text-sm text-foreground">
                        {studentName}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <span className="text-muted-foreground">Parent / Guardian:</span>
                    <span className="font-semibold text-foreground">
                      {parentName || "Parent"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <span className="text-muted-foreground">Mobile Contact:</span>
                    {parentMobile ? (
                      isPhoneValid ? (
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {parentMobile}
                        </span>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="text-[10px]"
                          title="Must be 10 digits"
                        >
                          Invalid ({parentMobile})
                        </Badge>
                      )
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        Missing Number
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <span>Official Notification Preview</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {activeMessage.length} chars
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopy}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
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

                <div className="rounded-xl border border-border bg-muted/30 p-3.5 font-sans text-xs text-foreground leading-relaxed whitespace-pre-line shadow-inner max-h-56 overflow-y-auto">
                  {activeMessage}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {sentSuccess ? (
          <DialogFooter className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <Link to="/sms-logs" onClick={handleCloseModal} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full text-xs h-9">
                <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                View in Official SMS Logs
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
              {parentMobile && isPhoneValid && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendViaWhatsApp}
                  className="w-full sm:w-auto text-xs h-9 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 font-semibold"
                  title="Open WhatsApp with message pre-filled"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  Send via WhatsApp
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleSimulateSmsDispatch}
                disabled={dispatching || !parentMobile}
                className="w-full sm:w-auto text-xs font-semibold h-9 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {dispatching ? (
                  <>Sending Alert...</>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Dispatch SMS Alert
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
