import React, { useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  User,
  Hash,
  Edit3,
  Check,
  X,
} from "lucide-react";
import { Teacher, Department } from "../lib/types";
import { localDb } from "../lib/supabase";
import {
  cleanMobile,
  getMobileValidationError,
  sanitizeMobileInput,
} from "../lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface TeacherProfileModalProps {
  teacher: Teacher | null;
  department?: Department;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (teacher: Teacher) => void;
  onUpdated?: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  teacher,
  department,
  open,
  onOpenChange,
  onEdit,
  onUpdated,
}) => {
  const [editingMobile, setEditingMobile] = useState(false);
  const [mobileVal, setMobileVal] = useState("");
  const [isSavingMobile, setIsSavingMobile] = useState(false);

  if (!teacher) return null;

  const handleStartEditMobile = () => {
    setMobileVal(teacher.mobile || "");
    setEditingMobile(true);
  };

  const handleSaveMobile = async () => {
    if (mobileVal) {
      const err = getMobileValidationError(mobileVal, "Faculty Mobile", false);
      if (err) {
        alert(err);
        return;
      }
    }
    setIsSavingMobile(true);
    const cleaned = cleanMobile(mobileVal) || null;
    await localDb.update("teachers", teacher.id, {
      mobile: cleaned,
    });
    teacher.mobile = cleaned;
    setIsSavingMobile(false);
    setEditingMobile(false);
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-6 shadow-xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Faculty Details
              </p>
              <DialogTitle className="text-lg font-bold font-display mt-0.5">
                {teacher.full_name}
              </DialogTitle>
            </div>
            <Badge
              variant={teacher.status === "active" ? "default" : "secondary"}
              className="capitalize text-xs"
            >
              {teacher.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Header Card with Initials */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-muted/20">
            <div className="h-12 w-12 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center font-bold text-sm text-primary shadow-2xs shrink-0">
              {teacher.full_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">
                {teacher.full_name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" />
                {department?.name || "Department"}
              </p>
            </div>

            <Badge variant="outline" className="capitalize text-xs shrink-0">
              {teacher.role.replace("_", " ")}
            </Badge>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg border border-border/80 p-3 bg-card space-y-0.5">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Hash className="h-3 w-3 text-primary" /> College Employee ID
              </span>
              <p className="font-mono font-bold text-foreground mt-0.5">
                {teacher.employee_id}
              </p>
            </div>

            <div className="rounded-lg border border-border/80 p-3 bg-card space-y-0.5">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Mail className="h-3 w-3 text-primary" /> Email
              </span>
              <p className="font-semibold text-foreground truncate mt-0.5">
                {teacher.email || "—"}
              </p>
            </div>
          </div>

          {/* Mobile Phone Card */}
          <div className="rounded-lg border border-border/80 p-3.5 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Phone Number
              </span>
              {!editingMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEditMobile}
                  className="h-6 text-xs text-primary hover:bg-primary/10 px-2"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {teacher.mobile ? "Edit" : "Set Phone"}
                </Button>
              )}
            </div>

            {editingMobile ? (
              <div className="flex items-center gap-2">
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobileVal}
                  onChange={(e) => setMobileVal(sanitizeMobileInput(e.target.value))}
                  placeholder="10-digit number"
                  className="h-8 text-xs font-mono"
                />
                <Button
                  size="sm"
                  onClick={handleSaveMobile}
                  disabled={isSavingMobile}
                  className="h-8 text-xs px-2.5"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingMobile(false)}
                  className="h-8 text-xs px-2.5"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xs font-mono text-foreground">
                {teacher.mobile || <span className="text-muted-foreground italic">No phone registered</span>}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(teacher);
                }}
                className="text-xs h-8"
              >
                Edit Teacher
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
