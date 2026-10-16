import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Check,
  X,
  Send,
  AlertCircle,
  Save,
  Loader2,
  Globe,
  Copy,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Users,
  Layers,
  Sparkles,
} from "lucide-react";
import { localDb } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  college,
  generateSmsMessage,
  generateEmailAlertContent,
  generateWhatsAppMessage,
  SMS_LANGUAGES,
  getParentWhatsAppUrl,
  ENGINEERING_YEARS,
} from "../lib/college";
import { sendEmailAlert } from "../lib/emailService";
import { SmsLanguage, Student, Subject, AcademicClass, AlertChannel } from "../lib/types";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { DatePicker } from "../components/ui/date-picker";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { AttendanceVerificationModal } from "../components/AttendanceVerificationModal";
import { AttendanceDispatchReceiptModal } from "../components/AttendanceDispatchReceiptModal";
import { recordAttendanceSubmittedNotification } from "../lib/notificationService";
import { dispatchSmsViaGateway } from "../lib/smsService";

export const Attendance: React.FC = () => {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSubjectId = searchParams.get("subject_id") || "";
  const urlClassName = searchParams.get("class_name") || "";

  const teacherId = user?.teacher_id || user?.id;

  // All teaching assignments for this faculty across any class / subject
  const myTeachingAssignments = useMemo(() => {
    return localDb.teacher_subjects.filter(
      (ts) => ts.teacher_id === teacherId || ts.teacher_id === user?.id,
    );
  }, [teacherId, user]);

  const subjects = useMemo(() => {
    return localDb.subjects.filter((subject) => {
      if (role === "admin") return true;
      if (role === "hod") {
        return (
          !user?.department_id || subject.department_id === user.department_id
        );
      }
      if (role === "class_coordinator") {
        const teacherRec = localDb.teachers.find(
          (t) =>
            t.id === user?.teacher_id ||
            (user?.email &&
              t.email?.toLowerCase() === user.email.toLowerCase()) ||
            (user?.employee_id && t.employee_id === user.employee_id) ||
            (t.is_class_coordinator && t.department_id === user?.department_id),
        );
        const coordSem =
          teacherRec?.assigned_semester || user?.assigned_semester || 5;
        const deptId = user?.department_id || teacherRec?.department_id;
        const isClassSubject =
          (!deptId || subject.department_id === deptId) &&
          subject.semester === coordSem;
        const isMyTeachingSubject =
          localDb.teacher_subjects.some(
            (ts) =>
              (ts.teacher_id === user?.teacher_id ||
                ts.teacher_id === user?.id) &&
              ts.subject_id === subject.id,
          ) ||
          (subject as any).teacher_id === user?.teacher_id ||
          (subject as any).teacher_id === user?.id;
        return isClassSubject || isMyTeachingSubject;
      }
      if (role === "teacher") {
        const isAssigned =
          localDb.teacher_subjects.some(
            (ts) => ts.teacher_id === teacherId && ts.subject_id === subject.id,
          ) || (subject as any).teacher_id === teacherId;
        // If teacher has assigned subjects, restrict strictly to assigned
        const anyAssigned =
          localDb.teacher_subjects.some((ts) => ts.teacher_id === teacherId) ||
          localDb.subjects.some((s) => (s as any).teacher_id === teacherId);
        if (anyAssigned) return isAssigned;
        return (
          !user?.department_id || subject.department_id === user.department_id
        );
      }
      return (
        !user?.department_id || subject.department_id === user.department_id
      );
    });
  }, [role, user, teacherId]);

  const [students, setStudents] = useState(() => localDb.students);
  const academicClasses = localDb.academic_classes;

  React.useEffect(() => {
    const refreshStudents = (event: Event) => {
      const customEvent = event as CustomEvent<{ table?: string }>;
      if (
        !customEvent.detail?.table ||
        customEvent.detail.table === "students"
      ) {
        setStudents([...localDb.students]);
      }
    };
    window.addEventListener("edutrack_data_updated", refreshStudents);
    window.addEventListener("storage", refreshStudents);
    return () => {
      window.removeEventListener("edutrack_data_updated", refreshStudents);
      window.removeEventListener("storage", refreshStudents);
    };
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (urlSubjectId && subjects.some((s) => s.id === urlSubjectId)) {
      return urlSubjectId;
    }
    return subjects[0]?.id || "";
  });
  const [selectedClassName, setSelectedClassName] = useState<string>(
    urlClassName || "all",
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [smsLanguage, setSmsLanguage] = useState<SmsLanguage>("en");
  const [attendanceState, setAttendanceState] = useState<
    Record<string, "present" | "absent">
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [lastDispatched, setLastDispatched] = useState<{
    subject?: (typeof subjects)[0];
    className?: string;
    date: string;
    totalPresent: number;
    recipients: Array<{
      student: Student;
      status: "sent" | "failed";
      message: string;
    }>;
    language: SmsLanguage;
  }>({
    subject: undefined,
    className: undefined,
    date: todayStr,
    totalPresent: 0,
    recipients: [],
    language: "en",
  });

  // Filter subjects by year if selected
  const filteredSubjects = useMemo(() => {
    if (selectedYearFilter === "all") return subjects;
    const yearNum = Number(selectedYearFilter);
    return subjects.filter((s) => {
      if (s.year) return s.year === yearNum;
      // Calculate year from semester (Sem 1-2 = Yr 1, Sem 3-4 = Yr 2, Sem 5-6 = Yr 3, Sem 7-8 = Yr 4)
      return Math.ceil(s.semester / 2) === yearNum;
    });
  }, [subjects, selectedYearFilter]);

  // Keep selectedSubjectId valid if filteredSubjects changes
  React.useEffect(() => {
    if (
      filteredSubjects.length > 0 &&
      !filteredSubjects.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId(filteredSubjects[0].id);
    }
  }, [filteredSubjects, selectedSubjectId]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const attendanceDepartmentId =
    selectedSubject?.department_id || user?.department_id || undefined;

  // Determine available classes / divisions for the selected subject
  const availableClasses = useMemo(() => {
    if (!selectedSubject) return [];

    // Classes registered for this semester & department
    const deptClasses = academicClasses.filter(
      (c) =>
        c.semester === selectedSubject.semester &&
        (!selectedSubject.department_id ||
          c.department_id === selectedSubject.department_id),
    );

    // Also classes assigned in teacher_subjects for this subject
    const tsClasses = localDb.teacher_subjects
      .filter((ts) => ts.subject_id === selectedSubject.id && ts.class_name)
      .map((ts) => ts.class_name as string);

    // Merge unique class names
    const classNames = new Set<string>();
    deptClasses.forEach((c) => classNames.add(c.name));
    tsClasses.forEach((cn) => classNames.add(cn));

    // Also inspect students enrolled in this semester
    students.forEach((st) => {
      if (
        st.semester === selectedSubject.semester &&
        st.class_name &&
        (!attendanceDepartmentId || st.department_id === attendanceDepartmentId)
      ) {
        classNames.add(st.class_name);
      }
    });

    return Array.from(classNames).sort();
  }, [selectedSubject, academicClasses, students, attendanceDepartmentId]);

  // Find classes assigned to this faculty for this subject
  const myAssignedClassesForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    return myTeachingAssignments
      .filter((ts) => ts.subject_id === selectedSubject.id && ts.class_name)
      .map((ts) => ts.class_name as string);
  }, [selectedSubject, myTeachingAssignments]);

  // Auto-select preferred class if available
  React.useEffect(() => {
    if (urlClassName && availableClasses.includes(urlClassName)) {
      setSelectedClassName(urlClassName);
    } else if (
      selectedClassName === "all" &&
      myAssignedClassesForSubject.length === 1 &&
      availableClasses.includes(myAssignedClassesForSubject[0])
    ) {
      setSelectedClassName(myAssignedClassesForSubject[0]);
    } else if (
      selectedClassName !== "all" &&
      !availableClasses.includes(selectedClassName)
    ) {
      setSelectedClassName("all");
    }
  }, [urlClassName, availableClasses, myAssignedClassesForSubject]);

  // Cohort students filtered by Semester AND Target Class / Division
  const cohortStudents = useMemo(() => {
    if (!selectedSubject) return [];

    let list = students.filter(
      (st) =>
        st.status === "active" &&
        st.semester === selectedSubject.semester &&
        (!attendanceDepartmentId || st.department_id === attendanceDepartmentId),
    );

    if (selectedClassName && selectedClassName !== "all") {
      const filtered = list.filter((st) => {
        if (st.class_name) return st.class_name === selectedClassName;
        const matchedClass = academicClasses.find(
          (c) => c.name === selectedClassName || c.id === selectedClassName,
        );
        if (matchedClass && st.class_id === matchedClass.id) return true;
        return st.section === selectedClassName;
      });
      list = filtered;
    }

    return list;
  }, [students, selectedSubject, selectedClassName, academicClasses, attendanceDepartmentId]);

  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return cohortStudents;
    const q = searchQuery.toLowerCase().trim();
    return cohortStudents.filter(
      (st) =>
        st.full_name.toLowerCase().includes(q) ||
        st.roll_number.toLowerCase().includes(q) ||
        (st.class_name && st.class_name.toLowerCase().includes(q)) ||
        (st.parent_name && st.parent_name.toLowerCase().includes(q)),
    );
  }, [cohortStudents, searchQuery]);

  React.useEffect(() => {
    const existing = localDb.attendance.filter((a) => {
      if (a.subject_id !== selectedSubjectId || a.date !== selectedDate)
        return false;
      if (
        selectedClassName !== "all" &&
        a.class_name &&
        a.class_name !== selectedClassName
      ) {
        return false;
      }
      return true;
    });

    const map: Record<string, "present" | "absent"> = {};
    cohortStudents.forEach((st) => {
      const rec = existing.find((r) => r.student_id === st.id);
      map[st.id] = rec ? rec.status : "present";
    });
    setAttendanceState(map);
  }, [selectedSubjectId, selectedDate, selectedClassName, cohortStudents]);

  const markAll = (status: "present" | "absent") => {
    const next: Record<string, "present" | "absent"> = {};
    cohortStudents.forEach((st) => (next[st.id] = status));
    setAttendanceState(next);
  };

  const toggleStudent = (id: string, status: "present" | "absent") => {
    setAttendanceState((prev) => ({ ...prev, [id]: status }));
  };

  const absentees = cohortStudents.filter(
    (st) => (attendanceState[st.id] || "present") === "absent",
  );

  const handleConfirmSubmission = async (
    chosenLang: SmsLanguage,
    targetMode: "absent_only" | "present_only" | "both" = "absent_only",
    channels: AlertChannel[] = ["sms", "email"],
  ) => {
    if (!selectedSubject) return;
    setSaving(true);

    const classLabel = selectedClassName !== "all" ? selectedClassName : null;

    const records = cohortStudents.map((st) => ({
      student_id: st.id,
      subject_id: selectedSubject.id,
      class_name: classLabel || st.class_name || null,
      class_id: st.class_id || null,
      date: selectedDate,
      status: attendanceState[st.id] || "present",
      marked_by: user?.id || null,
    }));

    await localDb.upsertAttendance(records);

    const currentAbsentees = cohortStudents.filter(
      (st) => (attendanceState[st.id] || "present") === "absent",
    );
    const currentPresents = cohortStudents.filter(
      (st) => (attendanceState[st.id] || "present") === "present"
    );

    // Determine target students based on targetMode
    const targetList: Array<{ student: Student; status: "absent" | "present" }> = [];
    if (targetMode === "absent_only" || targetMode === "both") {
      currentAbsentees.forEach((st) => targetList.push({ student: st, status: "absent" }));
    }
    if (targetMode === "present_only" || targetMode === "both") {
      currentPresents.forEach((st) => targetList.push({ student: st, status: "present" }));
    }

    const dispatchedList: Array<{
      student: Student;
      status: "sent" | "failed";
      message: string;
      attendanceStatus: "absent" | "present";
    }> = [];

    const newLogEntries: any[] = [];
    let defaulterEmailCount = 0;

    // Calculate attendance percentage for each targeted student
    const allAttendance = localDb.attendance;

    for (const { student: st, status } of targetList) {
      const past = allAttendance.filter((a) => a.student_id === st.id);
      const totalLectures = past.length;
      const presentLectures = past.filter((a) => a.status === "present").length;
      const rate = totalLectures > 0 ? Math.round((presentLectures / totalLectures) * 100) : 100;
      const isDefaulter = rate < 75 && status === "absent";

      const cleanPhone = (st.parent_mobile || "").replace(/[^0-9]/g, "");
      const hasMobile = cleanPhone.length >= 10;
      const studentEmail = st.email || `${st.roll_number.toLowerCase()}@student.edutrack.edu`;

      // 1. Channel: SMS
      if (channels.includes("sms")) {
        const smsMsg = generateSmsMessage(
          st.full_name,
          selectedDate,
          selectedSubject.name,
          chosenLang,
          status
        );
        newLogEntries.push({
          student_id: st.id,
          subject_id: selectedSubject.id,
          student_name: st.full_name,
          parent_mobile: st.parent_mobile,
          recipient_email: studentEmail,
          channel: "sms" as const,
          message: smsMsg,
          status: hasMobile ? ("sent" as const) : ("failed" as const),
          attendance_date: selectedDate,
          sent_at: new Date().toISOString(),
          language: chosenLang,
          gateway: "SMS Gateway",
          gateway_response: hasMobile ? "Dispatched" : "Invalid parent mobile",
        });

        dispatchedList.push({
          student: st,
          status: hasMobile ? ("sent" as const) : ("failed" as const),
          message: smsMsg,
          attendanceStatus: status,
        });
      }

      // 2. Channel: Email (dispatched if 'email' channel chosen OR automatically if attendance < 75%!)
      if (channels.includes("email") || isDefaulter) {
        if (isDefaulter) defaulterEmailCount++;
        const emailContent = generateEmailAlertContent(
          st.full_name,
          selectedDate,
          selectedSubject.name,
          status,
          rate
        );

        const emailResult = await sendEmailAlert({
          to_email: studentEmail,
          subject: emailContent.subject,
          message: emailContent.body,
          student_name: st.full_name,
          parent_name: st.parent_name || undefined,
          attendance_rate: rate,
          college_name: "SMIT College of Engineering",
        });

        const isLive = !emailResult.isSimulated && emailResult.success;
        newLogEntries.push({
          student_id: st.id,
          subject_id: selectedSubject.id,
          student_name: st.full_name,
          parent_mobile: st.parent_mobile,
          recipient_email: studentEmail,
          channel: "email" as const,
          is_defaulter_alert: isDefaulter,
          attendance_rate: rate,
          email_subject: emailContent.subject,
          message: emailContent.body,
          status: (emailResult.success ? "sent" : "failed") as const,
          attendance_date: selectedDate,
          sent_at: new Date().toISOString(),
          language: chosenLang,
          gateway: isLive ? "EmailJS Live Service" : "Email Notification Service",
          gateway_response: isLive
            ? `Live email delivered via EmailJS to ${studentEmail}`
            : isDefaulter
              ? `Defaulter (<75%) Warning Email sent to ${studentEmail}`
              : `Attendance Email sent to ${studentEmail}`,
        });
      }

      // 3. Channel: WhatsApp
      if (channels.includes("whatsapp")) {
        const waMsg = generateWhatsAppMessage(
          st.full_name,
          selectedDate,
          selectedSubject.name,
          status,
          chosenLang,
          rate
        );

        newLogEntries.push({
          student_id: st.id,
          subject_id: selectedSubject.id,
          student_name: st.full_name,
          parent_mobile: st.parent_mobile,
          channel: "whatsapp" as const,
          is_defaulter_alert: isDefaulter,
          attendance_rate: rate,
          message: waMsg,
          status: hasMobile ? ("sent" as const) : ("failed" as const),
          attendance_date: selectedDate,
          sent_at: new Date().toISOString(),
          language: chosenLang,
          gateway: "WhatsApp Business API",
          gateway_response: hasMobile ? "WhatsApp Message Delivered" : "Invalid Mobile",
        });
      }
    }

    if (newLogEntries.length > 0) {
      await localDb.insert("sms_logs", newLogEntries);
    }

    const currentLang = SMS_LANGUAGES.find((l) => l.id === chosenLang);

    // Record notification for HOD, CC, and Admin
    recordAttendanceSubmittedNotification({
      teacherName: user?.full_name || "Faculty Member",
      teacherId: user?.teacher_id || user?.id || null,
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      subjectCode: selectedSubject.code,
      departmentId: selectedSubject.department_id,
      semester: selectedSubject.semester,
      className: classLabel || undefined,
      date: selectedDate,
      totalStudents: cohortStudents.length,
      presentCount: currentPresents.length,
      absentCount: currentAbsentees.length,
      smsCount: newLogEntries.filter((d) => d.status === "sent").length,
    });

    setSaving(false);
    setConfirmOpen(false);

    setLastDispatched({
      subject: selectedSubject,
      className: classLabel || undefined,
      date: selectedDate,
      totalPresent: currentPresents.length,
      recipients: dispatchedList,
      language: chosenLang,
    });
    setReceiptOpen(true);

    const targetClassText = classLabel ? `for ${classLabel}` : "";
    const channelNames = channels.map((c) => c.toUpperCase()).join(", ");
    const defaulterNoticeText =
      defaulterEmailCount > 0
        ? ` • ⚠️ ${defaulterEmailCount} Defaulter (<75%) Warning Emails dispatched`
        : "";

    setSuccessMsg(
      `Attendance saved ${targetClassText}! Alerts dispatched via [${channelNames}]${defaulterNoticeText}. View in SMS & Alert History anytime.`
    );
    setTimeout(() => setSuccessMsg(""), 12000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">
            Mark Subject Attendance
          </h2>
        </div>
      </div>

      {/* Multi-Class Faculty Workload Context Bar */}
      {myTeachingAssignments.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">
              Assigned Classes & Subjects:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {myTeachingAssignments.slice(0, 4).map((ts) => {
              const sub = localDb.subjects.find((s) => s.id === ts.subject_id);
              const isActive =
                ts.subject_id === selectedSubjectId &&
                (ts.class_name === selectedClassName ||
                  selectedClassName === "all");
              return (
                <button
                  key={ts.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectId(ts.subject_id);
                    if (ts.class_name) setSelectedClassName(ts.class_name);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted text-foreground border-border"
                  }`}
                >
                  {ts.class_name ? `${ts.class_name} · ` : ""}
                  {sub?.code || "Subject"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Attendance Saved & Parent SMS Alerts Dispatched!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {successMsg}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link to="/sms-logs">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                View in Log History
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Primary Selector Toolbar: Year, Subject, Class/Division, Date, Search */}
      <div className="surface-panel space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Engineering Year Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              <span>Academic Year</span>
            </label>
            <Select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              options={[
                { value: "all", label: "All Years (1st - 4th)" },
                ...ENGINEERING_YEARS.map((y) => ({
                  value: String(y.year),
                  label: `${y.name} (${y.shortName})`,
                })),
              ]}
            />
          </div>

          {/* 2. Select Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Select Subject</span>
            </label>
            <Select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              options={filteredSubjects.map((s) => ({
                value: s.id,
                label: `${s.code} · ${s.name} (Sem ${s.semester})`,
              }))}
            />
          </div>

          {/* 3. Target Class / Division */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>Class / Division</span>
              </label>
              {myAssignedClassesForSubject.length > 0 && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {myAssignedClassesForSubject.length} Assigned
                </span>
              )}
            </div>
            <Select
              value={selectedClassName}
              onChange={(e) => setSelectedClassName(e.target.value)}
              options={[
                {
                  value: "all",
                  label:
                    availableClasses.length > 0
                      ? "All Divisions (Whole Batch)"
                      : "All Students in Semester",
                },
                ...availableClasses.map((cn) => {
                  const isAssigned = myAssignedClassesForSubject.includes(cn);
                  return {
                    value: cn,
                    label: isAssigned ? `${cn} (Your Assigned Class)` : cn,
                  };
                }),
              ]}
            />
          </div>

          {/* 4. Attendance Date with day increment buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Attendance Date</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(selectedDate || todayStr);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Previous day"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(selectedDate || todayStr);
                    d.setDate(d.getDate() + 1);
                    const nextStr = d.toISOString().split("T")[0];
                    if (nextStr <= todayStr) {
                      setSelectedDate(nextStr);
                    }
                  }}
                  disabled={selectedDate >= todayStr}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next day"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <DatePicker
              value={selectedDate}
              max={todayStr}
              onChange={(val) => setSelectedDate(val || todayStr)}
            />
          </div>
        </div>

        {/* Division Switcher Pills when multiple classes exist for this subject */}
        {availableClasses.length > 1 && (
          <div className="pt-2 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Quick Switch Division:
              </span>
              <button
                type="button"
                onClick={() => setSelectedClassName("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedClassName === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Divisions ({cohortStudents.length})
              </button>
              {availableClasses.map((cn) => {
                const count = students.filter(
                  (st) =>
                    st.status === "active" &&
                    st.semester === selectedSubject?.semester &&
                    (!attendanceDepartmentId || st.department_id === attendanceDepartmentId) &&
                    (st.class_name === cn ||
                      st.class_id ===
                        academicClasses.find((c) => c.name === cn)?.id ||
                      st.section === cn),
                ).length;
                const isSelected = selectedClassName === cn;
                const isAssigned = myAssignedClassesForSubject.includes(cn);
                return (
                  <button
                    key={cn}
                    type="button"
                    onClick={() => setSelectedClassName(cn)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    <span>{cn}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}
                    >
                      {count}
                    </span>
                    {isAssigned && !isSelected && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        title="Assigned to you"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter Students Search Input */}
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search student roll no / name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Student Attendance Roster Card */}
      <div className="surface-panel space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold">Student Roster</h3>
              <Badge variant="outline" className="text-xs font-semibold">
                {displayedStudents.length} Students
              </Badge>
              {selectedClassName !== "all" && (
                <Badge
                  variant="default"
                  className="text-xs bg-primary/10 text-primary border-primary/20"
                >
                  Division: {selectedClassName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedSubject
                ? `${selectedSubject.code} · ${selectedSubject.name}`
                : "Select a subject"}{" "}
              · Sem {selectedSubject?.semester} · {selectedDate}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAll("present")}
              className="text-xs"
            >
              <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
              All Present
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAll("absent")}
              className="text-xs"
            >
              <X className="mr-1 h-3.5 w-3.5 text-rose-600" />
              All Absent
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={cohortStudents.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs"
            >
              <Send className="mr-1.5 h-4 w-4" />
              <span>Submit Attendance</span>
              {absentees.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                  {absentees.length} Alerts
                </span>
              )}
            </Button>
          </div>
        </div>

        {displayedStudents.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {cohortStudents.length === 0
              ? `No active students found for ${selectedClassName !== "all" ? selectedClassName : "this cohort"}.`
              : "No students matching search filter."}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader className="bg-muted/70 border-b border-border">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold">#</TableHead>
                    <TableHead className="min-w-[110px] font-bold">Roll No</TableHead>
                    <TableHead className="min-w-[210px] font-bold">Student Name</TableHead>
                    <TableHead className="min-w-[100px] font-bold">Class / Div</TableHead>
                    <TableHead className="min-w-[190px] font-bold">Guardian Contact</TableHead>
                    <TableHead className="min-w-[100px] text-center font-bold">Status</TableHead>
                    <TableHead className="min-w-[220px] text-right font-bold pr-4">Attendance Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {displayedStudents.map((st, idx) => {
                    const status = attendanceState[st.id] || "present";
                    const isAbsent = status === "absent";
                    return (
                      <TableRow
                        key={st.id}
                        className={`transition-colors ${
                          isAbsent
                            ? "bg-rose-500/[0.05] hover:bg-rose-500/[0.09]"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {st.roll_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {st.full_name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {st.class_name ? (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold">
                              {st.class_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Sem {st.semester}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground truncate max-w-[160px]">
                              {st.parent_name || "Guardian"}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {st.parent_mobile ? (
                                <span>📱 {st.parent_mobile}</span>
                              ) : (
                                <span className="text-destructive font-semibold">No Mobile</span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isAbsent ? "destructive" : "success"}
                            className="uppercase text-[10px] font-bold px-2 py-0.5 tracking-wider"
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant={!isAbsent ? "default" : "outline"}
                              className={`h-8 text-xs font-semibold ${
                                !isAbsent
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  : "border-border hover:border-emerald-500/50"
                              }`}
                              onClick={() => toggleStudent(st.id, "present")}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Present
                            </Button>
                            <Button
                              size="sm"
                              variant={isAbsent ? "destructive" : "outline"}
                              className={`h-8 text-xs font-semibold ${
                                isAbsent
                                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                                  : "border-border hover:border-rose-500/50"
                              }`}
                              onClick={() => toggleStudent(st.id, "absent")}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Absent
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Verification Modal with Absent and Present Lists & Language SMS Preview */}
      <AttendanceVerificationModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        subject={selectedSubject}
        date={selectedDate}
        eligibleStudents={cohortStudents}
        attendanceState={attendanceState}
        onToggleStudent={toggleStudent}
        onConfirm={handleConfirmSubmission}
        saving={saving}
        smsLanguage={smsLanguage}
        onLanguageChange={setSmsLanguage}
      />

      {/* Post-dispatch confirmation receipt modal */}
      <AttendanceDispatchReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        subject={lastDispatched.subject}
        date={lastDispatched.date}
        totalPresent={lastDispatched.totalPresent}
        absentRecipients={lastDispatched.recipients}
        language={lastDispatched.language}
        onMarkAnother={() => {
          setSearchQuery("");
        }}
      />
    </div>
  );
};
