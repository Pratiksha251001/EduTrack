import React, { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  Mail,
  Send,
  Check,
  CheckCircle2,
  Users,
  Smartphone,
  MessageSquare,
  Copy,
  ExternalLink,
  RotateCcw,
  Search,
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
import { Textarea } from "./ui/textarea";
import { localDb } from "../lib/supabase";
import { AlertChannel, Student, SmsLog } from "../lib/types";
import {
  generateEmailAlertContent,
  generateSmsMessage,
  cleanSmsMessage,
} from "../lib/college";
import { dispatchSmsViaGateway } from "../lib/smsService";
import { apiFetch } from "../lib/api";

export interface DefaulterStudentItem {
  student: Student;
  roll: string;
  name: string;
  className: string;
  percentage: number;
  totalLectures: number;
  attendedLectures: number;
  parentName: string;
  parentMobile: string;
  parentEmail: string;
}

interface DefaulterDirectAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlertsSent?: (count: number) => void;
}

export const DefaulterDirectAlertModal: React.FC<
  DefaulterDirectAlertModalProps
> = ({ open, onOpenChange, onAlertsSent }) => {
  const [search, setSearch] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>([
    "email",
  ]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customNote, setCustomNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [sentSuccessDetails, setSentSuccessDetails] = useState<{
    count: number;
    acceptedCount: number;
    failedCount: number;
    logsRecorded: boolean;
    channels: AlertChannel[];
  } | null>(null);

  // Compute all students with < 75% attendance
  const defaulterList: DefaulterStudentItem[] = useMemo(() => {
    const allAttendance = localDb.attendance;
    const allStudents = localDb.students.filter((s) => s.status === "active");
    const classesMap = new Map(
      localDb.academic_classes.map((c) => [c.id, c.name]),
    );

    const list: DefaulterStudentItem[] = [];

    allStudents.forEach((st) => {
      const records = allAttendance.filter((a) => a.student_id === st.id);
      const total = records.length;
      const present = records.filter((a) => a.status === "present").length;
      // If student has records, calculate real %; otherwise default to 65% for test student
      const percentage = total > 0 ? (present / total) * 100 : null;

      if (percentage !== null && percentage < 75) {
        const className =
          st.class_name ||
          (st.class_id ? classesMap.get(st.class_id) : undefined) ||
          `Sem ${st.semester}`;
        list.push({
          student: st,
          roll: st.roll_number,
          name: st.full_name,
          className,
          percentage,
          totalLectures: total,
          attendedLectures: present,
          parentName: st.parent_name || "Parent",
          parentMobile: st.parent_mobile || "",
          parentEmail: st.parent_email_verified_at ? (st.parent_email || "") : "",
        });
      }
    });

    return list.sort((a, b) => a.percentage - b.percentage);
  }, [open]);

  // When modal opens, select all defaulters by default
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(defaulterList.map((d) => d.student.id)));
      setSearch("");
      setCustomNote("");
      setIsSending(false);
      setSentSuccessDetails(null);
      setSelectedChannels(["email"]);
    }
  }, [open, defaulterList]);

  const filteredDefaulters = useMemo(() => {
    if (!search.trim()) return defaulterList;
    const q = search.toLowerCase();
    return defaulterList.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.roll.toLowerCase().includes(q) ||
        d.className.toLowerCase().includes(q) ||
        d.parentMobile.includes(q),
    );
  }, [defaulterList, search]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDefaulters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDefaulters.map((d) => d.student.id)));
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChannel = (channel: AlertChannel) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channel)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== channel);
      }
      return [...prev, channel];
    });
  };

  // Sample student for live preview
  const sampleDefaulter = defaulterList[0] || {
    name: "Sample Student",
    roll: "101",
    className: "SY CSE-A",
    percentage: 62,
    parentEmail: "student@engg.college.edu",
    parentMobile: "9876543210",
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const sampleEmail = generateEmailAlertContent(
    sampleDefaulter.name,
    todayStr,
    sampleDefaulter.className || "Academics",
    "absent",
    sampleDefaulter.percentage,
  );

  const handleSendAlerts = async () => {
    const targets = defaulterList.filter((d) => selectedIds.has(d.student.id));
    if (targets.length === 0) return;

    setIsSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));

      const timestamp = new Date().toISOString();
      const newLogs: SmsLog[] = [];
      const smsGatewayBatch: any[] = [];

      for (const t of targets) {
        // 1. Channel: Email
        if (selectedChannels.includes("email")) {
          const emailContent = generateEmailAlertContent(
            t.name,
            todayStr,
            t.className,
            "absent",
            t.percentage,
          );

          let body = emailContent.body;
          if (customNote.trim()) {
            body += `\n\nAdministrative Note: ${customNote.trim()}`;
          }

          let emailResult = { success: false, isSimulated: false, message: "Verified parent email unavailable." };
          if (t.parentEmail) {
            try {
              const response = await apiFetch("/api/parents/attendance/notify", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: t.student.id, kind: "low_attendance", date: todayStr }),
              });
              const result = await response.json().catch(() => ({}));
              emailResult = {
                success: response.ok && result.success === true && result.status === "provider_accepted",
                isSimulated: false,
                message: result.message || result.reason || result.status || "Not accepted",
              };
            } catch { emailResult.message = "Notification backend unavailable."; }
          }
          const isLive = !emailResult.isSimulated && emailResult.success;
          newLogs.push({
            id: `email-defaulter-${Date.now()}-${t.student.id}-${Math.random().toString(36).substring(2, 6)}`,
            student_id: t.student.id,
            student_name: t.name,
            parent_mobile: t.parentMobile,
            recipient_email: t.parentEmail,
            channel: "email",
            is_defaulter_alert: true,
            attendance_rate: t.percentage,
            email_subject: emailContent.subject,
            message: body,
            status: emailResult.success ? "sent" : "failed",
            attendance_date: todayStr,
            sent_at: timestamp,
            language: "en",
            gateway: isLive
              ? "EmailJS Live Service"
              : "Email Notification Service",
            gateway_response: isLive
              ? `EmailJS accepted the email request for ${t.parentEmail}`
              : emailResult.message || "Email request failed.",
            created_at: timestamp,
          });
        }

        // 2. Channel: SMS
        if (selectedChannels.includes("sms")) {
          let smsMsg = `Dear Parent, ${t.name} (Roll ${t.roll}, ${t.className}) has CRITICAL LOW ATTENDANCE: ${t.percentage}% (Min req is 75%). Debarment risk for University exams. Kindly meet HOD immediately. - EduTrack`;
          if (customNote.trim()) {
            smsMsg += ` Note: ${customNote.trim()}`;
          }

          const hasMobile = Boolean(
            t.parentMobile && t.parentMobile.length >= 10,
          );
          newLogs.push({
            id: `sms-defaulter-${Date.now()}-${t.student.id}-${Math.random().toString(36).substring(2, 6)}`,
            student_id: t.student.id,
            student_name: t.name,
            parent_mobile: t.parentMobile,
            channel: "sms",
            is_defaulter_alert: true,
            attendance_rate: t.percentage,
            message: cleanSmsMessage(smsMsg),
            status: hasMobile ? "pending" : "failed",
            attendance_date: todayStr,
            sent_at: timestamp,
            language: "en",
            gateway: "MSG91",
            gateway_response: hasMobile
              ? "Queued for MSG91 dispatch; provider acceptance not yet confirmed"
              : "Invalid phone number",
            created_at: timestamp,
          });

          if (hasMobile) {
            smsGatewayBatch.push({
              mobile: t.parentMobile,
              message: cleanSmsMessage(smsMsg),
              studentName: t.name,
              studentId: t.student.id,
              date: todayStr,
            });
          }
        }

      }

      let logsRecorded = false;
      if (newLogs.length > 0) {
        try {
          await localDb.insert("sms_logs", newLogs);
          logsRecorded = true;
          window.dispatchEvent(
            new CustomEvent("edutrack_sms_logs_updated", { detail: newLogs }),
          );
        } catch (error) {
          console.error(
            "Communication delivery completed, but Parent Log recording failed:",
            error,
          );
        }
      }

      if (smsGatewayBatch.length > 0) {
        dispatchSmsViaGateway(smsGatewayBatch).catch((err) =>
          console.warn("Defaulter SMS gateway notice:", err),
        );
      }

      setSentSuccessDetails({
        count: targets.length,
        acceptedCount: newLogs.filter((log) => log.status === "sent").length,
        failedCount: newLogs.filter((log) => log.status === "failed").length,
        logsRecorded,
        channels: selectedChannels,
      });
      onAlertsSent?.(targets.length);
    } catch (error) {
      console.error("Defaulter alert dispatch failed:", error);
      alert(error instanceof Error ? error.message : "Alert dispatch failed.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(
      `${sampleEmail.subject}\n\n${sampleEmail.body}`,
    );
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-amber-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Dispatch &lt;75% Attendance Defaulter Alerts
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Targeting students below the mandatory 75% attendance threshold
                (Total:{" "}
                <strong className="text-foreground">
                  {defaulterList.length}
                </strong>{" "}
                defaulters)
              </p>
            </div>
          </div>
        </DialogHeader>

        {sentSuccessDetails ? (
          /* Simple Short Success Confirmation */
          <div className="p-6 text-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Alert sent to {sentSuccessDetails.count} student(s) via{" "}
                <span className="uppercase text-primary font-bold">
                  {sentSuccessDetails.channels.join(" + ")}
                </span>
                .
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sentSuccessDetails.acceptedCount} request(s) accepted;{" "}
                {sentSuccessDetails.failedCount} failed.
                {sentSuccessDetails.logsRecorded
                  ? " Recorded in Parent Logs."
                  : " Parent Log recording failed."}
              </p>
            </div>
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Selection & Configuration Screen */
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* 3 Channel Selector */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-primary" />
                  Select Alert Channels to Dispatch:
                </span>
                <span className="text-[11px] text-primary font-bold">
                  Email (Default)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. Email */}
                <button
                  type="button"
                  onClick={() => toggleChannel("email")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all relative ${
                    selectedChannels.includes("email")
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Notice</span>
                  {selectedChannels.includes("email") && (
                    <Check className="h-3.5 w-3.5 ml-0.5" />
                  )}
                  <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded text-[8.5px] bg-amber-500 text-amber-950 font-bold border border-amber-600/30">
                    Default
                  </span>
                </button>

                {/* 2. SMS */}
                <button
                  type="button"
                  onClick={() => toggleChannel("sms")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    selectedChannels.includes("sms")
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>SMS Alert</span>
                  {selectedChannels.includes("sms") && (
                    <Check className="h-3.5 w-3.5 ml-0.5" />
                  )}
                </button>

              </div>

              <p className="text-[10.5px] text-muted-foreground leading-relaxed pt-0.5">
                ✉️ An official{" "}
                <strong>Defaulter Warning Notice (&lt;75%)</strong> will be
                delivered to parents with exact lecture deficit details.
              </p>
            </div>

            {/* Custom Administrative Remark */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Optional Admin Directive / Meeting Note:
              </label>
              <Input
                placeholder="e.g., Mandatory parent meeting with HOD on Friday at 11:00 AM."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Defaulter Students Table */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Select Defaulter Students ({selectedIds.size} of{" "}
                    {defaulterList.length} selected):
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    {selectedIds.size === filteredDefaulters.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter student / roll..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-7 pl-8 text-xs"
                  />
                </div>
              </div>

              {defaulterList.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5">
                  <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    🎉 Excellent! No students are below 75% attendance.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All students are in the safe zone.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border divide-y divide-border bg-card max-h-56 overflow-y-auto">
                  {filteredDefaulters.map((d) => {
                    const isSelected = selectedIds.has(d.student.id);
                    return (
                      <div
                        key={d.student.id}
                        onClick={() => toggleStudent(d.student.id)}
                        className={`p-2.5 flex items-center justify-between gap-2.5 hover:bg-muted/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-amber-500/[0.04]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(d.student.id)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
                          />
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground shrink-0">
                            {d.roll}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {d.name}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                • {d.className}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-muted-foreground truncate">
                              Parent: {d.parentName}
                              {d.parentMobile && (
                                <span> • 📱 {d.parentMobile}</span>
                              )}
                              {d.parentEmail && (
                                <span> • ✉️ {d.parentEmail}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[10.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 shrink-0"
                        >
                          {d.percentage}% Attended
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!sentSuccessDetails && (
          <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex flex-col-reverse sm:flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSendAlerts}
              disabled={isSending || selectedIds.size === 0}
              className="w-full sm:w-auto text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5"
            >
              {isSending ? (
                <>Dispatching Defaulter Alerts...</>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Dispatch &lt;75% Alerts to {selectedIds.size} Defaulter(s)
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
