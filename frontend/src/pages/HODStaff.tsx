import React, { useMemo, useState, useRef } from "react";
import {
  Briefcase,
  Calendar,
  Camera,
  Check,
  Clock,
  Edit3,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Hash,
  KeyRound,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  UserCog,
  Users,
  Layers,
  Filter,
  BookOpen,
  Table as TableIcon,
  Download,
  Mail,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { saveCredential } from "../lib/authUtils";
import {
  Teacher,
  AcademicClass,
  TeacherSubject,
  Subject,
  ClassCoordinatorAssignment,
} from "../lib/types";
import {
  college,
  ACADEMIC_YEARS,
  CURRENT_ACADEMIC_YEAR,
  ENGINEERING_YEARS,
  getEngineeringYearFromSemester,
  getSemesterEngineeringLabel,
  getYearSemesters,
} from "../lib/college";
import {
  cleanMobile,
  isValid10DigitMobile,
  getMobileValidationError,
  sanitizeMobileInput,
  isValidEmail,
} from "../lib/validation";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { TeacherImportModal } from "../components/TeacherImportModal";
import { TeacherProfileModal } from "../components/TeacherProfileModal";
import { TeacherPasswordModal } from "../components/TeacherPasswordModal";

interface HODStaffProps {
  mode: "teachers" | "coordinators";
}

const COMMON_DESIGNATIONS = [
  "Professor & Head of Department",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Senior Lecturer",
  "Lecturer",
  "Visiting Faculty",
  "Lab Instructor",
  "Research Fellow",
];

const COMMON_QUALIFICATIONS = [
  "Ph.D in Computer Science & Engineering",
  "Ph.D in Electronics & Communication",
  "Ph.D in Information Technology",
  "Ph.D in Mathematics / Science",
  "M.Tech / M.E in Computer Science",
  "M.Tech in Cyber Security & Networks",
  "M.Tech in AI & Machine Learning",
  "M.Tech in VLSI & Embedded Systems",
  "M.Sc in Computer Science / IT",
  "MCA (Master of Computer Applications)",
  "B.Tech / B.E in Engineering",
];

export const HODStaff: React.FC<HODStaffProps> = ({ mode }) => {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  const teachers = localDb.teachers;
  const departments = localDb.departments;
  const assignments = localDb.class_coordinator_assignments;
  const academicClasses = (localDb.academic_classes || []) as AcademicClass[];
  const teacherSubjects = (localDb.teacher_subjects || []) as TeacherSubject[];

  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const departmentId =
    user?.department_id || linkedTeacher?.department_id || "dept-1";
  const department = departments.find((item) => item.id === departmentId);

  const departmentClasses = useMemo(
    () =>
      academicClasses.filter(
        (c) => !departmentId || c.department_id === departmentId,
      ),
    [academicClasses, departmentId, version],
  );

  const departmentSubjects = useMemo(
    () =>
      (localDb.subjects || []).filter(
        (s: any) => !departmentId || s.department_id === departmentId,
      ) as Subject[],
    [departmentId, version],
  );

  const [search, setSearch] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "empid" | "role" | "exp">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [profileModalTeacher, setProfileModalTeacher] =
    useState<Teacher | null>(null);
  const [passwordModalTeacher, setPasswordModalTeacher] =
    useState<Teacher | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Multi-class assignment state for Coordinators
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Teaching assignments state for Lecturers: list of { subject_id, class_names: string[] }
  const [teachingAssignments, setTeachingAssignments] = useState<
    Array<{ subject_id: string; class_names: string[] }>
  >([]);
  const [stagedSubjectId, setStagedSubjectId] = useState<string>("");
  const [stagedClassNames, setStagedClassNames] = useState<string[]>([]);

  const [form, setForm] = useState({
    employee_id: "",
    full_name: "",
    designation: "Assistant Professor",
    department_id: departmentId,
    qualification: "",
    experience_years: "",
    email: "",
    mobile: "",
    photo_url: "",
    password: "",
    role: (mode === "coordinators"
      ? "class_coordinator"
      : "lecturer") as Teacher["role"],
    assigned_year: "2",
    assigned_semester: "3",
    teaching_year: "2",
    teaching_semester: "3",
    academic_year: CURRENT_ACADEMIC_YEAR,
  });

  const departmentTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.department_id === departmentId),
    [teachers, departmentId, version],
  );

  const coordinatorIds = useMemo(() => {
    const ids = new Set(
      assignments
        .filter((assignment) => assignment.department_id === departmentId)
        .map((assignment) => assignment.teacher_id),
    );
    for (const c of departmentClasses) {
      if (c.coordinator_teacher_id) ids.add(c.coordinator_teacher_id);
    }
    return ids;
  }, [assignments, departmentClasses, departmentId, version]);

  const visibleTeachers = departmentTeachers.filter((teacher) => {
    if (
      mode === "coordinators" &&
      teacher.role !== "class_coordinator" &&
      !coordinatorIds.has(teacher.id)
    )
      return false;

    // Filter by year / parallel track, taking multi-class assignments into account
    const teacherCcas = assignments.filter((a) => a.teacher_id === teacher.id);
    const teacherCoordinatedClasses = departmentClasses.filter(
      (c) =>
        c.coordinator_teacher_id === teacher.id ||
        teacherCcas.some((a) => a.class_id === c.id),
    );
    const teacherTs = teacherSubjects.filter(
      (ts) => ts.teacher_id === teacher.id,
    );

    const allYears = Array.from(
      new Set(
        [
          teacher.assigned_year,
          teacher.year,
          ...(teacher.assigned_years || []),
          ...teacherCcas.map((a) => a.year).filter(Boolean),
          ...teacherCoordinatedClasses.map(
            (c) => c.year || getEngineeringYearFromSemester(c.semester),
          ),
          ...teacherTs.map((ts) => ts.year).filter(Boolean),
        ].filter(Boolean) as number[],
      ),
    );

    const allSems = Array.from(
      new Set(
        [
          teacher.assigned_semester,
          teacher.semester,
          ...(teacher.assigned_semesters || []),
          ...teacherCcas.map((a) => a.semester).filter(Boolean),
          ...teacherCoordinatedClasses.map((c) => c.semester),
          ...teacherTs.map((ts) => ts.semester).filter(Boolean),
        ].filter(Boolean) as number[],
      ),
    );

    if (selectedYearFilter === "odd") {
      if (allSems.length > 0 && allSems.every((s) => s % 2 === 0)) return false;
    } else if (selectedYearFilter === "even") {
      if (allSems.length > 0 && allSems.every((s) => s % 2 !== 0)) return false;
    } else if (selectedYearFilter !== "all") {
      if (allYears.length > 0 && !allYears.includes(Number(selectedYearFilter)))
        return false;
    }

    const query = search.toLowerCase().trim();
    return (
      !query ||
      teacher.full_name.toLowerCase().includes(query) ||
      teacher.employee_id.toLowerCase().includes(query) ||
      (teacher.email || "").toLowerCase().includes(query) ||
      (teacher.mobile || "").includes(query) ||
      (teacher.designation || "").toLowerCase().includes(query) ||
      (teacher.qualification || "").toLowerCase().includes(query)
    );
  });

  const sortedTeachers = useMemo(() => {
    return [...visibleTeachers].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.full_name.localeCompare(b.full_name);
      } else if (sortBy === "empid") {
        cmp = (a.employee_id || "").localeCompare(b.employee_id || "");
      } else if (sortBy === "role") {
        const roleOrder: Record<string, number> = {
          hod: 0,
          class_coordinator: 1,
          lecturer: 2,
        };
        cmp = (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2);
      } else if (sortBy === "exp") {
        const expA = parseInt(String(a.experience_years || 0)) || 0;
        const expB = parseInt(String(b.experience_years || 0)) || 0;
        cmp = expB - expA;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [visibleTeachers, sortBy, sortOrder]);

  const handleExportCsv = () => {
    const headers = [
      "Employee ID",
      "Full Name",
      "Designation",
      "Role",
      "Qualification",
      "Experience",
      "Email",
      "Mobile",
      "Coordinated Classes",
      "Teaching Subjects",
      "Status",
    ];

    const rows = sortedTeachers.map((t) => {
      const tCcas = assignments.filter((a) => a.teacher_id === t.id);
      const tCoordClasses = departmentClasses
        .filter(
          (c) =>
            c.coordinator_teacher_id === t.id ||
            tCcas.some((a) => a.class_id === c.id || a.class_name === c.name) ||
            (t.assigned_classes || []).includes(c.name),
        )
        .map((c) => `${c.name} (Sem ${c.semester})`)
        .join("; ");

      const tTs = teacherSubjects.filter((ts) => ts.teacher_id === t.id);
      const tSubjects = tTs
        .map((ts) => {
          const sub = departmentSubjects.find((s) => s.id === ts.subject_id);
          return `${sub?.code || "SUB"}${ts.class_name ? ` [${ts.class_name}]` : ""}`;
        })
        .join("; ");

      return [
        `"${(t.employee_id || "").replace(/"/g, '""')}"`,
        `"${(t.full_name || "").replace(/"/g, '""')}"`,
        `"${(t.designation || "Assistant Professor").replace(/"/g, '""')}"`,
        `"${(t.role || "lecturer").replace(/"/g, '""')}"`,
        `"${(t.qualification || "").replace(/"/g, '""')}"`,
        `"${(t.experience_years || "").replace(/"/g, '""')}"`,
        `"${(t.email || "").replace(/"/g, '""')}"`,
        `"${(t.mobile || "").replace(/"/g, '""')}"`,
        `"${tCoordClasses.replace(/"/g, '""')}"`,
        `"${tSubjects.replace(/"/g, '""')}"`,
        `"${(t.status || "active").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${department?.code || "Department"}_Faculty_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openAdd = () => {
    setEditing(null);
    setSelectedClassIds([]);
    setTeachingAssignments([]);
    setStagedSubjectId("");
    setStagedClassNames([]);
    setForm({
      employee_id: "",
      full_name: "",
      designation: "Assistant Professor",
      department_id: departmentId,
      qualification: "",
      experience_years: "",
      email: "",
      mobile: "",
      photo_url: "",
      password: "",
      role: mode === "coordinators" ? "class_coordinator" : "lecturer",
      assigned_year: "2",
      assigned_semester: "3",
      teaching_year: "2",
      teaching_semester: "3",
      academic_year: CURRENT_ACADEMIC_YEAR,
    });
    setFormOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher);
    const yr =
      teacher.assigned_year ||
      teacher.year ||
      (teacher.assigned_semester
        ? getEngineeringYearFromSemester(teacher.assigned_semester)
        : 2);
    const sem =
      teacher.assigned_semester ||
      teacher.semester ||
      (yr === 1 ? 1 : yr === 2 ? 3 : yr === 3 ? 5 : 7);

    // Populate coordinator class assignments
    const teacherCcas = assignments.filter((a) => a.teacher_id === teacher.id);
    const classIdsFromCca = teacherCcas
      .map((a) => a.class_id)
      .filter(Boolean) as string[];
    const classesFromAcademic = departmentClasses
      .filter((c) => c.coordinator_teacher_id === teacher.id)
      .map((c) => c.id);
    const matchedClassNames = departmentClasses
      .filter(
        (c) =>
          (teacher.assigned_classes || []).includes(c.name) ||
          teacherCcas.some((a) => a.class_name === c.name),
      )
      .map((c) => c.id);

    const initialSelectedClasses = Array.from(
      new Set([
        ...classIdsFromCca,
        ...classesFromAcademic,
        ...matchedClassNames,
        ...(teacher.assigned_class_ids || []),
      ]),
    );
    setSelectedClassIds(initialSelectedClasses);

    // Populate teaching assignments grouped by subject
    const teacherTs = teacherSubjects.filter(
      (ts) => ts.teacher_id === teacher.id,
    );
    const groupedTeaching: Record<string, string[]> = {};
    for (const ts of teacherTs) {
      if (!groupedTeaching[ts.subject_id]) groupedTeaching[ts.subject_id] = [];
      if (
        ts.class_name &&
        !groupedTeaching[ts.subject_id].includes(ts.class_name)
      ) {
        groupedTeaching[ts.subject_id].push(ts.class_name);
      }
    }
    const stagedList = Object.entries(groupedTeaching).map(([sId, cNames]) => ({
      subject_id: sId,
      class_names: cNames,
    }));
    setTeachingAssignments(stagedList);
    setStagedSubjectId("");
    setStagedClassNames([]);

    setForm({
      employee_id: teacher.employee_id,
      full_name: teacher.full_name,
      designation: teacher.designation || "Assistant Professor",
      department_id: teacher.department_id || departmentId,
      qualification: teacher.qualification || "",
      experience_years: teacher.experience_years
        ? String(teacher.experience_years)
        : "",
      email: teacher.email || "",
      mobile: teacher.mobile || "",
      photo_url: teacher.photo_url || "",
      password: "",
      role: teacher.role,
      assigned_year: String(yr),
      assigned_semester: String(sem),
      teaching_year: String(yr),
      teaching_semester: String(sem),
      academic_year: teacher.academic_year || CURRENT_ACADEMIC_YEAR,
    });
    setFormOpen(true);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, photo_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    // STRICT VALIDATION: Full Name, College Employee ID, and Email Address are mandatory!
    if (!form.employee_id.trim() || !form.full_name.trim() || !form.email.trim()) {
      alert("Validation Error: Teacher Full Name (*), College Employee ID Ref No (*), and Email Address (*) are strictly required.");
      return;
    }

    if (!isValidEmail(form.email.trim())) {
      alert(`Invalid Email Address: "${form.email.trim()}". Please enter a valid email format (e.g. teacher@college.edu).`);
      return;
    }

    if (form.mobile && form.mobile.trim()) {
      const mobErr = getMobileValidationError(
        form.mobile,
        "Faculty Mobile",
        false,
      );
      if (mobErr) {
        alert(mobErr);
        return;
      }
    }

    const isCoordinator = form.role === "class_coordinator";
    const selectedYear = isCoordinator
      ? Number(form.assigned_year) || 2
      : Number(form.teaching_year) || null;
    const selectedSem = isCoordinator
      ? Number(form.assigned_semester) ||
        (selectedYear === 1
          ? 1
          : selectedYear === 2
            ? 3
            : selectedYear === 3
              ? 5
              : 7)
      : Number(form.teaching_semester) || null;

    const selectedClasses = departmentClasses.filter((c) =>
      selectedClassIds.includes(c.id),
    );
    const assignedYears = Array.from(
      new Set(
        selectedClasses.length > 0
          ? selectedClasses.map(
              (c) => c.year || getEngineeringYearFromSemester(c.semester),
            )
          : [selectedYear || 2],
      ),
    );
    const assignedSemesters = Array.from(
      new Set(
        selectedClasses.length > 0
          ? selectedClasses.map((c) => c.semester)
          : [selectedSem || 3],
      ),
    );
    const assignedClassNames = selectedClasses.map((c) => c.name);
    const assignedClassIds = selectedClasses.map((c) => c.id);

    const data = {
      employee_id: form.employee_id.trim(),
      full_name: form.full_name.trim(),
      designation: form.designation.trim() || "Assistant Professor",
      department_id: departmentId || "dept-1",
      qualification: form.qualification.trim() || null,
      date_of_birth: null, // DOB not required
      experience_years: form.experience_years.trim() || null,
      email: form.email.trim() || null,
      mobile: cleanMobile(form.mobile) || null, // Standardized 10-digit mobile
      photo_url: form.photo_url.trim() || null,
      role: form.role,
      is_class_coordinator: isCoordinator,
      year: assignedYears[0] || selectedYear,
      assigned_year: assignedYears[0] || selectedYear,
      assigned_semester: assignedSemesters[0] || selectedSem,
      assigned_years: assignedYears,
      assigned_semesters: assignedSemesters,
      assigned_classes: assignedClassNames,
      assigned_class_ids: assignedClassIds,
      academic_year: form.academic_year,
      status: "active" as const,
    };

    const userRole = isCoordinator ? "class_coordinator" : "teacher";
    const defaultPwd = isCoordinator ? "CC@123" : "Teacher@123";
    const effectivePwd =
      form.password.trim() || form.employee_id.trim() || defaultPwd;

    let targetTeacherId = editing?.id;

    if (editing) {
      await localDb.update("teachers", editing.id, data);
      const account = localDb.users.find(
        (u: any) => u.teacher_id === editing.id,
      );
      if (account) {
        await localDb.update("users", account.id, {
          full_name: data.full_name,
          email: data.email || account.email,
          role: userRole,
          department_id: departmentId,
          employee_id: data.employee_id,
        });
      } else if (data.email || data.employee_id) {
        const accountId = `teacher-user-${editing.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: data.full_name,
            email:
              data.email ||
              `${data.employee_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@college.edu`,
            role: userRole,
            department_id: departmentId,
            teacher_id: editing.id,
            employee_id: data.employee_id,
            status: "active",
          },
        ]);
        await localDb.update("teachers", editing.id, { user_id: accountId });
      }

      if (form.password.trim() || !account) {
        await localDb.update("teachers", editing.id, { password: effectivePwd });
        saveCredential(
          [
            editing.id,
            account?.id,
            `teacher-user-${editing.id}`,
            data.email,
            data.employee_id,
          ],
          effectivePwd,
        );
      }
      setAlertSuccess(`Updated profile for ${data.full_name}.`);
    } else {
      const inserted = await localDb.insert("teachers", [data]);
      const teacher = inserted[0];
      if (teacher) {
        targetTeacherId = teacher.id;
        await localDb.update("teachers", teacher.id, {
          password: effectivePwd,
        });
        const accountId = `teacher-user-${teacher.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: teacher.full_name,
            email:
              teacher.email ||
              `${teacher.employee_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@college.edu`,
            role: userRole,
            department_id: departmentId,
            teacher_id: teacher.id,
            employee_id: teacher.employee_id,
            status: "active",
          },
        ]);
        await localDb.update("teachers", teacher.id, { user_id: accountId });
        await localDb.update("teachers", teacher.id, {
          password: teacher.password || effectivePwd,
        });

        saveCredential(
          [accountId, teacher.id, teacher.email, teacher.employee_id],
          effectivePwd,
        );
      }
      setAlertSuccess(`Added teacher ${data.full_name} successfully.`);
    }

    // Sync coordinator assignments across multiple classes and semesters
    if (targetTeacherId) {
      const existingAssignments = localDb.class_coordinator_assignments.filter(
        (a: any) => a.teacher_id === targetTeacherId,
      );
      for (const a of existingAssignments) {
        await localDb.delete("class_coordinator_assignments", a.id);
      }

      if (isCoordinator) {
        if (selectedClasses.length > 0) {
          for (const cls of selectedClasses) {
            const cYear =
              cls.year || getEngineeringYearFromSemester(cls.semester);
            await localDb.insert("class_coordinator_assignments", [
              {
                teacher_id: targetTeacherId,
                department_id: departmentId,
                year: cYear,
                semester: cls.semester,
                class_id: cls.id,
                class_name: cls.name,
                assigned_by: user?.id,
              },
            ]);
          }
        } else if (selectedYear && selectedSem) {
          await localDb.insert("class_coordinator_assignments", [
            {
              teacher_id: targetTeacherId,
              department_id: departmentId,
              year: selectedYear,
              semester: selectedSem,
              assigned_by: user?.id,
            },
          ]);
        }

        // Sync academic_classes coordinator_teacher_id
        for (const cls of departmentClasses) {
          if (selectedClassIds.includes(cls.id)) {
            if (cls.coordinator_teacher_id !== targetTeacherId) {
              await localDb.update("academic_classes", cls.id, {
                coordinator_teacher_id: targetTeacherId,
              });
            }
          } else if (cls.coordinator_teacher_id === targetTeacherId) {
            await localDb.update("academic_classes", cls.id, {
              coordinator_teacher_id: null,
            });
          }
        }
      } else {
        // Not a coordinator, clear any classes coordinated by this teacher
        for (const cls of departmentClasses) {
          if (cls.coordinator_teacher_id === targetTeacherId) {
            await localDb.update("academic_classes", cls.id, {
              coordinator_teacher_id: null,
            });
          }
        }
      }

      // Sync teaching assignments (teacher_subjects) across multiple classes and subjects concurrently
      if (
        teachingAssignments.length > 0 ||
        (editing && form.role === "lecturer")
      ) {
        const existingTs = localDb.teacher_subjects.filter(
          (ts: any) => ts.teacher_id === targetTeacherId,
        );
        for (const ts of existingTs) {
          await localDb.delete("teacher_subjects", ts.id);
        }

        for (const ta of teachingAssignments) {
          const sub = departmentSubjects.find((s) => s.id === ta.subject_id);
          const subYear =
            sub?.year || (sub?.semester ? Math.ceil(sub.semester / 2) : 1);
          const subSem = sub?.semester || 1;

          if (ta.class_names.length === 0) {
            await localDb.insert("teacher_subjects", [
              {
                teacher_id: targetTeacherId,
                subject_id: ta.subject_id,
                class_name: null,
                class_id: null,
                year: subYear,
                semester: subSem,
              },
            ]);
          } else {
            for (const cName of ta.class_names) {
              const matchedClass = departmentClasses.find(
                (c) => c.name.toLowerCase() === cName.toLowerCase(),
              );
              await localDb.insert("teacher_subjects", [
                {
                  teacher_id: targetTeacherId,
                  subject_id: ta.subject_id,
                  class_name: cName,
                  class_id: matchedClass?.id || null,
                  year: subYear,
                  semester: subSem,
                },
              ]);
            }
          }
        }
      }
    }

    window.dispatchEvent(new CustomEvent("edutrack_data_updated"));

    setFormOpen(false);
    setVersion((v) => v + 1);
  };

  const remove = async (teacher: Teacher) => {
    if (!confirm(`Delete ${teacher.full_name}? This action cannot be undone.`))
      return;
    await localDb.delete("teachers", teacher.id);
    setVersion((v) => v + 1);
  };

  const handleImportSuccess = (count: number) => {
    setAlertSuccess(
      `Successfully imported ${count} teachers from spreadsheet!`,
    );
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-6">
      {/* Modals */}
      <TeacherImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        department={department}
        onImportComplete={handleImportSuccess}
      />

      <TeacherProfileModal
        teacher={profileModalTeacher}
        department={department}
        open={!!profileModalTeacher}
        onOpenChange={(open) => {
          if (!open) setProfileModalTeacher(null);
        }}
        onEdit={(t) => {
          setProfileModalTeacher(null);
          openEdit(t);
        }}
        onUpdated={() => setVersion((v) => v + 1)}
      />

      <TeacherPasswordModal
        teacher={passwordModalTeacher}
        open={!!passwordModalTeacher}
        onOpenChange={(open) => {
          if (!open) setPasswordModalTeacher(null);
        }}
        onSuccess={(msg) => {
          setAlertSuccess(msg);
          setVersion((v) => v + 1);
        }}
      />

      {/* Success Notification Banner */}
      {alertSuccess && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>{alertSuccess}</span>
          </div>
          <button
            onClick={() => setAlertSuccess(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Add and Import Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            HOD Portal · {department?.code || "Department"}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold">
            {mode === "teachers" ? "Department Teachers" : "Class Coordinators"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            Import (Excel / CSV)
          </Button>

          <Button onClick={openAdd} className="shadow-xs">
            <Plus className="mr-2 h-4 w-4" /> Add{" "}
            {mode === "teachers" ? "Teacher" : "Coordinator"}
          </Button>
        </div>
      </div>

      {/* Add / Edit Form Card */}
      {formOpen && (
        <Card className="border-primary/30 bg-primary/[0.02] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="font-display text-lg font-bold">
                {editing
                  ? "Edit Teacher Profile"
                  : `Add ${mode === "teachers" ? "Teacher" : "Class Coordinator"}`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Strict Validation: Only <strong className="text-foreground">Teacher Full Name (*)</strong>,{" "}
                <strong className="text-foreground">Employee ID (*)</strong>, and{" "}
                <strong className="text-foreground">Email Address (*)</strong> are strictly mandatory. Other fields (designation, qualification, experience, phone) are completely optional and can be left blank.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Full Name - STRICTLY MANDATORY */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Teacher Full Name</span>
                <span className="text-destructive font-bold text-sm">*</span>
                <span className="text-[10px] text-destructive font-normal">(Required)</span>
              </label>
              <Input
                placeholder="e.g. Dr. Arthur Pendelton (*)"
                value={form.full_name}
                onChange={(event) =>
                  setForm({ ...form, full_name: event.target.value })
                }
                className={!form.full_name.trim() ? "border-primary/50" : ""}
              />
            </div>

            {/* 2. College Employee ID Reference No - STRICTLY MANDATORY */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>College Employee ID Ref No</span>
                <span className="text-destructive font-bold text-sm">*</span>
                <span className="text-[10px] text-destructive font-normal">(Required)</span>
              </label>
              <Input
                placeholder="e.g. EMP-CSE-101 (*)"
                className="font-mono"
                value={form.employee_id}
                onChange={(event) =>
                  setForm({ ...form, employee_id: event.target.value })
                }
              />
            </div>

            {/* 3. Academic Designation - OPTIONAL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Academic Designation</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <div className="space-y-1.5">
                <Input
                  placeholder="e.g. Assistant Professor (Optional)"
                  value={form.designation}
                  onChange={(event) =>
                    setForm({ ...form, designation: event.target.value })
                  }
                />
                <div className="flex flex-wrap gap-1">
                  {COMMON_DESIGNATIONS.slice(1, 6).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setForm({ ...form, designation: item })}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Qualification - OPTIONAL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Highest Qualification</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="e.g. Ph.D, M.Tech (Optional)"
                value={form.qualification}
                onChange={(event) =>
                  setForm({ ...form, qualification: event.target.value })
                }
              />
            </div>

            {/* 5. Year of Experience - OPTIONAL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Year of Experience</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="e.g. 8 Years (Optional)"
                value={form.experience_years}
                onChange={(event) =>
                  setForm({ ...form, experience_years: event.target.value })
                }
              />
            </div>

            {/* 6. Phone / Mobile - OPTIONAL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Phone / Mobile</span>
                {form.mobile ? (
                  <span
                    className={`text-[10px] font-mono ${
                      form.mobile.length === 10
                        ? "text-emerald-600 font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {form.mobile.length}/10 digits
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Optional)
                  </span>
                )}
              </label>
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="9876543210 (Optional)"
                value={form.mobile}
                onChange={(event) =>
                  setForm({
                    ...form,
                    mobile: sanitizeMobileInput(event.target.value),
                  })
                }
                className={`font-mono ${
                  form.mobile && !isValid10DigitMobile(form.mobile)
                    ? "border-destructive focus-visible:ring-destructive bg-destructive/5"
                    : ""
                }`}
              />
              <p className="text-[10px] text-muted-foreground">
                Optional: strictly 10 digits only if provided (e.g. 9876543210).
              </p>
            </div>

            {/* 7. Email - STRICTLY MANDATORY */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Email Address</span>
                <span className="text-destructive font-bold text-sm">*</span>
                <span className="text-[10px] text-destructive font-normal">(Required)</span>
              </label>
              <Input
                type="email"
                placeholder="e.g. teacher@college.edu (*)"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                className={!form.email.trim() ? "border-primary/50" : ""}
              />
            </div>

            {/* 9. Role Assignment */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                System Role
              </label>
              <Select
                value={form.role}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value as Teacher["role"],
                  })
                }
                options={[
                  { value: "lecturer", label: "Lecturer / Faculty" },
                  { value: "class_coordinator", label: "Class Coordinator" },
                ]}
              />
            </div>

            {/* Engineering Academic Year & Semester Assignment */}
            {form.role === "class_coordinator" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Academic Session
                </label>
                <Select
                  value={form.academic_year}
                  onChange={(event) =>
                    setForm({ ...form, academic_year: event.target.value })
                  }
                  options={ACADEMIC_YEARS.map((year) => ({
                    value: year,
                    label: year,
                  }))}
                />
              </div>
            )}

            {form.role === "class_coordinator" && (
              <div className="sm:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                    <Layers className="h-4 w-4" />
                    <span>
                      Class Coordinator (CC) Multi-Class & Multi-Semester
                      Assignment
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] w-fit font-bold"
                  >
                    Multi-Class Concurrent
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select one or more classes/divisions for this coordinator. A
                  single coordinator can now be assigned to multiple
                  combinations of Year, Semester, and Division concurrently.
                </p>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">
                    Quick Select:
                  </span>
                  {ENGINEERING_YEARS.map((y) => (
                    <Button
                      key={y.year}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2"
                      onClick={() => {
                        const yearClassIds = departmentClasses
                          .filter(
                            (c) =>
                              (c.year ||
                                getEngineeringYearFromSemester(c.semester)) ===
                              y.year,
                          )
                          .map((c) => c.id);
                        setSelectedClassIds((prev) =>
                          Array.from(new Set([...prev, ...yearClassIds])),
                        );
                      }}
                    >
                      All {y.shortName} ({y.name.split(" ")[0]})
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    onClick={() =>
                      setSelectedClassIds(departmentClasses.map((c) => c.id))
                    }
                  >
                    Select All Classes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setSelectedClassIds([])}
                  >
                    Clear All
                  </Button>
                </div>

                {/* Class Multi-Select Checkbox Grid */}
                {departmentClasses.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 pt-1">
                    {departmentClasses.map((cls) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      const clsYear =
                        cls.year ||
                        getEngineeringYearFromSemester(cls.semester);
                      const isOtherCoordinator =
                        cls.coordinator_teacher_id &&
                        cls.coordinator_teacher_id !== editing?.id;
                      const otherTeacher = isOtherCoordinator
                        ? teachers.find(
                            (t) => t.id === cls.coordinator_teacher_id,
                          )
                        : null;

                      return (
                        <label
                          key={cls.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500 text-foreground shadow-xs ring-1 ring-emerald-500/20"
                              : "bg-background hover:bg-muted/50 border-border text-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassIds((prev) => [
                                  ...prev,
                                  cls.id,
                                ]);
                              } else {
                                setSelectedClassIds((prev) =>
                                  prev.filter((id) => id !== cls.id),
                                );
                              }
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-foreground"
                                }`}
                              >
                                {cls.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 font-mono"
                              >
                                Year {clsYear} · Sem {cls.semester}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {getSemesterEngineeringLabel(cls.semester)}
                              {otherTeacher
                                ? ` • Current: ${otherTeacher.full_name}`
                                : ""}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No classes found for this department yet. You can specify
                    the general cohort below.
                  </p>
                )}

                {/* Cohort Fallback Selector */}
                <div className="pt-2 border-t border-emerald-500/20 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Primary Engineering Year (1–4)
                    </label>
                    <Select
                      value={form.assigned_year}
                      onChange={(e) => {
                        const y = Number(e.target.value) || 1;
                        const defaultSem =
                          y === 1 ? "1" : y === 2 ? "3" : y === 3 ? "5" : "7";
                        setForm({
                          ...form,
                          assigned_year: e.target.value,
                          assigned_semester: defaultSem,
                        });
                      }}
                      options={ENGINEERING_YEARS.map((y) => ({
                        value: String(y.year),
                        label: `${y.shortName} · ${y.name}`,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Primary Assigned Semester
                    </label>
                    <Select
                      value={form.assigned_semester}
                      onChange={(e) =>
                        setForm({ ...form, assigned_semester: e.target.value })
                      }
                      options={(
                        ENGINEERING_YEARS.find(
                          (y) => y.year === Number(form.assigned_year),
                        )?.semesters || [1, 2]
                      ).map((sem) => ({
                        value: String(sem),
                        label: `Semester ${sem} (${getSemesterEngineeringLabel(sem)})`,
                      }))}
                    />
                  </div>
                </div>

                {selectedClassIds.length > 0 && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold">
                      Active multi-class mapping ({selectedClassIds.length}{" "}
                      classes):{" "}
                    </span>
                    {departmentClasses
                      .filter((c) => selectedClassIds.includes(c.id))
                      .map((c) => c.name)
                      .join(", ")}
                  </div>
                )}
              </div>
            )}

            {form.role === "lecturer" && (
              <div className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>
                      Faculty Teaching Assignment (Multiple Subjects & Classes
                      Concurrently)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] w-fit">
                    Multi-Class Teaching
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Map this faculty member to multiple subjects and class
                  divisions concurrently (e.g. SY CSE-A and SY CSE-B for Data
                  Structures, TY CSE-A for DBMS).
                </p>

                {/* Existing Staged Teaching Assignments */}
                {teachingAssignments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-semibold text-foreground">
                      Assigned Subjects & Divisions (
                      {teachingAssignments.length}):
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {teachingAssignments.map((ta, idx) => {
                        const sub = departmentSubjects.find(
                          (s) => s.id === ta.subject_id,
                        );
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-border bg-background flex items-center justify-between gap-2 shadow-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-foreground">
                                  {sub?.code || "SUB"}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {sub?.name || "Subject"}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-[9px]">
                                  Sem {sub?.semester || 1}
                                </Badge>
                                {ta.class_names.length === 0 ? (
                                  <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">
                                    All Divisions
                                  </Badge>
                                ) : (
                                  ta.class_names.map((cName) => (
                                    <Badge
                                      key={cName}
                                      className="text-[9px] bg-primary/10 text-primary border-primary/20 font-medium"
                                    >
                                      {cName}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setTeachingAssignments((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add New Teaching Assignment Tool */}
                <div className="pt-2 border-t border-border/60 space-y-2.5">
                  <p className="text-xs font-semibold text-foreground">
                    + Map to Subject & Multiple Classes:
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                        Select Subject
                      </label>
                      <Select
                        value={stagedSubjectId}
                        onChange={(e) => {
                          const newSubId = e.target.value;
                          setStagedSubjectId(newSubId);
                          const sub = departmentSubjects.find(
                            (s) => s.id === newSubId,
                          );
                          if (sub) {
                            const matchingClassNames = departmentClasses
                              .filter((c) => c.semester === sub.semester)
                              .map((c) => c.name);
                            setStagedClassNames(matchingClassNames);
                          }
                        }}
                        options={[
                          { value: "", label: "-- Choose Subject --" },
                          ...departmentSubjects.map((s) => ({
                            value: s.id,
                            label: `${s.code} · ${s.name} (Sem ${s.semester})`,
                          })),
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                        Select Multiple Classes / Divisions:
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border bg-background min-h-[38px]">
                        {departmentClasses.map((c) => {
                          const isChecked = stagedClassNames.includes(c.name);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] cursor-pointer border transition-colors ${
                                isChecked
                                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                                  : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setStagedClassNames((prev) => [
                                      ...prev,
                                      c.name,
                                    ]);
                                  } else {
                                    setStagedClassNames((prev) =>
                                      prev.filter((name) => name !== c.name),
                                    );
                                  }
                                }}
                              />
                              <span>{c.name}</span>
                            </label>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setStagedClassNames([])}
                          className="text-[10px] text-muted-foreground hover:underline ml-auto"
                        >
                          All Divisions
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!stagedSubjectId}
                      onClick={() => {
                        if (!stagedSubjectId) return;
                        setTeachingAssignments((prev) => [
                          ...prev.filter(
                            (ta) => ta.subject_id !== stagedSubjectId,
                          ),
                          {
                            subject_id: stagedSubjectId,
                            class_names: stagedClassNames,
                          },
                        ]);
                        setStagedSubjectId("");
                        setStagedClassNames([]);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Subject Mapping
                    </Button>
                  </div>
                </div>

                {/* Fallback Primary Year / Sem Selector */}
                <div className="pt-2 border-t border-border/60 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Primary Teaching Year (1–4)
                    </label>
                    <Select
                      value={form.teaching_year}
                      onChange={(e) => {
                        const y = Number(e.target.value) || 1;
                        const defaultSem =
                          y === 1 ? "1" : y === 2 ? "3" : y === 3 ? "5" : "7";
                        setForm({
                          ...form,
                          teaching_year: e.target.value,
                          teaching_semester: defaultSem,
                        });
                      }}
                      options={ENGINEERING_YEARS.map((y) => ({
                        value: String(y.year),
                        label: `${y.shortName} · ${y.name}`,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Primary Teaching Semester
                    </label>
                    <Select
                      value={form.teaching_semester}
                      onChange={(e) =>
                        setForm({ ...form, teaching_semester: e.target.value })
                      }
                      options={(
                        ENGINEERING_YEARS.find(
                          (y) => y.year === Number(form.teaching_year),
                        )?.semesters || [1, 2]
                      ).map((sem) => ({
                        value: String(sem),
                        label: `Semester ${sem} (${getSemesterEngineeringLabel(sem)})`,
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 10. Photo URL or File Upload */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Profile Photo (Optional / Manual Set)</span>
                {form.photo_url && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, photo_url: "" }))
                    }
                    className="text-[11px] text-destructive hover:underline"
                  >
                    Clear Photo
                  </button>
                )}
              </label>
              <div className="flex items-center gap-3">
                {form.photo_url ? (
                  <div className="h-10 w-10 rounded-lg border border-border overflow-hidden shrink-0">
                    <img
                      src={form.photo_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                    <Camera className="h-4 w-4" />
                  </div>
                )}
                <Input
                  placeholder="Paste photo image URL, or click upload button"
                  value={form.photo_url}
                  onChange={(e) =>
                    setForm({ ...form, photo_url: e.target.value })
                  }
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoFileInputRef.current?.click()}
                  className="shrink-0 text-xs"
                >
                  <Camera className="h-3.5 w-3.5 mr-1" />
                  Browse
                </Button>
                <input
                  ref={photoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />
              </div>
            </div>

            {/* 11. Password */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-foreground">
                Login Password
              </label>
              <Input
                type="password"
                placeholder={
                  editing
                    ? "Leave blank to keep current"
                    : form.role === "class_coordinator"
                      ? "Default: CC@123 or Emp ID"
                      : "Default: Teacher@123 or Emp ID"
                }
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Staff sign in using Employee ID or Email.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              <Check className="mr-2 h-4 w-4" /> Save Teacher
            </Button>
          </div>
        </Card>
      )}

      {/* Teacher List Card */}
      <Card className="p-5 shadow-xs">
        {/* Controls: Search, View Mode Toggle, Sorting, Export, and Track Filters */}
        <div className="space-y-3.5 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 pr-8"
                placeholder={`Search by name, ID, mobile, designation, qualification...`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort and Export Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1">
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 text-xs w-[130px]"
                  options={[
                    { value: "name", label: "Sort: Name" },
                    { value: "empid", label: "Sort: Emp ID" },
                    { value: "role", label: "Sort: Role" },
                    { value: "exp", label: "Sort: Experience" },
                  ]}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-xs"
                  title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
                  onClick={() =>
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Export to CSV Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-9 text-xs gap-1.5 border-border hover:border-primary/50"
                title="Download staff roster as CSV file"
              >
                <Download className="h-3.5 w-3.5 text-primary" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Track Filter & Roster Summary Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60">
            {/* 4-Year Engineering & Parallel Track Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Track:
              </span>
              <button
                onClick={() => setSelectedYearFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedYearFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All Years (1–4)
              </button>
              <button
                onClick={() => setSelectedYearFilter("odd")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedYearFilter === "odd"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Odd Track (1, 3, 5, 7)
              </button>
              <button
                onClick={() => setSelectedYearFilter("even")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedYearFilter === "even"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Even Track (2, 4, 6, 8)
              </button>
              {ENGINEERING_YEARS.map((y) => (
                <button
                  key={y.year}
                  onClick={() => setSelectedYearFilter(String(y.year))}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectedYearFilter === String(y.year)
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {y.shortName}
                </button>
              ))}
            </div>

            {/* Roster Counts Summary */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                Showing {sortedTeachers.length} of {departmentTeachers.length} Faculty
              </span>
              <span>•</span>
              <span>
                {departmentTeachers.filter((t) => t.role === "hod").length} HOD
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {
                  departmentTeachers.filter(
                    (t) =>
                      t.role === "class_coordinator" ||
                      coordinatorIds.has(t.id) ||
                      t.is_class_coordinator,
                  ).length
                }{" "}
                Coordinators
              </span>
              <span>•</span>
              <span>
                {
                  departmentTeachers.filter(
                    (t) =>
                      t.role !== "hod" &&
                      t.role !== "class_coordinator" &&
                      !coordinatorIds.has(t.id) &&
                      !t.is_class_coordinator,
                  ).length
                }{" "}
                Lecturers
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABULAR FORM VIEW (PERMANENT) */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader className="bg-muted/70 border-b border-border">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold">#</TableHead>
                    <TableHead className="min-w-[210px] font-bold">Faculty Member</TableHead>
                    <TableHead className="min-w-[110px] font-bold">College ID</TableHead>
                    <TableHead className="min-w-[130px] font-bold">Academic Role</TableHead>
                    <TableHead className="min-w-[170px] font-bold">Coordinated Classes</TableHead>
                    <TableHead className="min-w-[190px] font-bold">Teaching Subjects</TableHead>
                    <TableHead className="min-w-[150px] font-bold">Qualification & Exp</TableHead>
                    <TableHead className="min-w-[150px] font-bold">Contact Details</TableHead>
                    <TableHead className="min-w-[110px] font-bold">Portal Access</TableHead>
                    <TableHead className="min-w-[120px] text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {sortedTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="py-14 text-center text-muted-foreground"
                      >
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                            <Users className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            No {mode} found matching query
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Add staff manually or use the Excel / CSV import to load
                            multiple faculty teachers at once.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setImportModalOpen(true)}
                            >
                              <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600" />
                              Import Excel / CSV
                            </Button>
                            <Button size="sm" onClick={openAdd}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Teacher Manually
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTeachers.map((teacher, idx) => {
                      const teacherCcas = assignments.filter(
                        (a) => a.teacher_id === teacher.id,
                      );
                      const teacherCoordinatedClasses = departmentClasses.filter(
                        (c) =>
                          c.coordinator_teacher_id === teacher.id ||
                          teacherCcas.some(
                            (a) =>
                              a.class_id === c.id || a.class_name === c.name,
                          ) ||
                          (teacher.assigned_classes || []).includes(c.name),
                      );
                      const isCC =
                        teacher.role === "class_coordinator" ||
                        teacher.is_class_coordinator ||
                        teacherCoordinatedClasses.length > 0 ||
                        teacherCcas.length > 0;

                      const teacherTs = teacherSubjects.filter(
                        (ts) => ts.teacher_id === teacher.id,
                      );
                      const groupedTs: Record<string, string[]> = {};
                      for (const ts of teacherTs) {
                        if (!groupedTs[ts.subject_id])
                          groupedTs[ts.subject_id] = [];
                        if (
                          ts.class_name &&
                          !groupedTs[ts.subject_id].includes(ts.class_name)
                        ) {
                          groupedTs[ts.subject_id].push(ts.class_name);
                        }
                      }

                      return (
                        <TableRow
                          key={teacher.id}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          {/* 1. Index # */}
                          <TableCell className="text-center font-mono text-xs text-muted-foreground font-semibold">
                            {idx + 1}
                          </TableCell>

                          {/* 2. Faculty Name + Designation + Avatar */}
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-primary/10 text-primary flex items-center justify-center overflow-hidden font-bold font-display shadow-2xs">
                                {teacher.photo_url ? (
                                  <img
                                    src={teacher.photo_url}
                                    alt={teacher.full_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs">
                                    {teacher.full_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setProfileModalTeacher(teacher)}
                                  className="font-bold text-sm text-foreground hover:text-primary transition-colors text-left block truncate max-w-[190px]"
                                  title="View faculty dossier"
                                >
                                  {teacher.full_name}
                                </button>
                                <span className="text-[11px] text-muted-foreground block truncate max-w-[190px]">
                                  {teacher.designation || "Assistant Professor"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* 3. College Employee ID */}
                          <TableCell>
                            <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded border border-border text-foreground">
                              {teacher.employee_id}
                            </span>
                          </TableCell>

                          {/* 4. Academic Role */}
                          <TableCell>
                            {teacher.role === "hod" ? (
                              <Badge className="bg-primary text-primary-foreground font-semibold text-[11px]">
                                HOD & Lecturer
                              </Badge>
                            ) : isCC ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]">
                                Class Coordinator
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="font-medium text-[11px]">
                                Lecturer
                              </Badge>
                            )}
                          </TableCell>

                          {/* 5. Coordinated Classes */}
                          <TableCell>
                            {isCC ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {teacherCoordinatedClasses.length > 0 ? (
                                  teacherCoordinatedClasses.map((c) => (
                                    <Badge
                                      key={c.id}
                                      variant="outline"
                                      className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                    >
                                      {c.name} (Sem {c.semester})
                                    </Badge>
                                  ))
                                ) : teacherCcas.length > 0 ? (
                                  teacherCcas.map((a, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                    >
                                      {a.class_name || `Sem ${a.semester}`}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  >
                                    Sem {teacher.assigned_semester || 3}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">—</span>
                            )}
                          </TableCell>

                          {/* 6. Teaching Subjects */}
                          <TableCell>
                            {teacherTs.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[210px]">
                                {Object.entries(groupedTs).map(([sId, cNames]) => {
                                  const sub = departmentSubjects.find(
                                    (s) => s.id === sId,
                                  );
                                  return (
                                    <Badge
                                      key={sId}
                                      variant="outline"
                                      className="text-[10px] font-mono bg-muted/60 text-foreground border-border/80"
                                      title={sub?.name || ""}
                                    >
                                      {sub?.code || "SUB"}
                                      {cNames.length > 0
                                        ? ` (${cNames.join(", ")})`
                                        : ""}
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono text-muted-foreground bg-muted/30"
                              >
                                Year {teacher.assigned_year || 2} · Sem{" "}
                                {teacher.assigned_semester || 3}
                              </Badge>
                            )}
                          </TableCell>

                          {/* 7. Qualification & Experience */}
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              <span
                                className="font-medium text-foreground block truncate max-w-[160px]"
                                title={teacher.qualification || ""}
                              >
                                {teacher.qualification || "B.Tech / M.Tech"}
                              </span>
                              {teacher.experience_years && (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {String(teacher.experience_years).includes("Year")
                                    ? teacher.experience_years
                                    : `${teacher.experience_years} Yrs Exp`}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 8. Contact Details */}
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              {teacher.mobile ? (
                                <a
                                  href={`tel:${teacher.mobile}`}
                                  className="flex items-center gap-1.5 font-mono text-[11px] text-foreground hover:text-primary transition-colors"
                                >
                                  <Phone className="h-3 w-3 text-primary shrink-0" />
                                  <span>{teacher.mobile}</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/60 italic">
                                  No phone
                                </span>
                              )}
                              {teacher.email && (
                                <span
                                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate max-w-[150px]"
                                  title={teacher.email}
                                >
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{teacher.email}</span>
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 9. Portal Login */}
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPasswordModalTeacher(teacher)}
                              className="h-7 text-[11px] font-medium gap-1 px-2 border-border/80 hover:border-primary/50 text-foreground hover:text-primary"
                              title="Set or reset portal login password"
                            >
                              <KeyRound className="h-3 w-3 text-primary" />
                              <span>Password</span>
                            </Button>
                          </TableCell>

                          {/* 10. Actions */}
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProfileModalTeacher(teacher)}
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title="View faculty dossier"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(teacher)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Edit teacher"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(teacher)}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title="Delete teacher"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    );
  };
