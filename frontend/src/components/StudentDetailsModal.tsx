import React, { useMemo } from "react";
import { Student } from "../lib/types";
import { localDb } from "../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table";
import { CalendarCheck, AlertTriangle } from "lucide-react";

interface StudentDetailsModalProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentName?: string;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  open,
  onOpenChange,
  departmentName,
}) => {
  if (!student) return null;

  const studentAttendance = useMemo(() => {
    return localDb.attendance.filter((a) => a.student_id === student.id);
  }, [student.id, open]);

  const stats = useMemo(() => {
    const total = studentAttendance.length;
    const present = studentAttendance.filter((a) => a.status === "present").length;
    const absent = total - present;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, absent, rate, isDefaulter: total > 0 && rate < 75 };
  }, [studentAttendance]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span>Student Profile & Attendance</span>
            {stats.isDefaulter && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" /> Defaulter (&lt;75%)
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Student Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Student Name
            </span>
            <span className="font-semibold text-foreground text-sm">{student.full_name}</span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Roll Number
            </span>
            <span className="font-mono font-semibold text-foreground text-sm">
              {student.roll_number}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Department
            </span>
            <span>{departmentName || "-"}</span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Year / Semester
            </span>
            <span>
              {student.year ? `Year ${student.year}` : "-"} / Semester{" "}
              {student.semester}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Class / Section
            </span>
            <span>{student.class_name || student.section || "-"}</span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Parent / Guardian
            </span>
            <span>{student.parent_name || "-"}</span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Parent Mobile
            </span>
            <span className="font-mono font-medium">{student.parent_mobile || "-"}</span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Student Mobile
            </span>
            <span className="font-mono">{student.student_mobile || "-"}</span>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">Email</span>
            <span className="break-all">{student.email || "-"}</span>
          </div>
        </div>

        {/* Attendance Statistics Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <span>Attendance History</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Overall Rate:</span>
              <Badge
                variant={stats.total === 0 ? "secondary" : stats.isDefaulter ? "destructive" : "success"}
                className="font-bold text-xs"
              >
                {stats.rate}% ({stats.present} / {stats.total})
              </Badge>
            </div>
          </div>

          {/* Tabular Attendance Records */}
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            {studentAttendance.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No lecture attendance records logged for this student yet.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/70 sticky top-0">
                    <TableRow>
                      <TableHead className="font-bold">Subject</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="text-right font-bold pr-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {studentAttendance.map((record) => {
                      const subject = localDb.subjects.find(
                        (item) => item.id === record.subject_id,
                      );
                      const isPresent = record.status === "present";
                      return (
                        <TableRow key={record.id} className="hover:bg-muted/40">
                          <TableCell className="font-medium text-foreground py-2">
                            {subject?.name || "Subject Lecture"}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground text-[11px] py-2">
                            {record.date}
                          </TableCell>
                          <TableCell className="text-right pr-3 py-2">
                            <Badge
                              variant={isPresent ? "success" : "destructive"}
                              className="text-[9px] uppercase font-bold px-1.5 py-0"
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
