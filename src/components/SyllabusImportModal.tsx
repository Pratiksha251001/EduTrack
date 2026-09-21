import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  School,
  Building,
  Check,
  Calendar,
  Sparkles,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select } from './ui/select';
import { localDb } from '../lib/supabase';
import {
  ParsedSyllabusSubject,
  SyllabusMetadata,
  parseSyllabusRawText,
  extractTextFromPdfFile,
  getDefaultSyllabusForYearAndSem,
} from '../lib/syllabusParser';
import {
  ENGINEERING_YEARS,
  getEngineeringYearCode,
} from '../lib/engineeringUtils';

interface SyllabusImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartmentId?: string;
  onImportComplete?: (count: number) => void;
}

export const SyllabusImportModal: React.FC<SyllabusImportModalProps> = ({
  open,
  onOpenChange,
  defaultDepartmentId,
  onImportComplete,
}) => {
  const departments = localDb.departments;
  const teachers = localDb.teachers;

  // 1. Mandatory Year, Semester, and Department selections
  const [selectedYear, setSelectedYear] = useState<number>(4); // Default to BE (4th year)
  const [selectedSemester, setSelectedSemester] = useState<string>('7'); // Default to Sem 7
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    defaultDepartmentId || departments[0]?.id || ''
  );

  // Available semesters for the chosen year
  const yearSemesters = useMemo(() => {
    const yInfo = ENGINEERING_YEARS.find((y) => y.year === selectedYear);
    return yInfo ? yInfo.semesters : [selectedYear * 2 - 1, selectedYear * 2];
  }, [selectedYear]);

  // If user changes year, make sure semester is valid
  useEffect(() => {
    if (selectedSemester !== 'all' && !yearSemesters.includes(Number(selectedSemester))) {
      setSelectedSemester(String(yearSemesters[0]));
    }
  }, [yearSemesters, selectedSemester]);

  // 2. Upload and Parsing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [rawUploadedText, setRawUploadedText] = useState<string | null>(null);

  // 3. Current Parsed Subjects for the specific Year & Semester
  const [subjectsList, setSubjectsList] = useState<ParsedSyllabusSubject[]>(() =>
    getDefaultSyllabusForYearAndSem(4, 7, defaultDepartmentId || departments[0]?.id || '')
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-fetch / filter subjects whenever Year, Semester, or Dept changes
  useEffect(() => {
    if (rawUploadedText) {
      // If user had uploaded a PDF, re-parse for the newly chosen Year/Sem
      const targetSem = selectedSemester === 'all' ? 'all' : Number(selectedSemester);
      const res = parseSyllabusRawText(rawUploadedText, selectedYear, targetSem, selectedDeptId);
      setSubjectsList(
        res.subjects.map((s) => ({
          ...s,
          department_id: selectedDeptId,
          selected: true,
        }))
      );
    } else {
      // Load standard curriculum for the chosen Year and Semester
      const targetSem = selectedSemester === 'all' ? 'all' : Number(selectedSemester);
      const list = getDefaultSyllabusForYearAndSem(selectedYear, targetSem, selectedDeptId);
      setSubjectsList(list);
    }
    setError(null);
  }, [selectedYear, selectedSemester, selectedDeptId, rawUploadedText]);

  // Handle PDF file upload
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      const extractedText = await extractTextFromPdfFile(file);
      setRawUploadedText(extractedText);

      const targetSem = selectedSemester === 'all' ? 'all' : Number(selectedSemester);
      const result = parseSyllabusRawText(extractedText, selectedYear, targetSem, selectedDeptId);

      setSubjectsList(
        result.subjects.map((s) => ({
          ...s,
          department_id: selectedDeptId,
          selected: true,
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Unable to parse syllabus file. Please verify the PDF format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToUniversityDefault = () => {
    setUploadedFileName(null);
    setRawUploadedText(null);
    const targetSem = selectedSemester === 'all' ? 'all' : Number(selectedSemester);
    const list = getDefaultSyllabusForYearAndSem(selectedYear, targetSem, selectedDeptId);
    setSubjectsList(list);
    setError(null);
  };

  // Toggle single subject selection
  const handleToggleSelect = (index: number) => {
    setSubjectsList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  // Toggle all
  const handleToggleSelectAll = (select: boolean) => {
    setSubjectsList((prev) => prev.map((s) => ({ ...s, selected: select })));
  };

  // Assign faculty inline
  const handleAssignTeacher = (index: number, teacherId: string) => {
    setSubjectsList((prev) =>
      prev.map((s, i) => (i === index ? { ...s, assigned_teacher_id: teacherId } : s))
    );
  };

  const selectedCount = subjectsList.filter((s) => s.selected).length;
  const totalCredits = subjectsList
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + (s.credits || 0), 0);

  const yearLabel = useMemo(() => {
    const yInfo = ENGINEERING_YEARS.find((y) => y.year === selectedYear);
    return yInfo ? yInfo.fullName : `Year ${selectedYear}`;
  }, [selectedYear]);

  const semLabel = selectedSemester === 'all' ? `Sem ${yearSemesters.join(' & ')}` : `Semester ${selectedSemester}`;

  // Execute Import
  const handleExecuteImport = () => {
    const toImport = subjectsList.filter((s) => s.selected);
    if (toImport.length === 0) {
      setError('Please select at least one subject to import.');
      return;
    }

    try {
      let addedCount = 0;
      toImport.forEach((sub) => {
        const newSubjectId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Check if subject code already exists in dept
        const existingIdx = localDb.subjects.findIndex(
          (s) =>
            s.code.toLowerCase() === sub.code.toLowerCase() &&
            s.department_id === (sub.department_id || selectedDeptId)
        );

        if (existingIdx >= 0) {
          // Update existing
          localDb.subjects[existingIdx] = {
            ...localDb.subjects[existingIdx],
            name: sub.name,
            semester: sub.semester,
            year: sub.year,
            credits: sub.credits,
          };
        } else {
          // Insert new
          localDb.subjects.push({
            id: newSubjectId,
            code: sub.code,
            name: sub.name,
            department_id: sub.department_id || selectedDeptId,
            year: sub.year,
            semester: sub.semester,
            credits: sub.credits,
            created_at: new Date().toISOString(),
          });
          addedCount++;
        }

        // If a teacher was assigned, map to teacher_subjects
        if (sub.assigned_teacher_id) {
          const subjectRecordId = existingIdx >= 0 ? localDb.subjects[existingIdx].id : newSubjectId;
          const alreadyMapped = localDb.teacher_subjects.some(
            (ts) => ts.teacher_id === sub.assigned_teacher_id && ts.subject_id === subjectRecordId
          );
          if (!alreadyMapped) {
            localDb.teacher_subjects.push({
              id: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              teacher_id: sub.assigned_teacher_id,
              subject_id: subjectRecordId,
            });
          }
        }
      });

      // Notify database listeners
      window.dispatchEvent(new CustomEvent('localDbUpdate', { detail: { table: 'subjects' } }));
      window.dispatchEvent(new CustomEvent('localDbUpdate', { detail: { table: 'teacher_subjects' } }));

      setSuccessMessage(`✓ Successfully imported ${toImport.length} subjects for ${yearLabel} (${semLabel})!`);

      if (onImportComplete) {
        onImportComplete(toImport.length);
      }

      setTimeout(() => {
        onOpenChange(false);
        setSuccessMessage(null);
      }, 1300);
    } catch (err: any) {
      setError(err.message || 'Error importing subjects into database.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 pb-3.5 border-b border-border bg-card/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Import Syllabus & Curriculum
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    {getEngineeringYearCode(selectedYear)} • {semLabel}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your Engineering Year and Semester, upload your syllabus PDF, and import courses.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 1: Required Scope Selectors (Year, Semester, Department) */}
          <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <School className="h-3.5 w-3.5 text-primary" /> Step 1: Select Year & Semester
              </span>
              <span className="text-[11px] text-muted-foreground">
                Filtered strictly to target curriculum
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Engineering Year */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Engineering Year *
                </label>
                <Select
                  value={String(selectedYear)}
                  onChange={(e) => {
                    const yr = Number(e.target.value);
                    setSelectedYear(yr);
                    // Set default semester for new year
                    setSelectedSemester(String(yr * 2 - 1));
                  }}
                  options={ENGINEERING_YEARS.map((y) => ({
                    value: String(y.year),
                    label: `${y.name} (${y.code})`,
                  }))}
                />
              </div>

              {/* Semester within Year */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Semester *
                </label>
                <Select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  options={[
                    ...yearSemesters.map((s) => ({
                      value: String(s),
                      label: `Semester ${s}`,
                    })),
                    { value: 'all', label: `Both Semesters (${yearSemesters.join(' & ')})` },
                  ]}
                />
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Department
                </label>
                <Select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Syllabus PDF Upload or Solapur Univ Preset */}
          <div className="p-4 bg-card rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> Step 2: Syllabus Document / PDF
              </span>

              {uploadedFileName ? (
                <button
                  type="button"
                  onClick={handleResetToUniversityDefault}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="h-3 w-3" /> Reset to Univ Preset
                </button>
              ) : (
                <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">
                  <Sparkles className="mr-1 h-3 w-3 text-amber-500" /> Solapur Univ Scheme Active
                </Badge>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            {/* Clean, compact drag/drop or click zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2 text-xs text-primary font-medium py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting subjects for {yearLabel} ({semLabel})...
                </div>
              ) : uploadedFileName ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground py-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>PDF Loaded: <span className="text-primary underline">{uploadedFileName}</span></span>
                  <span className="text-xs text-muted-foreground font-normal">(Click to change file)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground">
                    <Upload className="h-4 w-4 text-primary" />
                    <span>Upload Syllabus PDF (.pdf or .txt)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Auto-extracts course codes, titles, and credits for {getEngineeringYearCode(selectedYear)} {semLabel}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 3: Subjects List for the Selected Year & Semester */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">
                  Subjects for {yearLabel} • {semLabel}
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {subjectsList.length} Found
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(false)}
                  className="text-muted-foreground hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Streamlined Subjects Cards / List */}
            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
              {subjectsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No courses found for this year & semester in the syllabus document.
                </div>
              ) : (
                subjectsList.map((subject, idx) => (
                  <div
                    key={`${subject.code}-${idx}`}
                    className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      subject.selected ? 'bg-primary/5' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!subject.selected}
                        onChange={() => handleToggleSelect(idx)}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded border border-border">
                            {subject.code}
                          </span>
                          <span className="font-semibold text-xs text-foreground">
                            {subject.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            Sem {subject.semester}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {subject.credits} Credits
                          </Badge>
                          <span className="capitalize">{subject.category} Course</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Faculty Assignment */}
                    <div className="sm:w-56 shrink-0">
                      <Select
                        value={subject.assigned_teacher_id || ''}
                        onChange={(e) => handleAssignTeacher(idx, e.target.value)}
                        options={[
                          { value: '', label: 'Assign Faculty (Optional)' },
                          ...teachers.map((t) => ({
                            value: t.id,
                            label: `${t.full_name} (${t.designation || 'Faculty'})`,
                          })),
                        ]}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer with Summary & Big Import Action */}
        <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-foreground">
              {selectedCount} of {subjectsList.length} subjects selected
            </span>
            <span className="text-muted-foreground ml-1.5">
              ({totalCredits} Total Credits) for {getEngineeringYearCode(selectedYear)} {semLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteImport}
              disabled={selectedCount === 0}
              className="font-semibold shadow-sm"
            >
              <Check className="mr-1.5 h-4 w-4" /> Import {selectedCount} Subjects
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
