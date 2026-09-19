import React from "react";
import { Student } from "../lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="block text-xs text-muted-foreground">
              Student Name
            </span>
            <span className="font-semibold">{student.full_name}</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Roll Number
            </span>
            <span className="font-mono font-semibold">
              {student.roll_number}
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              PRN Number
            </span>
            <span className="font-mono font-semibold">
              {student.prn_number || "-"}
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Registration Number
            </span>
            <span>{student.reg_number || "-"}</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Department
            </span>
            <span>{departmentName || "-"}</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Year / Semester
            </span>
            <span>
              {student.year ? `Year ${student.year}` : "-"} / Semester{" "}
              {student.semester}
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Class / Section
            </span>
            <span>{student.class_name || student.section || "-"}</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">Status</span>
            <Badge
              variant={student.status === "active" ? "success" : "secondary"}
            >
              {student.status}
            </Badge>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Parent / Guardian
            </span>
            <span>{student.parent_name || "-"}</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Parent Mobile
            </span>
            <span>{student.parent_mobile || "-"}</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">
              Student Mobile
            </span>
            <span>{student.student_mobile || "-"}</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">Email</span>
            <span className="break-all">{student.email || "-"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
