import React, { useState, useRef } from "react";
import {
  Building2,
  Calendar,
  Camera,
  Check,
  GraduationCap,
  Mail,
  Phone,
  Shield,
  User,
  Users,
  Briefcase,
  Hash,
  Clock,
  Edit3,
  X,
} from "lucide-react";
import { Teacher, Department } from "../lib/types";
import { localDb } from "../lib/supabase";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMobile, setEditingMobile] = useState(false);
  const [mobileVal, setMobileVal] = useState("");
  const [isSavingMobile, setIsSavingMobile] = useState(false);

  if (!teacher) return null;

  const handleStartEditMobile = () => {
    setMobileVal(teacher.mobile || "");
    setEditingMobile(true);
  };

  const handleSaveMobile = async () => {
    setIsSavingMobile(true);
    await localDb.update("teachers", teacher.id, {
      mobile: mobileVal.trim() || null,
    });
    teacher.mobile = mobileVal.trim() || null;
    setIsSavingMobile(false);
    setEditingMobile(false);
    onUpdated?.();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await localDb.update("teachers", teacher.id, { photo_url: dataUrl });
      teacher.photo_url = dataUrl;
      onUpdated?.();
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Remove profile photo?")) return;
    await localDb.update("teachers", teacher.id, { photo_url: null });
    teacher.photo_url = null;
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Faculty Profile Dossier
              </p>
              <DialogTitle className="text-xl font-bold font-display mt-0.5">
                {teacher.full_name}
              </DialogTitle>
            </div>
            <Badge
              variant={teacher.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {teacher.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Header Card with Photo & High-level Role */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-border bg-muted/20">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl border-2 border-primary/20 bg-primary/10 overflow-hidden flex items-center justify-center text-primary shadow-xs">
                {teacher.photo_url ? (
                  <img
                    src={teacher.photo_url}
                    alt={teacher.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-primary/60" />
                )}
              </div>

              {/* Photo Upload / Change Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 rounded-full bg-primary p-2 text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                title="Upload or change faculty photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-bold text-foreground truncate">
                  {teacher.full_name}
                </h3>
                <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                  {teacher.designation || "Faculty Lecturer"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {department?.name || "Department of Engineering"} ({department?.code || "DEPT"})
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-muted border border-border text-foreground">
                  Ref ID: {teacher.employee_id}
                </span>

                <Badge
                  variant={teacher.role === "class_coordinator" ? "outline" : "secondary"}
                  className="text-xs capitalize"
                >
                  {teacher.role.replace("_", " ")}
                </Badge>

                {teacher.photo_url && (
                  <button
                    onClick={handleRemovePhoto}
                    className="text-[11px] text-destructive hover:underline ml-1"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Academic & Personal Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* 1. Designation */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Briefcase className="h-4 w-4 text-primary" />
                <span>Academic Designation</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {teacher.designation || "Assistant Professor"}
              </p>
              <p className="text-[11px] text-muted-foreground">Institutional appointment</p>
            </div>

            {/* 2. Department */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Department</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {department?.name || "Computer Science & Engineering"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Code: {department?.code || "CSE"}
              </p>
            </div>

            {/* 3. Qualification */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>Highest Qualification</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {teacher.qualification || "Postgraduate Degree"}
              </p>
              <p className="text-[11px] text-muted-foreground">Verified academic credential</p>
            </div>

            {/* 4. College Employee ID Reference No */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Hash className="h-4 w-4 text-primary" />
                <span>College Employee ID Reference No</span>
              </div>
              <p className="text-sm font-mono font-bold text-foreground">
                {teacher.employee_id}
              </p>
              <p className="text-[11px] text-muted-foreground">Official payroll & login key</p>
            </div>

            {/* 5. Date of Birth */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Date of Birth</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {teacher.date_of_birth
                  ? new Date(teacher.date_of_birth).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Not Provided"}
              </p>
              <p className="text-[11px] text-muted-foreground">Birth record in file</p>
            </div>

            {/* 6. Year of Experience */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Clock className="h-4 w-4 text-primary" />
                <span>Teaching Experience</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {teacher.experience_years
                  ? String(teacher.experience_years).includes("Year")
                    ? teacher.experience_years
                    : `${teacher.experience_years} Years`
                  : "Not Specified"}
              </p>
              <p className="text-[11px] text-muted-foreground">Academic service tenure</p>
            </div>
          </div>

          {/* Contact & Manual Phone Setting Card */}
          <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
            <h4 className="font-semibold text-xs text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-primary" />
                Contact Phone & Communication
              </span>
              {!editingMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEditMobile}
                  className="h-7 text-xs text-primary hover:bg-primary/10"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  {teacher.mobile ? "Update Phone" : "Set Phone Manually"}
                </Button>
              )}
            </h4>

            {editingMobile ? (
              <div className="flex items-center gap-2">
                <Input
                  value={mobileVal}
                  onChange={(e) => setMobileVal(e.target.value)}
                  placeholder="+91 98765 43210 or (555) 019-2834"
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleSaveMobile}
                  disabled={isSavingMobile}
                  className="h-9 text-xs"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMobile(false)}
                  className="h-9 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-medium text-foreground">
                    {teacher.mobile ? (
                      <span className="font-mono">{teacher.mobile}</span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        No phone number registered (option to set manually)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Official phone used for department communications and emergency notices.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email: {teacher.email || `${teacher.employee_id.toLowerCase()}@edutrack.edu`}
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                Login Enabled
              </span>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close Dossier
            </Button>

            {onEdit && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(teacher);
                }}
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                Edit Full Details
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
