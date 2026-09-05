import React from "react";
import {
  CheckCircle2,
  Send,
  MessageSquare,
  FileText,
  ExternalLink,
  Phone,
  User,
  Clock,
  ArrowRight,
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
import { SMS_LANGUAGES, getParentWhatsAppUrl } from "../lib/college";
import { SmsLanguage, Student, Subject } from "../lib/types";
import { Link } from "react-router-dom";

interface DispatchedRecipient {
  student: Student;
  status: "sent" | "failed";
  message: string;
}

interface AttendanceDispatchReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | undefined;
  date: string;
  totalPresent: number;
  absentRecipients: DispatchedRecipient[];
  language: SmsLanguage;
  onMarkAnother?: () => void;
}

export const AttendanceDispatchReceiptModal: React.FC<
  AttendanceDispatchReceiptModalProps
> = ({
  open,
  onOpenChange,
  subject,
  date,
  totalPresent,
  absentRecipients,
  language,
  onMarkAnother,
}) => {
  const selectedLangOption = SMS_LANGUAGES.find((l) => l.id === language);
  const sentCount = absentRecipients.filter((r) => r.status === "sent").length;
  const failedCount = absentRecipients.filter((r) => r.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-emerald-500/10 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-foreground">
                  Attendance Recorded & Parent SMS Dispatched!
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Session verified:{" "}
                <span className="font-semibold text-foreground">
                  {subject?.code} · {subject?.name}
                </span>{" "}
                (Sem {subject?.semester}) on{" "}
                <span className="font-semibold text-foreground">{date}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
            <div className="rounded-xl border border-emerald-500/20 bg-card p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Marked Present
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {totalPresent}
              </span>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-card p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Marked Absent
              </span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {absentRecipients.length}
              </span>
            </div>
            <div className="rounded-xl border border-primary/20 bg-card p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                SMS Delivered
              </span>
              <span className="text-lg font-bold text-primary">
                {sentCount} {failedCount > 0 && <span className="text-xs text-amber-500">({failedCount} no phone)</span>}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Body List of Absent Parent Alerts Dispatched */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {absentRecipients.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-1.5">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                🌟 100% Attendance Recorded!
              </p>
              <p className="text-xs text-muted-foreground">
                All {totalPresent} enrolled students were marked present. No absence alert SMS was triggered.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Parent SMS Dispatch Summary ({sentCount} Sent)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  English + मराठी + हिंदी
                </Badge>
              </div>

              <div className="rounded-xl border border-border divide-y divide-border/60 max-h-64 overflow-y-auto bg-card">
                {absentRecipients.map(({ student, status, message }) => {
                  const waUrl = student.parent_mobile
                    ? getParentWhatsAppUrl(student.parent_mobile, message)
                    : null;

                  return (
                    <div
                      key={student.id}
                      className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground shrink-0 border border-border/60">
                            {student.roll_number}
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {student.full_name}
                          </span>
                          <Badge
                            variant={status === "sent" ? "success" : "destructive"}
                            className="text-[9px] uppercase px-1.5 py-0 shrink-0"
                          >
                            {status === "sent" ? "SMS Sent" : "Missing Phone"}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>Parent: {student.parent_name || "Guardian"}</span>
                          <span>•</span>
                          {student.parent_mobile ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                              📱 {student.parent_mobile}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              No mobile provided
                            </span>
                          )}
                        </div>
                      </div>

                      {/* WhatsApp manual fallback */}
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors shrink-0"
                          title="Open direct WhatsApp chat with parent"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp Direct</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card/70 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Link
            to="/sms-logs"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            <Button variant="outline" size="sm" className="w-full text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
              View Parent SMS Logs
            </Button>
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onMarkAnother && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onMarkAnother();
                }}
                className="w-full sm:w-auto text-xs"
              >
                Mark Another Subject
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
