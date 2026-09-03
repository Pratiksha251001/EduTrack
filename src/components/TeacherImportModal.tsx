import React, { useState, useRef } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  KeyRound,
  Loader2,
  Lock,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { Department } from "../lib/types";
import { localDb } from "../lib/supabase";
import { saveCredential } from "../lib/authUtils";
import {
  ParsedTeacherRow,
  parseTeacherSpreadsheet,
  downloadTeacherExcelTemplate,
  downloadTeacherCsvTemplate,
} from "../lib/teacherExcelUtils";
import {
  sanitizeMobileInput,
  getMobileValidationError,
  isValid10DigitMobile,
  isValidEmail,
  getEmployeeIdValidationError,
} from "../lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

interface TeacherImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department;
  onImportComplete: (count: number) => void;
}

export const TeacherImportModal: React.FC<TeacherImportModalProps> = ({
  open,
  onOpenChange,
  department,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedTeacherRow[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "valid" | "errors">("all");
  const [isImporting, setIsImporting] = useState(false);
  const [createAccounts, setCreateAccounts] = useState(true);
  const [passwordMode, setPasswordMode] = useState<"empid" | "custom">("empid");
  const [customPassword, setCustomPassword] = useState("Teacher@123");

  const resetState = () => {
    setFileName(null);
    setParseError(null);
    setRows([]);
    setActiveTab("all");
    setIsParsing(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileProcess = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);

    try {
      const parsedRows = await parseTeacherSpreadsheet(
        file,
        department?.name || "Department Faculty"
      );
      setRows(parsedRows);
    } catch (err: any) {
      setParseError(err.message || "Failed to process spreadsheet file.");
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleCellChange = (
    index: number,
    field: keyof ParsedTeacherRow,
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      const sanitizedValue =
        field === "mobile" ? sanitizeMobileInput(value) : value;
      const row = { ...next[index], [field]: sanitizedValue };

      // Re-validate row
      const errors: string[] = [];
      if (!row.full_name.trim()) errors.push("Teacher Full Name is required");
      if (!row.employee_id.trim()) {
        errors.push("College Employee ID Reference No is required");
      } else {
        const empErr = getEmployeeIdValidationError(row.employee_id);
        if (empErr) {
          errors.push(empErr);
        }
        const normEmp = row.employee_id.trim().toLowerCase();
        const existingEmp = localDb.teachers.find(
          (t) => t.employee_id.trim().toLowerCase() === normEmp
        );
        if (existingEmp) {
          errors.push(`Employee ID "${row.employee_id}" already exists in system`);
        }
      }

      // 10-Digit Mobile Validation
      if (row.mobile) {
        const mobileErr = getMobileValidationError(row.mobile, "Mobile number", false);
        if (mobileErr) {
          errors.push(mobileErr);
        }
      }

      // Email Validation
      if (row.email && !isValidEmail(row.email)) {
        errors.push(`Invalid email format "${row.email}"`);
      }

      row.errors = errors;
      row.isValid = errors.length === 0;
      next[index] = row;
      return next;
    });
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.length - validCount;

  const filteredRows = rows.filter((r) => {
    if (activeTab === "valid") return r.isValid;
    if (activeTab === "errors") return !r.isValid;
    return true;
  });

  const handleExecuteImport = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("No valid teacher records to import. Please correct errors first.");
      return;
    }

    setIsImporting(true);
    const departmentId = department?.id || "dept-1";

    try {
      for (const item of validRows) {
        const isCoordinator = item.role === "class_coordinator";

        // 1. Insert teacher record
        const teacherData = {
          employee_id: item.employee_id.trim(),
          full_name: item.full_name.trim(),
          email: item.email.trim() || null,
          mobile: item.mobile.trim() || null, // Optional phone
          designation: item.designation.trim() || "Assistant Professor",
          department_id: departmentId,
          qualification: item.qualification.trim() || null,
          date_of_birth: item.date_of_birth.trim() || null,
          experience_years: item.experience_years.trim() || null,
          role: item.role,
          is_class_coordinator: isCoordinator,
          status: "active" as const,
        };

        const insertedTeachers = await localDb.insert("teachers", [teacherData]);
        const teacher = insertedTeachers[0];

        if (teacher && createAccounts) {
          // 2. Create user account
          const accountId = `teacher-user-${teacher.id}`;
          const effectiveEmail =
            item.email.trim() ||
            `${item.employee_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@edutrack.edu`;

          await localDb.insert("users", [
            {
              id: accountId,
              full_name: teacher.full_name,
              email: effectiveEmail,
              role: isCoordinator ? "class_coordinator" : "teacher",
              department_id: departmentId,
              teacher_id: teacher.id,
              employee_id: teacher.employee_id,
              status: "active",
            },
          ]);

          await localDb.update("teachers", teacher.id, { user_id: accountId });

          // 3. Save default password credential (Employee ID or custom password)
          const pwd =
            passwordMode === "empid"
              ? (teacher.employee_id || "Teacher@123")
              : (customPassword.trim() || teacher.employee_id || "Teacher@123");
          saveCredential(
            [
              accountId,
              teacher.id,
              teacher.employee_id,
              effectiveEmail,
            ],
            pwd
          );
        }
      }

      onImportComplete(validRows.length);
      resetState();
      onOpenChange(false);
    } catch (err: any) {
      alert(`Import failed: ${err.message || "An unknown error occurred"}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border bg-card p-6 shadow-2xl rounded-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Bulk Faculty Management
              </p>
              <DialogTitle className="text-xl font-bold font-display mt-0.5">
                Import Multiple Teachers (Excel / CSV)
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {department?.name || "Department Staff"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1">
          {/* Format Specification Banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                Required & Optional Data Format Specification
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTeacherExcelTemplate(department?.name)}
                  className="h-7 text-xs bg-card"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Excel Template (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTeacherCsvTemplate(department?.name)}
                  className="h-7 text-xs bg-card"
                >
                  <Download className="h-3.5 w-3.5 mr-1 text-primary" />
                  CSV Template (.csv)
                </Button>
              </div>
            </div>

            <p className="text-muted-foreground text-[11px]">
              The spreadsheet header must include the following column attributes:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">Full Name *</p>
                <p className="text-muted-foreground text-[10px]">Required identifier</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">Designation</p>
                <p className="text-muted-foreground text-[10px]">Prof / Asst Prof / Lect</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">Department</p>
                <p className="text-muted-foreground text-[10px]">{department?.code || "CSE"} or full name</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">Qualification</p>
                <p className="text-muted-foreground text-[10px]">Ph.D, M.Tech, M.Sc, etc</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">College Emp ID *</p>
                <p className="text-muted-foreground text-[10px]">Reference No (e.g. EMP102)</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">Date of Birth</p>
                <p className="text-muted-foreground text-[10px]">YYYY-MM-DD or standard</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">Year of Experience</p>
                <p className="text-muted-foreground text-[10px]">e.g. 8 Years or 8</p>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/60">
                <p className="font-bold text-foreground font-sans">Phone (Optional)</p>
                <p className="text-muted-foreground text-[10px]">Option to set manually</p>
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          {rows.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  {isParsing ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <Upload className="h-7 w-7" />
                  )}
                </div>

                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {isParsing
                      ? "Analyzing spreadsheet and validating rows..."
                      : "Drag & drop your Excel or CSV file here, or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                  </p>
                </div>

                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    .xlsx
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    .xls
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    .csv
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            /* File loaded bar */
            <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {rows.length} total rows detected · {validCount} valid · {invalidCount} issues
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetState}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Upload Different File
                </Button>
              </div>
            </div>
          )}

          {/* Parse Error Alert */}
          {parseError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error reading file</p>
                <p className="mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* Account Creation & Password Configuration Settings */}
          <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccounts}
                  onChange={(e) => setCreateAccounts(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Automatically generate faculty portal accounts upon import
                </span>
              </label>
              {createAccounts && (
                <span className="text-[11px] text-muted-foreground">
                  Faculty will use College Employee ID or Email to sign in
                </span>
              )}
            </div>

            {createAccounts && (
              <div className="pt-2 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Default Faculty Initial Password Strategy:
                  </p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="teacherPwdMode"
                        checked={passwordMode === "empid"}
                        onChange={() => setPasswordMode("empid")}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        Unique College Employee ID Ref No{" "}
                        <span className="text-muted-foreground font-normal">(Default & Recommended)</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="teacherPwdMode"
                        checked={passwordMode === "custom"}
                        onChange={() => setPasswordMode("custom")}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        Set Custom Password for all imported faculty
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  {passwordMode === "empid" ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Employee ID as Default Password:
                      </span>
                      Each teacher’s portal account will initially use their assigned Employee ID Ref No (e.g. <code className="font-bold text-foreground font-mono">EMP-CSE-01</code>). They will be prompted to set a private password on first login.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground block">
                        Custom Batch Password:
                      </label>
                      <Input
                        type="text"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="e.g. Teacher@123"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        All imported teachers will initially use this password to sign in.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Preview Table */}
          {rows.length > 0 && (
            <div className="space-y-3">
              {/* Tab Filters & Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeTab === "all"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Rows ({rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("valid")}
                    className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      activeTab === "valid"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Valid ({validCount})
                  </button>
                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("errors")}
                      className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                        activeTab === "errors"
                          ? "bg-card text-destructive shadow-xs"
                          : "text-destructive/80 hover:text-destructive"
                      }`}
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      Attention Needed ({invalidCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={createAccounts}
                      onChange={(e) => setCreateAccounts(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span>Auto-create Login Accounts</span>
                  </label>
                </div>
              </div>

              {/* Editable Spreadsheet Table Container */}
              <div className="border border-border rounded-xl overflow-hidden overflow-x-auto max-h-[380px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground text-[11px] uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Full Name *</th>
                      <th className="py-2.5 px-3 min-w-[130px]">College Emp ID *</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Designation</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Qualification</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Date of Birth</th>
                      <th className="py-2.5 px-3 min-w-[100px]">Experience</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Phone (Opt)</th>
                      <th className="py-2.5 px-3 w-12 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.map((row, idx) => {
                      const originalIndex = rows.findIndex(
                        (r) => r.rowNumber === row.rowNumber
                      );
                      return (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-muted/30 transition-colors ${
                            !row.isValid ? "bg-destructive/5" : ""
                          }`}
                        >
                          <td className="py-2 px-2 text-center font-mono text-[11px]">
                            {row.isValid ? (
                              <span className="text-emerald-500 font-bold">✓</span>
                            ) : (
                              <span
                                className="text-destructive font-bold cursor-help"
                                title={row.errors.join(", ")}
                              >
                                !
                              </span>
                            )}
                          </td>

                          {/* Full Name */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.full_name}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "full_name",
                                  e.target.value
                                )
                              }
                              placeholder="Required full name"
                              className={`h-7 text-xs px-2 ${
                                !row.full_name.trim()
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                            />
                          </td>

                          {/* College Employee ID Reference No */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.employee_id}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "employee_id",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. EMP-105"
                              className={`h-7 text-xs px-2 font-mono ${
                                !row.employee_id.trim() ||
                                row.errors.some((e) => e.includes("Employee ID"))
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                            />
                          </td>

                          {/* Designation */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.designation}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "designation",
                                  e.target.value
                                )
                              }
                              placeholder="Asst Professor"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Qualification */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.qualification}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "qualification",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. Ph.D, M.Tech"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Date of Birth */}
                          <td className="py-1.5 px-2">
                            <Input
                              type="text"
                              value={row.date_of_birth}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "date_of_birth",
                                  e.target.value
                                )
                              }
                              placeholder="YYYY-MM-DD"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Year of Experience */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.experience_years}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "experience_years",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 5 Years"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Phone / Mobile (Optional 10 digits) */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.mobile}
                              maxLength={10}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "mobile",
                                  e.target.value
                                )
                              }
                              placeholder="10 Digits (Opt)"
                              className={`h-7 text-xs px-2 font-mono ${
                                row.mobile && !isValid10DigitMobile(row.mobile)
                                  ? "border-destructive focus-visible:ring-destructive bg-destructive/10"
                                  : ""
                              }`}
                              title={
                                row.mobile && !isValid10DigitMobile(row.mobile)
                                  ? "Must be exactly 10 digits if provided"
                                  : ""
                              }
                            />
                          </td>

                          {/* Delete Action */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(originalIndex)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Status footer with row remarks */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>
                  Tip: You can correct any cell directly in the table before completing the import.
                </span>
                {createAccounts && (
                  <span>
                    Default login password will be set to:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {passwordMode === "empid" ? "Faculty Employee ID" : customPassword}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Controls */}
        <div className="pt-3 border-t border-border/60 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 justify-end">
            {rows.length > 0 && (
              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={validCount === 0 || isImporting}
                className="bg-primary text-primary-foreground font-medium shadow-xs"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing {validCount} Teachers...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Confirm & Import {validCount} Teacher{validCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
