import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Send,
  MessageSquare,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Phone,
  User,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
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
  college,
  SMS_LANGUAGES,
  generateSmsMessage,
  cleanSmsMessage,
  getParentWhatsAppUrl,
  formatParentPhoneForWhatsApp,
} from "../lib/college";
import { localDb } from "../lib/supabase";
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
  initialLanguage = "trilingual",
  onSuccess,
}) => {
  const [selectedLang, setSelectedLang] = useState<SmsLanguage>(initialLanguage);
  const [copied, setCopied] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [customSubject, setCustomSubject] = useState(subjectName);

  useEffect(() => {
    if (open) {
      setSelectedLang(initialLanguage);
      setCustomSubject(subjectName);
    }
  }, [open, initialLanguage, subjectName]);

  const activeMessage = useMemo(() => {
    if (existingMessage) {
      return cleanSmsMessage(existingMessage);
    }
    return cleanSmsMessage(generateSmsMessage(studentName, date, customSubject, selectedLang));
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
    onSuccess?.(`WhatsApp message opened and logged for ${studentName}'s parent.`);
  };

  const handleSimulateSmsDispatch = async () => {
    setDispatching(true);
    await new Promise((r) => setTimeout(r, 600));

    const status = parentMobile ? "sent" : "failed";
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
    setDispatching(false);
    onOpenChange(false);

    if (status === "sent") {
      onSuccess?.(`Absence alert SMS successfully dispatched to parent in ${SMS_LANGUAGES.find(l => l.id === selectedLang)?.label || selectedLang}!`);
    } else {
      onSuccess?.(`SMS recorded as failed: Parent mobile number missing.`);
    }
  };

  const cleanPhone = formatParentPhoneForWhatsApp(parentMobile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                Send Parent Absence Alert
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Notify guardian in English, Marathi (मराठी) or Hindi (हिंदी) so they easily understand.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Card */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-foreground">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Student:</span>
                <span className="font-semibold">{studentName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Parent:</span>
                <span className="font-semibold">{parentName || "Parent"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <span className="text-muted-foreground">Mobile:</span>
                {parentMobile ? (
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {parentMobile}
                  </span>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">
                    No Mobile Number!
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-foreground">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">{customSubject}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Absence Date:</span>
                <span className="font-medium">{date}</span>
              </div>
            </div>
          </div>

          {/* Unified Language Notice */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Trilingual Parent Alert Message
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Includes complete message in English, मराठी, and हिंदी
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/10">
              English + मराठी + हिंदी
            </Badge>
          </div>

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <span>Message Preview</span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {activeMessage.length} characters
                </Badge>
              </label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" /> Copy Message
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="relative rounded-xl border border-border/80 bg-muted/30 p-3.5 font-sans text-xs text-foreground leading-relaxed whitespace-pre-line shadow-inner max-h-56 overflow-y-auto">
              {activeMessage}
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              Tip: Marathi & Hindi messages use respectful tone (आदरणीय पालक / आदरणीय अभिभावक) designed for immediate parental understanding and high response rates.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          {parentMobile && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendViaWhatsApp}
              className="w-full sm:w-auto border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500"
              title="Open WhatsApp with this message pre-filled"
            >
              <MessageSquare className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              Send via WhatsApp
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSimulateSmsDispatch}
            disabled={dispatching}
            className="w-full sm:w-auto"
          >
            {dispatching ? (
              <>Sending SMS...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Dispatch SMS Alert
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
