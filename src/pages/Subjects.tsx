import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Subject } from "../lib/types";
import { localDb } from "../lib/supabase";
import { college } from "../lib/college";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { BookOpen, Sparkles } from "lucide-react";
import { SyllabusImportModal } from "../components/SyllabusImportModal";

export const Subjects: React.FC = () => {
  const { user, role } = useAuth();
  const [departments, setDepartments] = useState(localDb.departments);
  const [teachers, setTeachers] = useState(localDb.teachers);
  const [teacherSubjects, setTeacherSubjects] = useState(localDb.teacher_subjects);
  const [syllabusModalOpen, setSyllabusModalOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setDepartments([...localDb.departments]);
      setTeachers([...localDb.teachers]);
      setTeacherSubjects([...localDb.teacher_subjects]);
    };
    window.addEventListener("edutrack_data_updated", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_data_updated", handleUpdate);
    };
  }, []);

  const coordinatorTeacher = teachers.find(
    (t) =>
      t.id === user?.teacher_id ||
      (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.employee_id && t.employee_id === user.employee_id),
  );
  const coordinatorDeptId = user?.department_id || coordinatorTeacher?.department_id;
  const coordinatorSem = coordinatorTeacher?.assigned_semester || 5;

  const relevantTeachers =
    role === "class_coordinator" && coordinatorDeptId
      ? teachers.filter((t) => !t.department_id || t.department_id === coordinatorDeptId)
      : teachers;

  return (
    <>
      <CrudPage<Subject>
        title="Subjects & Curriculum"
        description={
          role === "class_coordinator"
            ? "Manage subjects and assign teaching faculty for your class curriculum and lecture attendance."
            : "Curriculum courses mapped to academic departments, engineering years (FE, SE, TE, BE), semester cohorts, and assigned teachers."
        }
        table="subjects"
        searchKeys={["code", "name"]}
        extraHeaderActions={
          <Button
            size="sm"
            variant="outline"
            className="border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold shadow-xs"
            onClick={() => setSyllabusModalOpen(true)}
          >
            <Sparkles className="mr-1.5 h-4 w-4 text-amber-500" />
            Import Syllabus (PDF / Scheme)
          </Button>
        }
      fields={[
        { key: "code", label: "Subject Code (e.g. CS501)", required: true },
        { key: "name", label: "Subject Name", required: true },
        {
          key: "department_id",
          label: "Department",
          type: "select",
          defaultValue: coordinatorDeptId || "",
          options: [
            { value: "", label: "Unassigned" },
            ...departments.map((d) => ({ value: d.id, label: d.name })),
          ],
        },
        {
          key: "semester",
          label: "Semester",
          type: "select",
          required: true,
          defaultValue: role === "class_coordinator" ? String(coordinatorSem) : "1",
          options: college.semesters.map((s) => ({
            value: String(s),
            label: `Semester ${s}`,
          })),
        },
        {
          key: "credits",
          label: "Course Credits",
          type: "number",
          defaultValue: "3",
        },
        {
          key: "teacher_id",
          label: "Assigned Faculty (Imported by HOD / Department)",
          type: "select",
          helperText: "Select faculty member imported or created by HOD to conduct lectures and take attendance.",
          options: [
            { value: "", label: "Unassigned (Assign later)" },
            ...relevantTeachers.map((t) => ({
              value: t.id,
              label: `${t.full_name} (${t.employee_id} • ${t.designation || (t.role === "hod" ? "HOD & Lecturer" : "Faculty")})`,
            })),
          ],
        },
      ]}
      columns={[
        {
          header: "Code",
          render: (s) => (
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
              {s.code}
            </span>
          ),
        },
        {
          header: "Subject Name",
          render: (s) => <span className="font-semibold text-foreground">{s.name}</span>,
        },
        {
          header: "Department",
          render: (s) =>
            departments.find((d) => d.id === s.department_id)?.name || "—",
        },
        {
          header: "Sem",
          render: (s) => (
            <Badge variant="outline" className="text-[11px]">
              Sem {s.semester}
            </Badge>
          ),
        },
        { header: "Credits", render: (s) => s.credits },
        {
          header: "Assigned Faculty (HOD Imported)",
          render: (s) => {
            const assignments = teacherSubjects.filter(
              (a) => a.subject_id === s.id,
            );
            const directTeacher = teachers.find(
              (t) => t.id === (s as any).teacher_id,
            );

            // Group assignments by unique teacher ID and collect class names
            const teacherMap = new Map<
              string,
              { teacher: (typeof teachers)[0]; classes: string[] }
            >();

            for (const a of assignments) {
              const t = teachers.find((teach) => teach.id === a.teacher_id);
              if (t) {
                const existing = teacherMap.get(t.id);
                if (existing) {
                  if (a.class_name && !existing.classes.includes(a.class_name)) {
                    existing.classes.push(a.class_name);
                  }
                } else {
                  teacherMap.set(t.id, {
                    teacher: t,
                    classes: a.class_name ? [a.class_name] : [],
                  });
                }
              }
            }

            if (directTeacher && !teacherMap.has(directTeacher.id)) {
              teacherMap.set(directTeacher.id, {
                teacher: directTeacher,
                classes: [],
              });
            }

            const teacherEntries = Array.from(teacherMap.values());

            if (teacherEntries.length > 0) {
              return (
                <div className="flex flex-wrap gap-1">
                  {teacherEntries.map(({ teacher: t, classes }) => (
                    <Badge
                      key={t.id}
                      variant="secondary"
                      className="text-[11px] font-medium"
                    >
                      {t.full_name} ({t.employee_id})
                      {classes.length > 0 ? ` [${classes.join(", ")}]` : ""}
                    </Badge>
                  ))}
                </div>
              );
            }

            return (
              <span className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Unassigned
              </span>
            );
          },
        },
      ]}
    />
    <SyllabusImportModal
      open={syllabusModalOpen}
      onOpenChange={setSyllabusModalOpen}
      defaultDepartmentId={coordinatorDeptId}
    />
  </>
);
};
