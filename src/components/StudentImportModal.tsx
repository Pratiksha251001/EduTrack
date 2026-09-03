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
  Users,
  X,
} from "lucide-react";
import { localDb } from "../lib/supabase";
import { saveCredential } from "../lib/authUtils";
import {
  ParsedStudentRow,
  parseStudentSpreadsheet,
  downloadStudentExcelTemplate,
  downloadStudentCsvTemplate,
} from "../lib/studentExcelUtils";
import {
  sanitizeMobileInput,
  getMobileValidationError,
  cleanMobile,
  isValidEmail,
  isValid10DigitMobile,
} from "../lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

interface StudentImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId?: string;
  defaultSemester?: number;
  onImportComplete: (count: number) => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  open,
  onOpenChange,
  departmentId,
  defaultSemester = 1,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "valid" | "invalid">("all");
  const [isImporting, setIsImporting] = useState(false);

  // Portal Account & Password Strategy
  const [createAccounts, setCreateAccounts] = useState(true);
  const [passwordMode, setPasswordMode] = useState<"enrollment" | "custom">("enrollment");
  const [customPassword, setCustomPassword] = useState("Student@123");

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
      const parsedRows = await parseStudentSpreadsheet(file, defaultSemester);
      setRows(parsedRows);
    } catch (err: any) {
      setParseError(err.message || "Failed to process student spreadsheet.");
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
    field: keyof ParsedStudentRow,
    value: any
  ) => {
    setRows((prev) => {
      const next = [...prev];
      const sanitizedValue =
        field === "parent_mobile" || field === "student_mobile"
          ? sanitizeMobileInput(String(value || ""))
          : value;

      const row = { ...next[index], [field]: sanitizedValue };

      // Re-validate row
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!String(row.roll_number || "").trim()) {
        errors.push("Unique Enrollment / Roll Number is required.");
      } else {
        const normRoll = String(row.roll_number).trim().toLowerCase();
        const existingRoll = localDb.students.find(
          (s) => s.roll_number.trim().toLowerCase() === normRoll
        );
        if (existingRoll) {
          errors.push(`Enrollment '${row.roll_number}' already exists in institutional records.`);
        }
      }

      if (!String(row.full_name || "").trim()) {
        errors.push("Student Full Name is required.");
      }

      // 10-Digit Parent Mobile Validation
      const parentErr = getMobileValidationError(row.parent_mobile, "Parent Mobile", true);
      if (parentErr) {
        errors.push(parentErr);
      }

      // 10-Digit Student Mobile Validation
      if (row.student_mobile) {
        const studentErr = getMobileValidationError(row.student_mobile, "Student Mobile", false);
        if (studentErr) {
          warnings.push(studentErr);
        }
      }

      // Duplicate check between parent and student mobile
      const clParent = cleanMobile(row.parent_mobile);
      const clStudent = cleanMobile(row.student_mobile);
      if (clParent && clStudent && clParent === clStudent) {
        errors.push("Parent Mobile and Student Mobile cannot be identical.");
      }

      if (row.email && !isValidEmail(row.email)) {
        warnings.push(`Invalid email format '${row.email}'.`);
      }

      row.errors = errors;
      row.warnings = warnings;
      row.isValid = errors.length === 0;
      next[index] = row;
      return next;
    });
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  const displayedRows =
    activeTab === "all"
      ? rows
      : activeTab === "valid"
      ? validRows
      : invalidRows;

  const validCount = validRows.length;
  const invalidCount = invalidRows.length;

  const handleExecuteImport = async () => {
    if (validCount === 0) return;
    setIsImporting(true);

    try {
      for (const item of validRows) {
        const studentData = {
          roll_number: item.roll_number.trim(),
          reg_number: item.reg_number?.trim() || null,
          full_name: item.full_name.trim(),
          department_id: departmentId || null,
          semester: item.semester || defaultSemester || 1,
          parent_name: item.parent_name?.trim() || null,
          parent_mobile: item.parent_mobile.trim(),
          student_mobile: item.student_mobile?.trim() || null,
          email: item.email?.trim() || null,
          date_of_birth: item.date_of_birth || null,
          gender: item.gender || null,
          address: item.address?.trim() || null,
          status: "active" as const,
        };

        const insertedStudents = await localDb.insert("students", [studentData]);
        const student = insertedStudents[0];

        if (student && createAccounts) {
          // 2. Create user account
          const accountId = `student-user-${student.id}`;
          const effectiveEmail =
            item.email?.trim() ||
            `${item.roll_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.edutrack.edu`;

          await localDb.insert("users", [
            {
              id: accountId,
              full_name: student.full_name,
              email: effectiveEmail,
              role: "student",
              department_id: departmentId || null,
              student_id: student.id,
              roll_number: student.roll_number,
              status: "active",
            },
          ]);

          await localDb.update("students", student.id, { user_id: accountId });

          // 3. Save initial login password
          // Either enrollment/roll number OR custom password specified during import
          const pwd =
            passwordMode === "enrollment"
              ? (student.roll_number || "123")
              : (customPassword.trim() || student.roll_number || "123");

          saveCredential(
            [
              accountId,
              student.id,
              student.roll_number,
              student.reg_number,
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
      <DialogContent className="max-w-5xl border-border bg-card p-6 shadow-2xl rounded-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Class Roster & Enrollment Ingestion
              </p>
              <DialogTitle className="text-xl font-bold font-display mt-0.5">
                Import Multiple Students (Excel / CSV)
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Semester {defaultSemester} Roster
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* Format Specification Banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3.5 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                Required & Optional Student Data Fields
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadStudentExcelTemplate(defaultSemester)}
                  className="h-7 text-xs bg-card"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Excel Template (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadStudentCsvTemplate(defaultSemester)}
                  className="h-7 text-xs bg-card"
                >
                  <Download className="h-3.5 w-3.5 mr-1 text-primary" />
                  CSV Template (.csv)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground pt-1">
              <div>
                <span className="font-medium text-foreground">Mandatory:</span>{" "}
                <span className="font-semibold text-primary">Enrollment No / Roll No</span> (Unique key used as default portal password),{" "}
                <span className="font-semibold text-primary">Student Full Name</span>,{" "}
                <span className="font-semibold text-primary">Parent Mobile</span> (For automated SMS alerts).
              </div>
              <div>
                <span className="font-medium text-foreground">Optional:</span> University Reg No, Semester, Parent Name, Student Mobile, Student Email, Date of Birth (YYYY-MM-DD), Gender, Address.
              </div>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {isParsing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {fileName ? (
                    <span className="text-primary font-mono">{fileName}</span>
                  ) : (
                    "Click to upload or drag & drop student spreadsheet"
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Accepts Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
                </p>
              </div>
            </div>
          </div>

          {/* Parsing Errors */}
          {parseError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
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
                  Automatically generate student portal accounts upon import
                </span>
              </label>
              {createAccounts && (
                <span className="text-[11px] text-muted-foreground">
                  Students will use Enrollment Number or Email to sign in
                </span>
              )}
            </div>

            {createAccounts && (
              <div className="pt-2 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Default Initial Password Strategy:
                  </p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="studentPwdMode"
                        checked={passwordMode === "enrollment"}
                        onChange={() => setPasswordMode("enrollment")}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        Unique Enrollment / Roll Number{" "}
                        <span className="text-muted-foreground font-normal">(Default & Recommended)</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="studentPwdMode"
                        checked={passwordMode === "custom"}
                        onChange={() => setPasswordMode("custom")}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="font-medium">
                        Set Custom Initial Password for this import batch
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  {passwordMode === "enrollment" ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Enrollment Number as Password:
                      </span>
                      Each student’s portal account will be initially protected by their own unique Roll/Enrollment number (e.g. <code className="font-bold text-foreground font-mono">21CS101</code>). They will be prompted to change it upon first login.
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
                        placeholder="e.g. Student@123"
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        All imported students will initially use this password to sign in.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Table Preview and Tab Filters */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={activeTab === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("all")}
                    className="h-7 text-xs"
                  >
                    All Students ({rows.length})
                  </Button>
                  <Button
                    variant={activeTab === "valid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("valid")}
                    className="h-7 text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Ready to Import ({validCount})
                  </Button>
                  {invalidCount > 0 && (
                    <Button
                      variant={activeTab === "invalid" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("invalid")}
                      className="h-7 text-xs"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Has Issues ({invalidCount})
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Showing {displayedRows.length} row{displayedRows.length !== 1 ? "s" : ""} • Click any cell to edit
                </p>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-border overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 sticky top-0 z-10 border-b border-border">
                    <tr>
                      <th className="py-2 px-2.5 font-semibold text-muted-foreground w-10">#</th>
                      <th className="py-2 px-2.5 font-semibold text-foreground">Status</th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[130px]">
                        Enrollment / Roll No*
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[160px]">
                        Student Full Name*
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[130px]">
                        Parent Mobile*
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[120px]">
                        Student Mobile
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[100px]">
                        University Reg No
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[150px]">
                        Email
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[70px]">Sem</th>
                      <th className="py-2 px-2.5 font-semibold text-foreground min-w-[110px]">
                        Default Password
                      </th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {displayedRows.map((row) => {
                      const originalIndex = rows.findIndex(
                        (r) => r.rowNumber === row.rowNumber
                      );
                      const expectedPassword =
                        passwordMode === "enrollment"
                          ? row.roll_number || "—"
                          : customPassword || "—";

                      return (
                        <tr
                          key={row.rowNumber}
                          className={
                            !row.isValid
                              ? "bg-destructive/5 hover:bg-destructive/10"
                              : "hover:bg-muted/30"
                          }
                        >
                          <td className="py-1.5 px-2.5 text-muted-foreground font-mono">
                            {row.rowNumber}
                          </td>

                          {/* Status Badge & Tooltip */}
                          <td className="py-1.5 px-2.5">
                            {row.isValid ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                              >
                                Ready
                              </Badge>
                            ) : (
                              <span
                                title={row.errors.join("; ")}
                                className="cursor-help"
                              >
                                <Badge
                                  variant="destructive"
                                  className="text-[10px]"
                                >
                                  Error
                                </Badge>
                              </span>
                            )}
                          </td>

                          {/* Enrollment / Roll Number */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.roll_number}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "roll_number",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 21CS101"
                              className={`h-7 text-xs font-mono font-bold px-2 ${
                                !row.roll_number.trim()
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                            />
                            {row.errors.some((e) => e.includes("Enrollment")) && (
                              <p className="text-[10px] text-destructive mt-0.5">
                                {row.errors.find((e) => e.includes("Enrollment"))}
                              </p>
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
                              placeholder="Full Name"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Parent Mobile (Mandatory 10 digits) */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.parent_mobile}
                              maxLength={10}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "parent_mobile",
                                  e.target.value
                                )
                              }
                              placeholder="10 Digits"
                              className={`h-7 text-xs font-mono px-2 ${
                                !isValid10DigitMobile(row.parent_mobile)
                                  ? "border-destructive focus-visible:ring-destructive bg-destructive/10"
                                  : "border-emerald-500/50 bg-emerald-500/5"
                              }`}
                              title={
                                !isValid10DigitMobile(row.parent_mobile)
                                  ? "Must be exactly 10 digits starting with 6-9"
                                  : "Valid 10-digit mobile"
                              }
                            />
                          </td>

                          {/* Student Mobile (Optional 10 digits) */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.student_mobile}
                              maxLength={10}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "student_mobile",
                                  e.target.value
                                )
                              }
                              placeholder="10 Digits (Opt)"
                              className={`h-7 text-xs font-mono px-2 ${
                                row.student_mobile && !isValid10DigitMobile(row.student_mobile)
                                  ? "border-destructive focus-visible:ring-destructive bg-destructive/10"
                                  : ""
                              }`}
                              title={
                                row.student_mobile && !isValid10DigitMobile(row.student_mobile)
                                  ? "Must be exactly 10 digits if provided"
                                  : ""
                              }
                            />
                          </td>

                          {/* Reg Number */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.reg_number}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "reg_number",
                                  e.target.value
                                )
                              }
                              placeholder="REG-No"
                              className="h-7 text-xs font-mono px-2"
                            />
                          </td>

                          {/* Email */}
                          <td className="py-1.5 px-2">
                            <Input
                              value={row.email}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "email",
                                  e.target.value
                                )
                              }
                              placeholder="Auto-generated if empty"
                              className="h-7 text-xs px-2"
                            />
                          </td>

                          {/* Semester */}
                          <td className="py-1.5 px-2">
                            <Input
                              type="number"
                              value={row.semester}
                              onChange={(e) =>
                                handleCellChange(
                                  originalIndex,
                                  "semester",
                                  parseInt(e.target.value, 10) || defaultSemester
                                )
                              }
                              className="h-7 text-xs px-1 w-14 text-center font-mono"
                            />
                          </td>

                          {/* Default Password Preview */}
                          <td className="py-1.5 px-2">
                            <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border block text-center truncate">
                              {expectedPassword}
                            </span>
                          </td>

                          {/* Delete Row */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(originalIndex)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Remove row"
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
                  Tip: You can edit roll numbers, names, and phone numbers directly in the table before importing.
                </span>
                {createAccounts && (
                  <span>
                    Initial Password:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {passwordMode === "enrollment"
                        ? "Student's Unique Enrollment Number"
                        : customPassword}
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
                    Importing {validCount} Students...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Confirm & Import {validCount} Student{validCount !== 1 ? "s" : ""}
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
