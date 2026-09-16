import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Subject } from "../lib/types";
import { localDb } from "../lib/supabase";
import { college } from "../lib/college";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/ui/badge";

export const Subjects: React.FC = () => {
  const { user, role } = useAuth();
  const [departments, setDepartments] = useState(localDb.departments);
  const [teachers, setTeachers] = useState(localDb.teachers);
  const [teacherSubjects, setTeacherSubjects] = useState(localDb.teacher_subjects);

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
    <CrudPage<Subject>
      title="Subjects"
      description={
        role === "class_coordinator"
          ? "Create subjects and assign teaching faculty (imported by HOD) for your class curriculum and lecture attendance."
          : "Curriculum courses mapped to academic departments, semester cohorts, and assigned teachers."
      }
      table="subjects"
      searchKeys={["code", "name"]}
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
            const mappedTeachers = assignments
              .map((a) => teachers.find((t) => t.id === a.teacher_id))
              .filter(Boolean);

            if (mappedTeachers.length > 0) {
              return (
                <div className="flex flex-wrap gap-1">
                  {mappedTeachers.map((t: any) => (
                    <Badge
                      key={t.id}
                      variant="secondary"
                      className="text-[11px] font-medium"
                    >
                      {t.full_name} ({t.employee_id})
                    </Badge>
                  ))}
                </div>
              );
            }

            if (directTeacher) {
              return (
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {directTeacher.full_name} ({directTeacher.employee_id})
                </Badge>
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
  );
};
